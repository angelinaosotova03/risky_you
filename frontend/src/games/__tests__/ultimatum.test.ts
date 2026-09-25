import { describe, expect, it } from "vitest";
import { computeUltimatumResult, nextOffer, type UltimatumRound } from "../ultimatum.logic";

/** Прогоняет 3 раунда бисекции против бота, принимающего offer >= threshold */
function simulate(threshold: number): UltimatumRound[] {
  const rounds: UltimatumRound[] = [];
  let range = { lo: 1, hi: 5 };
  for (let i = 0; i < 3; i++) {
    const offer = nextOffer(range);
    const accepted = offer >= threshold;
    rounds.push({ offer, accepted });
    range = accepted ? { ...range, hi: offer } : { ...range, lo: offer };
  }
  return rounds;
}

describe("Ультиматум — эталонные случаи", () => {
  it("E17: бот принимает от 3 и выше — MAO = 2.5 (середина между отверг 2 и принял 3)", () => {
    const rounds = simulate(3);
    const m = computeUltimatumResult(rounds, null, 0, 0);
    expect(m.fairnessThreshold).toBeCloseTo(25, 5);
  });

  it("E19: бот отвергает всё — MAO = 5.5", () => {
    const rounds = simulate(6); // порог выше диапазона — никогда не принимает
    const m = computeUltimatumResult(rounds, null, 0, 0);
    expect(m.fairnessThreshold).toBeCloseTo(55, 5);
  });
});

describe("Ультиматум — граничные случаи", () => {
  it("B7: противоречие (принял 2, отверг 4) — MAO = 3, флаг looksRandom", () => {
    const rounds: UltimatumRound[] = [
      { offer: 2, accepted: true },
      { offer: 4, accepted: false },
    ];
    const m = computeUltimatumResult(rounds, null, 0, 0);
    expect(m.fairnessThreshold).toBeCloseTo(30, 5);
    expect(m.looksRandom).toBe(1);
  });

  it("без противоречий looksRandom = 0", () => {
    const rounds = simulate(3);
    const m = computeUltimatumResult(rounds, null, 0, 0);
    expect(m.looksRandom).toBe(0);
  });

  it("не выдаёт NaN на пустых раундах", () => {
    const m = computeUltimatumResult([], null, 0, 0);
    expect(Number.isFinite(m.fairnessThreshold)).toBe(true);
  });
});
