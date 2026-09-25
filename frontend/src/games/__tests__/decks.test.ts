import { describe, expect, it } from "vitest";
import { BASE, DRAWS, STARTING_BANK, computeDecksResult, type Draw } from "../decks.logic";

function drawsFrom(deck: "A" | "B" | "C" | "D", count: number): Draw[] {
  return Array.from({ length: count }, (_, i) => ({ deck, amount: BASE[deck][i % BASE[deck].length] }));
}

describe("Четыре колоды — эталонные случаи", () => {
  it("E12: 40 карт только из C — банк 3000, доля выгодных колод 100%", () => {
    const history = drawsFrom("C", DRAWS);
    const bank = STARTING_BANK + history.reduce((s, d) => s + d.amount, 0);
    const m = computeDecksResult(history, bank);
    expect(bank).toBe(3000);
    expect(m.goodShareRecent).toBe(100);
  });

  it("E13: 40 карт только из A — банк 1000, доля выгодных колод 0%", () => {
    const history = drawsFrom("A", DRAWS);
    const bank = STARTING_BANK + history.reduce((s, d) => s + d.amount, 0);
    const m = computeDecksResult(history, bank);
    expect(bank).toBe(1000);
    expect(m.goodShareRecent).toBe(0);
  });

  it("E14: сумма любого блока из 10 карт одной колоды — ровно ±250", () => {
    expect(BASE.A.reduce((s, x) => s + x, 0)).toBe(-250);
    expect(BASE.B.reduce((s, x) => s + x, 0)).toBe(-250);
    expect(BASE.C.reduce((s, x) => s + x, 0)).toBe(250);
    expect(BASE.D.reduce((s, x) => s + x, 0)).toBe(250);
  });
});

describe("Четыре колоды — устойчивость", () => {
  it("не выдаёт NaN на пустой истории", () => {
    const m = computeDecksResult([], STARTING_BANK);
    expect(Number.isFinite(m.goodShareRecent)).toBe(true);
    expect(Number.isFinite(m.learningShift)).toBe(true);
  });
});
