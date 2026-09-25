// Чистый расчёт "Шарика", без UI — чтобы можно было протестировать ботами и на
// эталонных случаях из QA. mount() в balloon.ts вызывает эту же функцию.
export const BALLOONS = 10;
export const MAX_PUMPS = 64;
// Из исходного ТЗ: "Каждый качок добавляет 1 монету во временный банк" — было
// ошибочно реализовано как REWARD=100 (как будто рубли), из-за чего банк был в 100 раз
// больше ожидаемого в эталонных случаях (E1: банк должен быть 200, не 20000)
export const REWARD = 1;
export const SAFE_FIRST = 2;
export const SAFE_MIN_PUMP = 8;

export interface BalloonRound {
  pumps: number;
  exploded: boolean;
}

export interface BalloonMetrics {
  adjustedPumps: number;
  totalEarned: number;
  explosions: number;
  totalPumps: number;
  looksRandom: number;
  lowAccuracy: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Генерирует точки взрыва для BALLOONS шариков — первые SAFE_FIRST не лопаются раньше SAFE_MIN_PUMP */
export function generateExplosionPoints(random: () => number = Math.random): number[] {
  return Array.from({ length: BALLOONS }, (_, i) => {
    const point = 1 + Math.floor(random() * MAX_PUMPS);
    return i < SAFE_FIRST ? Math.max(point, SAFE_MIN_PUMP) : point;
  });
}

/**
 * rounds — по одному на шарик, в порядке игры: {pumps, exploded}.
 * B1: если лопнули все — среднее считается по всем (не 0), с пометкой lowAccuracy.
 * B2 (дополнение к ТЗ): если во всех раундах 0 качков — флаг looksRandom.
 */
export function computeBalloonResult(rounds: BalloonRound[]): BalloonMetrics {
  const kept = rounds.filter((r) => !r.exploded);
  const lowAccuracy = kept.length === 0 && rounds.length > 0 ? 1 : 0;
  const adjustedPumps = rounds.length === 0 ? 0 : round1(avg((kept.length ? kept : rounds).map((r) => r.pumps)));
  const looksRandom = rounds.length > 0 && rounds.every((r) => r.pumps === 0) ? 1 : 0;

  return {
    adjustedPumps,
    totalEarned: kept.reduce((s, r) => s + r.pumps, 0) * REWARD,
    explosions: rounds.length - kept.length,
    totalPumps: rounds.reduce((s, r) => s + r.pumps, 0),
    looksRandom,
    lowAccuracy,
  };
}
