import { format as d3Format } from "d3-format";

const currencyFormatter = d3Format("$,.2f");
const compactCurrencyFormatter = d3Format("$,.2s");
const percentFormatter = d3Format("+.2%");
const percentPlainFormatter = d3Format(".2%");
const numberFormatter = d3Format(",.2f");

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return currencyFormatter(value);
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return compactCurrencyFormatter(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return percentFormatter(value);
}

export function formatPercentPlain(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return percentPlainFormatter(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter(value);
}

export function formatAllocation(weight: number | null | undefined): string {
  if (weight === null || weight === undefined || Number.isNaN(weight)) return "—";
  return percentPlainFormatter(weight);
}

export function computeReturn(series: number[]): number {
  if (series.length < 2) return 0;
  const start = series[0];
  const end = series[series.length - 1];
  if (!start) return 0;
  return (end - start) / start;
}

export function computeAlpha(agentReturn: number, benchmarkReturn: number): number {
  return agentReturn - benchmarkReturn;
}

export function concentrationScore(allocations: number[]): number {
  if (!allocations.length) return 0;
  const max = Math.max(...allocations);
  const sumSquares = allocations.reduce((s, w) => s + w * w, 0);
  return Math.max(max, sumSquares);
}
