import { describe, expect, it } from "vitest";
import { classifyAnswer, computeReflectionResult, normalizeAnswer, POOL } from "../reflection.logic";

const sonsQuestion = POOL[0]; // "У Маши 5 сыновей..." correct=6, trap=10

describe("Задачи-ловушки — эталонные случаи", () => {
  it("E22: «6», « 6 », «6 детей», «шесть» — все засчитаны верными", () => {
    for (const raw of ["6", " 6 ", "6 детей", "шесть"]) {
      expect(classifyAnswer(raw, sonsQuestion)).toBe("correct");
    }
  });

  it("E23: ответ «10» — интуитивно-неверный (trap), а не «прочий»", () => {
    expect(classifyAnswer("10", sonsQuestion)).toBe("trap");
  });
});

describe("Задачи-ловушки — граничные случаи", () => {
  it("B10: пустой ответ по таймеру — «прочий», не ломает расчёт", () => {
    expect(classifyAnswer("", sonsQuestion)).toBe("other");
    const m = computeReflectionResult(["other", "correct", "trap"]);
    expect(m.otherCount).toBe(1);
    expect(m.totalRounds).toBe(3);
    expect(Number.isFinite(m.reflectionScore)).toBe(true);
  });

  it("нечисловой мусор и пробелы не дают NaN", () => {
    expect(normalizeAnswer("   ")).toBeNull();
    expect(normalizeAnswer("абвгд")).toBeNull();
  });

  it("не выдаёт NaN на пустом наборе раундов", () => {
    const m = computeReflectionResult([]);
    expect(Number.isFinite(m.reflectionScore)).toBe(true);
  });
});
