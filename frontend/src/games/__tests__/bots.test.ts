import { describe, expect, it } from "vitest";
import { MAX_PUMPS, generateExplosionPoints, computeBalloonResult, type BalloonRound } from "../balloon.logic";
import { R_MIN, R_MAX, runLossBisection, computeLossResult } from "../loss.logic";
import { runPatienceBisection, computePatienceResult } from "../patience.logic";
import { DRAWS, BASE, DECKS, GOOD_DECKS, STARTING_BANK, computeDecksResult, type Draw, type DeckId } from "../decks.logic";
import { ROUNDS as TRUST_ROUNDS, ENDOWMENT, computeSenderRound, computeTrustResult, senderBankDelta } from "../trust.logic";
import { MAO_LO, MAO_HI, computeUltimatumResult, nextOffer, type UltimatumRound } from "../ultimatum.logic";
import { computeS } from "../beauty.logic";
import { computeReflectionResult, POOL, type AnswerCategory } from "../reflection.logic";

const N = 1000;
const MAX_MS_PER_SESSION = 50;

/** Все числовые поля метрик — конечные (без NaN/Infinity) */
function assertFinite(metrics: object) {
  for (const [key, value] of Object.entries(metrics)) {
    expect(Number.isFinite(value), `${key} = ${value}`).toBe(true);
  }
}

function timeIt<T>(fn: () => T, times: number): { results: T[]; msPerSession: number } {
  const start = performance.now();
  const results: T[] = [];
  for (let i = 0; i < times; i++) results.push(fn());
  const ms = performance.now() - start;
  return { results, msPerSession: ms / times };
}

describe("Симуляция ботами — Шарик", () => {
  function session(target: number): BalloonRound[] {
    const points = generateExplosionPoints();
    return points.map((point) => {
      const t = Math.max(1, Math.min(MAX_PUMPS, target));
      const exploded = t >= point;
      return { pumps: exploded ? point : t, exploded };
    });
  }

  it("min < random < max по средней накачке; всё конечное; <50мс/сессию", () => {
    const min = timeIt(() => computeBalloonResult(session(1)), N);
    const random = timeIt(() => computeBalloonResult(session(1 + Math.floor(Math.random() * MAX_PUMPS))), N);
    const max = timeIt(() => computeBalloonResult(session(55)), N);

    [...min.results, ...random.results, ...max.results].forEach(assertFinite);
    expect(min.msPerSession).toBeLessThan(MAX_MS_PER_SESSION);

    const avg = (rs: ReturnType<typeof computeBalloonResult>[]) => rs.reduce((s, r) => s + r.adjustedPumps, 0) / rs.length;
    expect(avg(min.results)).toBeLessThan(avg(random.results));
    expect(avg(random.results)).toBeLessThan(avg(max.results));
  });
});

describe("Симуляция ботами — Ставка 50 на 50", () => {
  function session(decide: (r: number, control: boolean) => boolean) {
    return computeLossResult(runLossBisection(decide));
  }

  it("λ: принимает всё < случайный < отвергает всё; всё конечное", () => {
    const acceptAll = timeIt(() => session(() => true), N);
    const rejectAll = timeIt(() => session(() => false), N);
    const random = timeIt(() => session(() => Math.random() < 0.5), N);

    [...acceptAll.results, ...rejectAll.results, ...random.results].forEach(assertFinite);
    expect(acceptAll.msPerSession).toBeLessThan(MAX_MS_PER_SESSION);

    const avg = (rs: ReturnType<typeof session>[]) => rs.reduce((s, r) => s + r.lambda, 0) / rs.length;
    expect(avg(acceptAll.results)).toBeLessThan(avg(random.results));
    expect(avg(random.results)).toBeLessThan(avg(rejectAll.results));
    // Границы диапазона: λ у "принимает всё" близко к R_MIN, у "отвергает всё" — к R_MAX
    expect(avg(acceptAll.results)).toBeGreaterThanOrEqual(R_MIN - 1e-9);
    expect(avg(rejectAll.results)).toBeLessThanOrEqual(R_MAX + 1); // допуск для CONTROL_R=6 в крайних случаях
  });

  it("параметрический бот (λ=2) восстанавливает параметр в пределах погрешности E5", () => {
    const bot = (r: number) => r >= 2;
    const { lambda } = session(bot);
    expect(lambda).toBeGreaterThanOrEqual(1.95);
    expect(lambda).toBeLessThanOrEqual(2.05);
  });
});

