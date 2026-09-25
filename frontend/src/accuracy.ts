import type { GameResult } from "./types";

/** Общие принципы: индикатор точности — "примерно" после 1 прохождения,
 * "точнее" после 2+ (результаты усредняются). */
export interface Averaged {
  value: number;
  attempts: number;
}

export function averageMetric(results: GameResult[], testId: string, metric: string): Averaged | null {
  const values = results
    .filter((r) => r.testId === testId && typeof r.metrics[metric] === "number")
    .map((r) => r.metrics[metric]);
  if (values.length === 0) return null;
  const value = values.reduce((s, v) => s + v, 0) / values.length;
  return { value, attempts: values.length };
}

export function accuracyLabel(attempts: number): string {
  return attempts >= 2 ? "точнее" : "примерно";
}
