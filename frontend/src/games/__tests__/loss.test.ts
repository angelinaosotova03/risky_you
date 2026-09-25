import { describe, expect, it } from "vitest";
import { CONTROL_R, computeLossResult, runLossBisection } from "../loss.logic";

describe("Ставка 50 на 50 — эталонные случаи", () => {
  it("E5: бот с λ=2 (принимает, если r ≥ 2) — итоговый λ от 1.95 до 2.05", () => {
    const outcomes = runLossBisection((r) => r >= 2);
    const m = computeLossResult(outcomes);
    expect(m.lambda).toBeGreaterThanOrEqual(1.95);
    expect(m.lambda).toBeLessThanOrEqual(2.05);
  });

  it("E6: бот принимает всё — λ у нижней границы, от 0.8 до 0.85", () => {
    const outcomes = runLossBisection(() => true);
    const m = computeLossResult(outcomes);
    expect(m.lambda).toBeGreaterThanOrEqual(0.8);
    expect(m.lambda).toBeLessThanOrEqual(0.85);
  });

  it("E7: бот отказывается от всего, кроме контрольной — λ у верхней границы, от 4.7 до 5", () => {
    const outcomes = runLossBisection((_r, control) => control); // отказ везде, кроме контрольной
    const m = computeLossResult(outcomes);
    expect(m.lambda).toBeGreaterThanOrEqual(4.7);
    expect(m.lambda).toBeLessThanOrEqual(5);
  });

  it("E8: отказ от контрольной ставки (r=6) — флаг «случайные нажатия»", () => {
    const outcomes = runLossBisection((r, control) => (control ? false : r >= 2));
    expect(outcomes.find((o) => o.control)?.r).toBe(CONTROL_R);
    const m = computeLossResult(outcomes);
    expect(m.looksRandom).toBe(1);
  });

  it("принятие контрольной ставки — флаг не срабатывает", () => {
    const outcomes = runLossBisection(() => true);
    const m = computeLossResult(outcomes);
    expect(m.looksRandom).toBe(0);
  });
});

describe("Ставка 50 на 50 — устойчивость", () => {
  it("не выдаёт NaN на пустом входе", () => {
    const m = computeLossResult([]);
    expect(Number.isFinite(m.lambda)).toBe(true);
  });
});
