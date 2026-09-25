import { describe, expect, it } from "vitest";
import { accuracyLabel, averageMetric } from "../accuracy";
import type { GameResult } from "../types";

function result(testId: string, metrics: Record<string, number>): GameResult {
  return { testId, finishedAt: new Date(0).toISOString(), metrics };
}

describe("B11: повторное прохождение усредняется, точка становится сплошной", () => {
  it("одна попытка — value = сама попытка, attempts = 1 (точка полупрозрачная)", () => {
    const results = [result("loss", { lambda: 2 })];
    const avg = averageMetric(results, "loss", "lambda");
    expect(avg).toEqual({ value: 2, attempts: 1 });
    expect(accuracyLabel(avg!.attempts)).toBe("примерно");
  });

  it("две+ попытки — value = среднее по всем, attempts = 2+ (точка сплошная)", () => {
    const results = [result("loss", { lambda: 2 }), result("loss", { lambda: 4 })];
    const avg = averageMetric(results, "loss", "lambda");
    expect(avg).toEqual({ value: 3, attempts: 2 });
    expect(accuracyLabel(avg!.attempts)).toBe("точнее");
  });

  it("считает только попытки этого теста с этой метрикой, остальные игры не смешиваются", () => {
    const results = [result("loss", { lambda: 2 }), result("patience", { k: 0.1 }), result("loss", { lambda: 6 })];
    const avg = averageMetric(results, "loss", "lambda");
    expect(avg).toEqual({ value: 4, attempts: 2 });
  });

  it("нет попыток — null, а не NaN", () => {
    expect(averageMetric([], "loss", "lambda")).toBeNull();
  });
});
