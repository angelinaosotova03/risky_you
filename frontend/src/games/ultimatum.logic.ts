// Чистый расчёт "Ультиматума" — без UI.
export const POT = 10;
export const MAO_LO = 1;
export const MAO_HI = 5;

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface UltimatumRound {
  offer: number;
  accepted: boolean;
}

export interface UltimatumMetrics {
  fairnessThreshold: number;
  totalEarned: number;
  acceptedCount: number;
  totalRounds: number;
  proposerOffer: number;
  forgaveMachine: number;
  looksRandom: number;
}

/** Следующее предложение бисекции: старт 3; принял → ниже, отказал → выше */
export function nextOffer(range: { lo: number; hi: number }): number {
  return Math.round((range.lo + range.hi) / 2);
}

/**
 * MAO = середина между наибольшим отвергнутым и наименьшим принятым (по исходному ТЗ).
 * Если одной из сторон нет (принял всё / отверг всё), берётся виртуальная граница
 * MAO_LO−1 / MAO_HI+1, чтобы результат симметрично уходил за пределы диапазона.
 */
export function computeUltimatumResult(
  rounds: UltimatumRound[],
  computerRound: UltimatumRound | null,
  proposerOffer: number,
  bank: number,
): UltimatumMetrics {
  const accepted = rounds.filter((r) => r.accepted);
  const rejected = rounds.filter((r) => !r.accepted);
  const maxRejected = rejected.length ? Math.max(...rejected.map((r) => r.offer)) : MAO_LO - 1;
  const minAccepted = accepted.length ? Math.min(...accepted.map((r) => r.offer)) : MAO_HI + 1;
  const mao = (maxRejected + minAccepted) / 2;
  const fairnessThreshold = round1((mao / POT) * 100);

  // Противоречие: принял офер меньше, чем сам же отверг где-то ещё — то есть
  // minAccepted оказался НИЖЕ maxRejected. В нормальной монотонной бисекции
  // такого не бывает, только при непоследовательных (случайных) ответах.
  const looksRandom = accepted.length && rejected.length && minAccepted < maxRejected ? 1 : 0;

  return {
    fairnessThreshold,
    totalEarned: bank,
    acceptedCount: accepted.length,
    totalRounds: rounds.length,
    proposerOffer,
    forgaveMachine: computerRound && computerRound.accepted && mao > computerRound.offer ? 1 : 0,
    looksRandom,
  };
}
