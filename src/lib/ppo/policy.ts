/**
 * Local PPO policy inference — no external API, no ONNX runtime.
 *
 * The exported ONNX graph (`ppo_policy_100k.onnx`) is a Stable-Baselines3
 * `ActorCriticPolicy` with an MLP extractor whose only operators are Gemm and
 * Tanh, so the forward pass is reproduced here in plain TypeScript:
 *
 *   latent_pi = tanh(W2 · tanh(W0 · obs + b0) + b2)
 *   mean      = action_net · latent_pi + action_bias
 *   value     = value_net · tanh(V2 · tanh(V0 · obs + b0) + b2) + bias
 *
 * The ONNX `output_action` tensor samples from the Gaussian
 * `N(mean, exp(log_std))`, which makes every call non-deterministic. Inference
 * here defaults to the distribution mean so dashboard curves are reproducible;
 * pass `{ deterministic: false }` to reproduce the sampled behaviour of the old
 * FastAPI service.
 */

import {
  PPO_MODEL_SHA256,
  PPO_TENSOR_LAYOUT,
  PPO_WEIGHTS_BASE64,
  PPO_WEIGHTS_FLOAT_COUNT,
  type PpoTensorName,
} from "@/lib/ppo/ppo-weights";
import { softmax } from "@/lib/softmax";

export const PPO_OBSERVATION_DIM = 11;
export const PPO_ACTION_DIM = 5;

export interface PolicyOutput {
  /** Action-net output (Gaussian mean, or a sample when deterministic=false). */
  raw_action: number[];
  /** Softmax of `raw_action` — portfolio weights summing to 1. */
  allocations: number[];
  /** Critic estimate of the state value. */
  value: number;
  deterministic: boolean;
}

export interface PolicyOptions {
  /** Default true — return the distribution mean instead of a sample. */
  deterministic?: boolean;
  /** Gaussian source for sampling. Defaults to a Box–Muller transform of Math.random. */
  randomNormal?: () => number;
}

function decodeBase64(input: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(input, "base64"));
  }
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let weightBlob: Float32Array | null = null;

function getWeights(): Float32Array {
  if (weightBlob) return weightBlob;

  const bytes = decodeBase64(PPO_WEIGHTS_BASE64);
  // Copy into a fresh buffer: Buffer.from() may hand back a pooled, unaligned
  // view, and Float32Array requires a 4-byte-aligned offset.
  const aligned = new Uint8Array(bytes.byteLength);
  aligned.set(bytes);
  const floats = new Float32Array(aligned.buffer);
  if (floats.length !== PPO_WEIGHTS_FLOAT_COUNT) {
    throw new Error(
      `PPO weight blob corrupt: expected ${PPO_WEIGHTS_FLOAT_COUNT} floats, decoded ${floats.length}.`,
    );
  }
  weightBlob = floats;
  return floats;
}

function tensor(name: PpoTensorName): Float32Array {
  const spec = PPO_TENSOR_LAYOUT[name];
  return getWeights().subarray(spec.offset, spec.offset + spec.count);
}

/**
 * ONNX `Gemm` with `transB=1`: `out[o] = sum_i input[i] * weight[o][i] + bias[o]`,
 * where `weight` is stored row-major with shape [outDim, inDim].
 */
function linear(
  input: Float64Array,
  weight: Float32Array,
  bias: Float32Array,
  outDim: number,
): Float64Array {
  const inDim = input.length;
  const out = new Float64Array(outDim);
  for (let o = 0; o < outDim; o++) {
    const rowStart = o * inDim;
    let sum = bias[o];
    for (let i = 0; i < inDim; i++) {
      sum += input[i] * weight[rowStart + i];
    }
    // The reference graph runs in float32; round at layer boundaries so
    // results track ONNX Runtime instead of drifting in float64.
    out[o] = Math.fround(sum);
  }
  return out;
}

function tanhInPlace(values: Float64Array): Float64Array {
  for (let i = 0; i < values.length; i++) {
    values[i] = Math.fround(Math.tanh(values[i]));
  }
  return values;
}

function standardNormal(): number {
  // Box–Muller; u must be non-zero for the log.
  let u = 0;
  while (u === 0) u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function toFloat32Input(observation: readonly number[]): Float64Array {
  const input = new Float64Array(PPO_OBSERVATION_DIM);
  for (let i = 0; i < PPO_OBSERVATION_DIM; i++) {
    input[i] = Math.fround(observation[i]);
  }
  return input;
}

export function isValidObservation(observation: readonly number[]): boolean {
  return (
    observation.length === PPO_OBSERVATION_DIM &&
    observation.every((v) => Number.isFinite(v))
  );
}

/**
 * Run the PPO policy on one observation
 * `[cash, shares × 5, prices × 5]` (the training env's observation space).
 */
export function runPolicy(
  observation: readonly number[],
  options: PolicyOptions = {},
): PolicyOutput {
  if (observation.length !== PPO_OBSERVATION_DIM) {
    throw new Error(
      `Observation must have length ${PPO_OBSERVATION_DIM}, received ${observation.length}.`,
    );
  }
  if (!observation.every((v) => Number.isFinite(v))) {
    throw new Error("Observation contains non-finite values.");
  }

  const deterministic = options.deterministic ?? true;
  const input = toFloat32Input(observation);

  const piHidden1 = tanhInPlace(
    linear(
      input,
      tensor("mlp_extractor.policy_net.0.weight"),
      tensor("mlp_extractor.policy_net.0.bias"),
      64,
    ),
  );
  const piHidden2 = tanhInPlace(
    linear(
      piHidden1,
      tensor("mlp_extractor.policy_net.2.weight"),
      tensor("mlp_extractor.policy_net.2.bias"),
      64,
    ),
  );
  const mean = linear(
    piHidden2,
    tensor("action_net.weight"),
    tensor("action_net.bias"),
    PPO_ACTION_DIM,
  );

  const vHidden1 = tanhInPlace(
    linear(
      input,
      tensor("mlp_extractor.value_net.0.weight"),
      tensor("mlp_extractor.value_net.0.bias"),
      64,
    ),
  );
  const vHidden2 = tanhInPlace(
    linear(
      vHidden1,
      tensor("mlp_extractor.value_net.2.weight"),
      tensor("mlp_extractor.value_net.2.bias"),
      64,
    ),
  );
  const value = linear(vHidden2, tensor("value_net.weight"), tensor("value_net.bias"), 1);

  const raw_action = Array.from(mean);

  if (!deterministic) {
    const logStd = tensor("log_std");
    const sample = options.randomNormal ?? standardNormal;
    for (let i = 0; i < raw_action.length; i++) {
      raw_action[i] += Math.exp(logStd[i]) * sample();
    }
  }

  return {
    raw_action,
    allocations: softmax(raw_action),
    value: value[0],
    deterministic,
  };
}

/** Standard deviation per action dimension, `exp(log_std)`. */
export function policyStdDev(): number[] {
  return Array.from(tensor("log_std"), (v) => Math.exp(v));
}

export const PPO_MODEL_INFO = {
  algorithm: "PPO (Stable-Baselines3)",
  runtime: "In-process TypeScript MLP (exported from ONNX)",
  checkpoint: "ppo_policy_100k",
  sha256: PPO_MODEL_SHA256,
  observationDim: PPO_OBSERVATION_DIM,
  actionDim: PPO_ACTION_DIM,
  hiddenLayers: [64, 64] as const,
  activation: "tanh",
  parameterCount: PPO_WEIGHTS_FLOAT_COUNT,
} as const;
