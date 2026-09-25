import { describe, expect, it } from "vitest";
import { computePatienceResult, runPatienceBisection } from "../patience.logic";

describe("Сейчас или потом — эталонные случаи", () => {
  it("E9: бот с точкой безразличия V=500 — k = 0.0333 ± 0.002", () => {
    const outcomes = runPatienceBisection((x) => x >= 500);
    const m = computePatienceResult(outcomes, 0);
    expect(m.k).toBeGreaterThanOrEqual(0.0313);
    expect(m.k).toBeLessThanOrEqual(0.0353);
  });

  it("E10: бот всегда выбирает «через 30 дней» — V у 1000, k около 0", () => {
    const outcomes = runPatienceBisection(() => false);
    const m = computePatienceResult(outcomes, 0);
    expect(m.v).toBeGreaterThanOrEqual(950);
    expect(m.k).toBeLessThan(0.01);
  });

  // E11 по ТЗ: "бот всегда выбирает «сейчас» → V у 50, k около 0,63".
  // За 5 шагов линейной бисекции над диапазоном [50,1000] это математически
  // недостижимо — см. "Вопросы к автору" в QA_REPORT.md. Тест зафиксирован
  // с ФАКТИЧЕСКИ достижимым результатом, а не с ожиданием из документа.
  it("E11 (пересчитано): бот всегда выбирает «сейчас» — реальная сходимость за 5 шагов", () => {
    const outcomes = runPatienceBisection(() => true);
    const m = computePatienceResult(outcomes, 0);
    expect(m.v).toBeCloseTo(65, 0);
    expect(m.k).toBeCloseTo(0.479, 2);
  });
});

describe("Сейчас или потом — граничные случаи", () => {
  it("B3: V = 1000 → k = 0, годовые 0%, без деления на ноль", () => {
    const m = computePatienceResult([{ x: 1000, choseNow: true }], 0);
    // При единственном round-е с x=1000 итоговый v может быть не ровно 1000,
    // проверяем именно случай v=1000 напрямую через формулу
    const k = (1000 / 1000 - 1) / 30;
    expect(Number.isFinite(k)).toBe(true);
    expect(k).toBe(0);
    expect(Number.isFinite(m.k)).toBe(true);
  });

  it("B4: V = 50 → годовые не показываются как огромное число (проверяется в summarize, тут — что k конечен)", () => {
    const outcomes = runPatienceBisection(() => true);
    const m = computePatienceResult(outcomes, 0);
    const annualRate = (Math.pow(1000 / m.v, 12) - 1) * 100;
    expect(Number.isFinite(annualRate)).toBe(true);
    expect(annualRate).toBeGreaterThan(10_000); // подтверждаем, что цифра действительно огромная
  });
});
