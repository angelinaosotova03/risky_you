import { bisectMid, roundTo } from "../bisect";

// Чистый расчёт "Сейчас или потом" — без UI.
export const ROUNDS = 5;
export const X_MIN = 50;
export const X_MAX = 1000;
export const LATER_AMOUNT = 1000;
export const DELAY_DAYS = 30;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export interface PatienceOutcome {
  x: number;
  choseNow: boolean;
}

export interface PatienceMetrics {
  k: number;
  v: number;
  nowCount: number;
  totalRounds: number;
  realWaitResult: number;
  realWaited: number;
}

/** Прогоняет бисекцию X, спрашивая decide(x) на каждом шаге — тот же алгоритм, что в patience.ts */
export function runPatienceBisection(decide: (x: number) => boolean): PatienceOutcome[] {
  let range = { lo: X_MIN, hi: X_MAX };
  const outcomes: PatienceOutcome[] = [];

  for (let i = 0; i < ROUNDS; i++) {
    const x = roundTo(bisectMid(range), 10);
    const choseNow = decide(x);
    outcomes.push({ x, choseNow });
    // Выбрал "сейчас" при X → V ≤ X (сузили верх); выбрал "потом" → V > X (сузили низ)
    range = choseNow ? { ...range, hi: x } : { ...range, lo: x };
  }
  return outcomes;
}

/** Считает итоговые метрики по записанной последовательности — чистая функция */
export function computePatienceResult(outcomes: PatienceOutcome[], realWaitResult: number): PatienceMetrics {
  let range = { lo: X_MIN, hi: X_MAX };
  for (const o of outcomes) {
    range = o.choseNow ? { ...range, hi: o.x } : { ...range, lo: o.x };
  }

  const v = round1(bisectMid(range));
  const k = round3((LATER_AMOUNT / v - 1) / DELAY_DAYS);
  const now = outcomes.filter((o) => o.choseNow);

  return {
    k,
    v,
    nowCount: now.length,
    totalRounds: ROUNDS,
    realWaitResult,
    realWaited: realWaitResult >= 15 ? 1 : 0,
  };
}
