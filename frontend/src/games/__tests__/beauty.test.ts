import { describe, expect, it } from "vitest";
import { computeBeautyResult, computeReasoningLevel, computeS, REASONING_CAP } from "../beauty.logic";

describe("Две трети — эталонные случаи", () => {
  it("E20: ответ 50/33/22 — уровень рассуждения 0/1/2 (±0,05)", () => {
    expect(computeReasoningLevel(50)).toBeCloseTo(0, 1);
    expect(computeReasoningLevel(100 / 3)).toBeCloseTo(1, 1);
    expect(computeReasoningLevel(50 * (2 / 3) ** 2)).toBeCloseTo(2, 1);
  });

  it("E21: победное число 24, ответ 24 — S=1; ответ 100 — S=0,24", () => {
    expect(computeS(24, 24)).toBe(1);
    expect(computeS(100, 24)).toBeCloseTo(0.24, 5);
  });
});

describe("Две трети — граничные случаи", () => {
  it("B8: ответ 0 — уровень рассуждения ограничен REASONING_CAP, без log(0)", () => {
    expect(computeReasoningLevel(0)).toBe(REASONING_CAP);
    expect(Number.isFinite(computeReasoningLevel(0))).toBe(true);
  });

  it("не выдаёт NaN/Infinity ни при каких входах в допустимом диапазоне", () => {
    for (const guess of [0, 1, 50, 99, 100]) {
      expect(Number.isFinite(computeReasoningLevel(guess))).toBe(true);
    }
  });

  it("холодный старт: цель берётся из исследований, s и distance всё равно считаются", () => {
    const m = computeBeautyResult(30, null, null, 22);
    expect(m.fromResearch).toBe(1);
    expect(m.average).toBeUndefined();
    expect(m.target).toBe(22);
    expect(Number.isFinite(m.s!)).toBe(true);
    expect(Number.isFinite(m.distance!)).toBe(true);
  });

  it("живое среднее — fromResearch не выставляется", () => {
    const m = computeBeautyResult(30, null, 35, 23.3);
    expect(m.fromResearch).toBeUndefined();
    expect(m.average).toBe(35);
  });
});
