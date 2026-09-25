// Чистый расчёт "Четырёх колод" — без UI.
export const DRAWS = 40;
export const DECK_SIZE = 10;
export const STARTING_BANK = 2000;

export type DeckId = "A" | "B" | "C" | "D";
export const DECKS: DeckId[] = ["A", "B", "C", "D"];
export const GOOD_DECKS: DeckId[] = ["C", "D"];

// Каждый массив — 10 исходов одной колоды (награда уже с учётом штрафа), сумма = чистый результат за 10 карт
export const BASE: Record<DeckId, number[]> = {
  A: [100, 100, 100, 100, 100, -50, -100, -150, -200, -250], // 5 карт, штрафы в сумме −1250: итог −250
  B: [100, 100, 100, 100, 100, 100, 100, 100, 100, -1150], // 1 карта, штраф −1250: итог −250
  C: [50, 50, 50, 50, 50, 0, 0, 0, 0, 0], // 5 карт, штрафы в сумме −250: итог +250
  D: [50, 50, 50, 50, 50, 50, 50, 50, 50, -200], // 1 карта, штраф −250: итог +250
};

export interface Draw {
  deck: DeckId;
  amount: number;
}

export interface DecksMetrics {
  // Ось "Обучаемость на опыте" по таблице ТЗ = доля выгодных колод в последних
  // 20 картах (при DRAWS=40 это ровно вторая половина), абсолютная доля, не дельта
  goodShareRecent: number;
  // Дополнительно: на сколько выросла доля от первой половины ко второй — для
  // текста результата и для проверки "бот учится" в симуляциях
  learningShift: number;
  totalEarned: number;
  goodPicks: number;
  totalDraws: number;
}

export function shuffled<T>(arr: T[], random: () => number = Math.random): T[] {
  return arr.slice().sort(() => random() - 0.5);
}

/** Считает итоговые метрики по истории тяг — чистая функция, bank — итоговая копилка */
export function computeDecksResult(history: Draw[], bank: number): DecksMetrics {
  const half = Math.floor(DRAWS / 2);
  const isGood = (d: Draw) => GOOD_DECKS.includes(d.deck);
  const firstHalf = history.slice(0, half);
  const secondHalf = history.slice(half);
  const share = (draws: Draw[]) => (draws.length ? draws.filter(isGood).length / draws.length : 0);

  const firstShare = share(firstHalf);
  const secondShare = share(secondHalf);

  return {
    goodShareRecent: Math.round(secondShare * 100),
    learningShift: Math.round((secondShare - firstShare) * 100),
    totalEarned: bank - STARTING_BANK,
    goodPicks: history.filter(isGood).length,
    totalDraws: history.length,
  };
}
