import { bisectMid } from "../bisect";

// Чистый расчёт "Ставки 50 на 50" — без UI, чтобы прогнать ботами и эталонными случаями.
export const ROUNDS = 6;
export const R_MIN = 0.8;
export const R_MAX = 5;
export const CONTROL_R = 6;
export const L_OPTIONS = [50, 200, 500];

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface LossOutcome {
  r: number;
  accepted: boolean;
  control: boolean;
}

export interface LossMetrics {
  lambda: number;
  totalEarned: number;
  acceptedCount: number;
  totalRounds: number;
  looksRandom: number;
}

/**
 * Прогоняет бисекцию, спрашивая decide(r, control) на каждом шаге —
 * ровно тот же алгоритм, что использует mount() в loss.ts.
 */
export function runLossBisection(decide: (r: number, control: boolean) => boolean): LossOutcome[] {
  let range = { lo: R_MIN, hi: R_MAX };
  const outcomes: LossOutcome[] = [];

  for (let i = 0; i < ROUNDS; i++) {
    const r = bisectMid(range, true);
    const accepted = decide(r, false);
    outcomes.push({ r, accepted, control: false });
    // Принял → λ ≤ r (сужаем верх), отказал → λ > r (сужаем низ)
    range = accepted ? { ...range, hi: r } : { ...range, lo: r };
  }

  const controlAccepted = decide(CONTROL_R, true);
  outcomes.push({ r: CONTROL_R, accepted: controlAccepted, control: true });
  return outcomes;
}

/** Считает итоговые метрики по записанной последовательности исходов — чистая функция. */
export function computeLossResult(outcomes: LossOutcome[], bank = 0): LossMetrics {
  let range = { lo: R_MIN, hi: R_MAX };
  for (const o of outcomes) {
    if (o.control) continue;
    range = o.accepted ? { ...range, hi: o.r } : { ...range, lo: o.r };
  }

  const lambda = round1(bisectMid(range, true));
  const control = outcomes.find((o) => o.control);
  const looksRandom = control && !control.accepted ? 1 : 0;
  const acceptedCount = outcomes.filter((o) => o.accepted && !o.control).length;

  return { lambda, totalEarned: bank, acceptedCount, totalRounds: ROUNDS, looksRandom };
}