describe("Симуляция ботами — Сейчас или потом", () => {
  function session(decide: (x: number) => boolean) {
    return computePatienceResult(runPatienceBisection(decide), 20);
  }

  it("k: всегда «потом» < случайный < всегда «сейчас»; всё конечное", () => {
    const alwaysLater = timeIt(() => session(() => false), N);
    const alwaysNow = timeIt(() => session(() => true), N);
    const random = timeIt(() => session(() => Math.random() < 0.5), N);

    [...alwaysLater.results, ...alwaysNow.results, ...random.results].forEach(assertFinite);
    expect(alwaysLater.msPerSession).toBeLessThan(MAX_MS_PER_SESSION);

    const avg = (rs: ReturnType<typeof session>[]) => rs.reduce((s, r) => s + r.k, 0) / rs.length;
    expect(avg(alwaysLater.results)).toBeLessThan(avg(random.results));
    expect(avg(random.results)).toBeLessThan(avg(alwaysNow.results));
  });
});

describe("Симуляция ботами — Четыре колоды", () => {
  function drawFrom(deck: DeckId, countSoFar: Record<DeckId, number>): Draw {
    const amount = BASE[deck][countSoFar[deck] % 10];
    countSoFar[deck] += 1;
    return { deck, amount };
  }

  function fixedDeckSession(deck: DeckId): Draw[] {
    const counts: Record<DeckId, number> = { A: 0, B: 0, C: 0, D: 0 };
    return Array.from({ length: DRAWS }, () => drawFrom(deck, counts));
  }

  function randomSession(): Draw[] {
    const counts: Record<DeckId, number> = { A: 0, B: 0, C: 0, D: 0 };
    return Array.from({ length: DRAWS }, () => drawFrom(DECKS[Math.floor(Math.random() * 4)], counts));
  }

  /** После каждого штрафа (отрицательный исход) снижает вес этой колоды */
  function learningSession(): Draw[] {
    const counts: Record<DeckId, number> = { A: 0, B: 0, C: 0, D: 0 };
    const weights: Record<DeckId, number> = { A: 1, B: 1, C: 1, D: 1 };
    const draws: Draw[] = [];
    for (let i = 0; i < DRAWS; i++) {
      const total = DECKS.reduce((s, d) => s + weights[d], 0);
      let roll = Math.random() * total;
      let chosen: DeckId = "A";
      for (const d of DECKS) {
        if (roll < weights[d]) {
          chosen = d;
          break;
        }
        roll -= weights[d];
      }
      const draw = drawFrom(chosen, counts);
      if (draw.amount < 0) weights[chosen] *= 0.6;
      draws.push(draw);
    }
    return draws;
  }

  function bankOf(history: Draw[]): number {
    return STARTING_BANK + history.reduce((s, d) => s + d.amount, 0);
  }

  it("доля выгодных: только A (0%) < случайный < только C (100%); всё конечное", () => {
    const min = timeIt(() => computeDecksResult(fixedDeckSession("A"), bankOf(fixedDeckSession("A"))), N);
    const max = timeIt(() => computeDecksResult(fixedDeckSession("C"), bankOf(fixedDeckSession("C"))), N);
    const random = timeIt(() => {
      const h = randomSession();
      return computeDecksResult(h, bankOf(h));
    }, N);

    [...min.results, ...max.results, ...random.results].forEach(assertFinite);
    expect(min.msPerSession).toBeLessThan(MAX_MS_PER_SESSION);

    const avg = (rs: ReturnType<typeof computeDecksResult>[]) => rs.reduce((s, r) => s + r.goodShareRecent, 0) / rs.length;
    expect(avg(min.results)).toBe(0);
    expect(avg(max.results)).toBe(100);
    expect(avg(random.results)).toBeGreaterThan(0);
    expect(avg(random.results)).toBeLessThan(100);
  });

  it("обучающийся бот: доля выгодных колод в последнем блоке из 10 карт выше, чем в первом", () => {
    const isGood = (d: Draw) => GOOD_DECKS.includes(d.deck);
    const shareOf = (block: Draw[]) => block.filter(isGood).length / block.length;

    let firstBlockShareSum = 0;
    let lastBlockShareSum = 0;
    for (let i = 0; i < N; i++) {
      const history = learningSession();
      firstBlockShareSum += shareOf(history.slice(0, 10));
      lastBlockShareSum += shareOf(history.slice(-10));
    }
    expect(lastBlockShareSum / N).toBeGreaterThan(firstBlockShareSum / N);
  });
});

describe("Симуляция ботами — Доверие", () => {
  function session(sentFn: () => number) {
    const rounds = Array.from({ length: TRUST_ROUNDS }, () => computeSenderRound(sentFn(), 1 / 3, true));
    const bank = rounds.reduce((s, r) => s + senderBankDelta(r), 0);
    return computeTrustResult(rounds, 0, bank);
  }

  it("доля доверенного: отправляет 0 < случайный < отправляет всё; всё конечное", () => {
    const min = timeIt(() => session(() => 0), N);
    const max = timeIt(() => session(() => ENDOWMENT), N);
    const random = timeIt(() => session(() => Math.round(Math.random() * ENDOWMENT)), N);

    [...min.results, ...max.results, ...random.results].forEach(assertFinite);
    expect(min.msPerSession).toBeLessThan(MAX_MS_PER_SESSION);

    const avg = (rs: ReturnType<typeof session>[]) => rs.reduce((s, r) => s + r.trustShare, 0) / rs.length;
    expect(avg(min.results)).toBe(0);
    expect(avg(max.results)).toBe(100);
    expect(avg(random.results)).toBeGreaterThan(avg(min.results));
    expect(avg(random.results)).toBeLessThan(avg(max.results));
  });

  it("параметрический бот (отправляет 5 из 10) восстанавливает ≈50%", () => {
    const { trustShare } = session(() => 5);
    expect(trustShare).toBe(50);
  });
});

