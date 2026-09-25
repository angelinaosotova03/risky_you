import { describe, expect, it } from "vitest";
import { computeBalloonResult, generateExplosionPoints, SAFE_FIRST, SAFE_MIN_PUMP } from "../balloon.logic";

describe("Шарик — эталонные случаи", () => {
  it("E1: 10 шариков, Забрать после 20 качков, взрывов нет", () => {
    const rounds = Array.from({ length: 10 }, () => ({ pumps: 20, exploded: false }));
    const m = computeBalloonResult(rounds);
    expect(m.adjustedPumps).toBe(20);
    expect(m.totalEarned).toBe(200);
  });

  it("E2: 5 шариков лопнули, 5 забраны после 30 качков", () => {
    const rounds = [
      ...Array.from({ length: 5 }, () => ({ pumps: 12, exploded: true })),
      ...Array.from({ length: 5 }, () => ({ pumps: 30, exploded: false })),
    ];
    const m = computeBalloonResult(rounds);
    expect(m.adjustedPumps).toBe(30);
    expect(m.totalEarned).toBe(150);
  });

  it("E3: 100 000 симуляций стратегии «стоп на 32» — средний банк за шарик 16 ± 0.2", () => {
    const N = 100_000;
    let earned = 0;
    for (let i = 0; i < N; i++) {
      const explodeAt = 1 + Math.floor(Math.random() * 64);
      earned += explodeAt <= 32 ? 0 : 32;
    }
    const avgEarned = earned / N;
    expect(avgEarned).toBeGreaterThan(15.8);
    expect(avgEarned).toBeLessThan(16.2);
  });

  it("E4: 1000 генераций первых двух шариков — ни одна точка взрыва < 8", () => {
    for (let i = 0; i < 1000; i++) {
      const points = generateExplosionPoints();
      for (let j = 0; j < SAFE_FIRST; j++) {
        expect(points[j]).toBeGreaterThanOrEqual(SAFE_MIN_PUMP);
      }
    }
  });
});

describe("Шарик — граничные случаи", () => {
  it("B1: лопнули все 10 шариков — средняя по всем, точность низкая", () => {
    const rounds = [
      { pumps: 5, exploded: true },
      { pumps: 15, exploded: true },
      { pumps: 25, exploded: true },
      { pumps: 5, exploded: true },
      { pumps: 15, exploded: true },
      { pumps: 25, exploded: true },
      { pumps: 5, exploded: true },
      { pumps: 15, exploded: true },
      { pumps: 25, exploded: true },
      { pumps: 5, exploded: true },
    ];
    const m = computeBalloonResult(rounds);
    const expectedAvg = rounds.reduce((s, r) => s + r.pumps, 0) / rounds.length;
    expect(m.adjustedPumps).toBeCloseTo(expectedAvg, 1);
    expect(m.lowAccuracy).toBe(1);
  });

  it("B2: забрал 0 качков на всех шариках — флаг случайных нажатий", () => {
    const rounds = Array.from({ length: 10 }, () => ({ pumps: 0, exploded: false }));
    const m = computeBalloonResult(rounds);
    expect(m.adjustedPumps).toBe(0);
    expect(m.looksRandom).toBe(1);
  });

  it("не выдаёт NaN/Infinity на пустом входе", () => {
    const m = computeBalloonResult([]);
    expect(Number.isFinite(m.adjustedPumps)).toBe(true);
    expect(Number.isFinite(m.totalEarned)).toBe(true);
  });
});
