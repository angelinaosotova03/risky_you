import { describe, expect, it } from "vitest";
import {
  ROUNDS,
  computeSenderRound,
  computeTrustResult,
  receiverBankDelta,
  resolvePartnerRate,
  senderBankDelta,
} from "../trust.logic";

describe("Доверие — эталонные случаи", () => {
  it("E15: отправил 10, партнёр возвращает 1/3 — утроено 30, вернулось 10, банк 10", () => {
    const round = computeSenderRound(10, 1 / 3, false);
    expect(round.tripled).toBe(30);
    expect(round.returned).toBe(10);
    expect(senderBankDelta(round)).toBe(10);
  });

  it("E16: отправил 0 во всех раундах — доверчивость 0, банк 30 за три раунда", () => {
    const rounds = Array.from({ length: ROUNDS }, () => computeSenderRound(0, 1 / 3, false));
    const bank = rounds.reduce((s, r) => s + senderBankDelta(r), 0);
    const m = computeTrustResult(rounds, 0, bank);
    expect(m.trustShare).toBe(0);
    expect(bank).toBe(30);
  });
});

describe("Доверие — граничные случаи", () => {
  it("B6: меньше 50 ответов получателей — норма из исследований, помечено fromResearch", () => {
    const { rate, fromResearch } = resolvePartnerRate(null);
    expect(fromResearch).toBe(true);
    expect(rate).toBeCloseTo(1 / 3, 5);
  });

  it("реальный сэмпл — используется он, а не холодный старт", () => {
    const { rate, fromResearch } = resolvePartnerRate(40);
    expect(fromResearch).toBe(false);
    expect(rate).toBe(0.4);
  });

  it("receiverBankDelta не даёт NaN на границах 0% и 100%", () => {
    expect(receiverBankDelta(0)).toBe(15);
    expect(receiverBankDelta(100)).toBe(0);
  });

  it("не выдаёт NaN на пустых раундах", () => {
    const m = computeTrustResult([], 0, 0);
    expect(Number.isFinite(m.trustShare)).toBe(true);
    expect(Number.isFinite(m.avgReturned)).toBe(true);
  });

  it("«окупалось» — только если вернули строго больше, чем отправили", () => {
    // Партнёр возвращает 1/3 от утроенного (=100%) — вернулось ровно столько, сколько отправили
    const breakEven = computeTrustResult([computeSenderRound(10, 1 / 3, false)], 0, 0);
    expect(breakEven.avgReturned).toBe(breakEven.avgSent);

    // Партнёр возвращает половину от утроенного (=150%) — вернулось больше, чем отправили
    const profit = computeTrustResult([computeSenderRound(10, 0.5, false)], 0, 0);
    expect(profit.avgReturned).toBeGreaterThan(profit.avgSent);
  });
});
