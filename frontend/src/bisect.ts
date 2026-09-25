/** Общие принципы: адаптивный подбор следующего вопроса методом бисекции —
 * 6-8 адаптивных вопросов дают ту же точность, что 25 фиксированных. */

export interface BisectRange {
  lo: number;
  hi: number;
}

/** Середина интервала: геометрическая (для логарифмической шкалы) или обычная */
export function bisectMid(range: BisectRange, log = false): number {
  return log ? Math.sqrt(range.lo * range.hi) : (range.lo + range.hi) / 2;
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
