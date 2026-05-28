export function softmax(values: number[]): number[] {
  if (!values.length) return [];
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  if (sum === 0) return values.map(() => 1 / values.length);
  return exps.map((e) => e / sum);
}
