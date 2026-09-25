// Чистый расчёт "Двух третей" (p-beauty contest) — без UI и без сети.
export const MIN_GUESS = 0;
export const MAX_GUESS = 100;
export const START_GUESS = 50;
export const TARGET_FRACTION = 2 / 3;
export const COLD_START_MIN_SAMPLE = 50;
export const REASONING_CAP = 4;
// Классический результат Нагель (1995): среднее по испытуемым около 33, победное
// число — 2/3 от него ≈ 22. Используется как ориентир, пока своих данных мало.
export const RESEARCH_TARGET = 22;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BeautyMetrics {
  guess: number;
  reasoningLevel: number;
  guess2?: number;
  average?: number;
  target?: number;
  distance?: number;
  s?: number;
  fromResearch?: number; // 1 — target взят из литературы (RESEARCH_TARGET), а не из живого среднего
}

/**
 * Уровень рассуждения k, где guess ≈ 50 × (2/3)^k (k=0 — наивный ответ 50, дальше —
 * шаги рассуждения о рациональности остальных). Ограничен сверху REASONING_CAP,
 * guess=0 обрабатывается отдельно, чтобы не считать log(0).
 */
export function computeReasoningLevel(guess: number): number {
  if (guess <= 0) return REASONING_CAP;
  const level = Math.log(guess / START_GUESS) / Math.log(TARGET_FRACTION);
  return round2(Math.min(REASONING_CAP, Math.max(0, level)));
}

/** S — близость ответа к победному числу: 1 при точном совпадении, тем меньше, чем дальше. */
export function computeS(guess: number, target: number): number {
  if (guess <= 0 || target <= 0) return guess === target ? 1 : 0;
  return round2(Math.min(guess, target) / Math.max(guess, target));
}

export function computeBeautyResult(
  guess: number,
  guess2: number | null,
  average: number | null,
  target: number | null,
): BeautyMetrics {
  const metrics: BeautyMetrics = { guess, reasoningLevel: computeReasoningLevel(guess) };
  if (guess2 !== null) metrics.guess2 = guess2;
  if (target != null) {
    if (average != null) metrics.average = round1(average);
    else metrics.fromResearch = 1;
    metrics.target = round1(target);
    metrics.distance = round1(Math.abs(guess - target));
    metrics.s = computeS(guess, target);
  }
  return metrics;
}