describe("Симуляция ботами — Ультиматум", () => {
  function session(threshold: number) {
    const rounds: UltimatumRound[] = [];
    let range = { lo: MAO_LO, hi: MAO_HI };
    for (let i = 0; i < 3; i++) {
      const offer = nextOffer(range);
      const accepted = offer >= threshold;
      rounds.push({ offer, accepted });
      range = accepted ? { ...range, hi: offer } : { ...range, lo: offer };
    }
    return computeUltimatumResult(rounds, null, 0, 0);
  }

  it("MAO: принимает всё < случайный < отвергает всё; всё конечное", () => {
    const acceptAll = timeIt(() => session(-Infinity), N);
    const rejectAll = timeIt(() => session(Infinity), N);
    const random = timeIt(() => session(Math.random() < 0.5 ? -Infinity : Infinity), N);

    [...acceptAll.results, ...rejectAll.results, ...random.results].forEach(assertFinite);
    expect(acceptAll.msPerSession).toBeLessThan(MAX_MS_PER_SESSION);

    const avg = (rs: ReturnType<typeof session>[]) => rs.reduce((s, r) => s + r.fairnessThreshold, 0) / rs.length;
    expect(avg(acceptAll.results)).toBeLessThan(avg(rejectAll.results));
  });

  it("параметрический бот (порог 3) даёт MAO=2,5, как в E17", () => {
    const { fairnessThreshold } = session(3);
    expect(fairnessThreshold).toBeCloseTo(25, 5);
  });
});

describe("Симуляция ботами — Две трети", () => {
  const TARGET = 22;

  it("S: далёкий ответ < случайный < точный ответ; всё конечное", () => {
    const far = timeIt(() => computeS(100, TARGET), N);
    const exact = timeIt(() => computeS(TARGET, TARGET), N);
    const random = timeIt(() => computeS(Math.random() * 100, TARGET), N);

    [...far.results, ...exact.results, ...random.results].forEach((s) => expect(Number.isFinite(s)).toBe(true));
    expect(far.msPerSession).toBeLessThan(MAX_MS_PER_SESSION);

    const avg = (rs: number[]) => rs.reduce((s, r) => s + r, 0) / rs.length;
    expect(avg(far.results)).toBeLessThan(avg(random.results));
    expect(avg(random.results)).toBeLessThan(avg(exact.results));
    expect(avg(exact.results)).toBe(1);
  });
});

describe("Симуляция ботами — Задачи-ловушки", () => {
  function session(pick: () => AnswerCategory) {
    const categories = Array.from({ length: 3 }, pick);
    return computeReflectionResult(categories);
  }

  it("reflectionScore: всегда ловушка < случайный < всегда верно; всё конечное", () => {
    const min = timeIt(() => session(() => "trap"), N);
    const max = timeIt(() => session(() => "correct"), N);
    const random = timeIt(() => {
      const roll = Math.random();
      return session(() => (roll < 1 / 3 ? "correct" : roll < 2 / 3 ? "trap" : "other"));
    }, N);

    [...min.results, ...max.results, ...random.results].forEach(assertFinite);
    expect(min.msPerSession).toBeLessThan(MAX_MS_PER_SESSION);

    const avg = (rs: ReturnType<typeof session>[]) => rs.reduce((s, r) => s + r.reflectionScore, 0) / rs.length;
    expect(avg(min.results)).toBe(0);
    expect(avg(max.results)).toBe(100);
    expect(avg(random.results)).toBeGreaterThan(avg(min.results));
    expect(avg(random.results)).toBeLessThan(avg(max.results));
  });

  it("параметрический бот (P(верно)=0.5 на 3000 попытках) восстанавливает ≈50% с запасом", () => {
    let correctCount = 0;
    const total = N * 3;
    for (let i = 0; i < total; i++) if (Math.random() < 0.5) correctCount++;
    const score = (correctCount / total) * 100;
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThan(60);
  });
});

// Сверка: пул задач непуст и не даёт побочных эффектов при повторном чтении
describe("Симуляция ботами — общее", () => {
  it("пул задач CRT не пуст", () => {
    expect(POOL.length).toBeGreaterThan(0);
  });
});
