import { getSamples } from "../api";
import type { Game, GameResult } from "../types";
import {
  COLD_START_MIN_SAMPLE,
  MAX_GUESS,
  MIN_GUESS,
  RESEARCH_TARGET,
  START_GUESS,
  TARGET_FRACTION,
  computeBeautyResult,
} from "./beauty.logic";

// p-beauty contest: побеждает число, ближайшее к 2/3 среднего ответа всех участников.
// Рациональный предел при общем знании рациональности — 0. После ответа показываем
// гистограмму реальных ответов и победное число; можно сыграть необязательный 2-й раунд,
// уже зная, как отвечают другие.
// Иллюстративное распределение из исследований (пики около 22 и 33), пока своих данных мало
const RESEARCH_BUCKETS = [3, 6, 16, 17, 12, 8, 5, 3, 2, 1];

const round1 = (n: number) => Math.round(n * 10) / 10;

function bucketsOf(values: number[]): number[] {
  const buckets = new Array(10).fill(0);
  for (const v of values) buckets[Math.min(9, Math.max(0, Math.floor(v / 10)))] += 1;
  return buckets;
}

function renderHistogram(buckets: number[], guess: number): string {
  const max = Math.max(...buckets, 1);
  const guessBucket = Math.min(9, Math.max(0, Math.floor(guess / 10)));
  const bars = buckets
    .map((count, i) => {
      const height = Math.round((count / max) * 100);
      const cls = i === guessBucket ? "beauty-bar is-you" : "beauty-bar";
      return `<div class="${cls}" style="height:${Math.max(height, 2)}%"></div>`;
    })
    .join("");
  return `
    <div class="beauty-histogram">${bars}</div>
    <div class="beauty-histogram-labels"><span>0</span><span>50</span><span>100</span></div>`;
}

export const beauty: Game = {
  mount(root, onFinish) {
    let guess = START_GUESS;
    let guess2: number | null = null;
    let average: number | null = null;
    let target: number | null = null;
    let fromResearch = false;

    root.innerHTML = `
      <div class="intro">
        <h1>Две трети</h1>
        <p class="lead">Представь, что в этой игре одновременно участвуют тысячи человек. Каждый называет целое число от ${MIN_GUESS} до ${MAX_GUESS}.</p>
        <p>Побеждает тот, чьё число ближе всего к <strong>двум третям среднего ответа всех участников</strong>. Если все рассуждают рационально — и знают, что остальные тоже рациональны, — игра сходится к 0. На практике люди останавливаются на разной глубине рассуждений.</p>
        <button class="button" type="button" data-start>Начать</button>
      </div>`;
    root.querySelector("[data-start]")!.addEventListener("click", () => play());

    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

    function play(isSecond = false) {
      root.innerHTML = `
        <div class="amount-picker">
          <p class="amount-value" data-value>${START_GUESS}</p>
          <input class="amount-range" type="range" min="${MIN_GUESS}" max="${MAX_GUESS}" step="1" value="${START_GUESS}" data-range />
          <p class="hint">${isSecond ? "Теперь ты знаешь, как отвечают другие. Ещё раз?" : "Твоя цель — угадать 2/3 от среднего ответа всех участников"}</p>
          <div class="actions">
            <button class="button" type="button" data-submit>Ответить</button>
          </div>
        </div>`;
      const range = $<HTMLInputElement>("[data-range]");
      const value = $("[data-value]");
      range.addEventListener("input", () => {
        value.textContent = range.value;
      });
      $("[data-submit]").addEventListener("click", () => submit(isSecond));
    }

    async function submit(isSecond: boolean) {
      const range = $<HTMLInputElement>("[data-range]");
      const submitBtn = $<HTMLButtonElement>("[data-submit]");
      const value = round1(Number(range.value));
      submitBtn.disabled = true;
      submitBtn.textContent = "Считаем…";

      if (isSecond) {
        guess2 = value;
        reveal(true);
        return;
      }

      guess = value;
      const samples = await getSamples("beauty", "guess", 500, COLD_START_MIN_SAMPLE);
      if (samples && samples.values.length > 0) {
        average = round1(samples.values.reduce((s, v) => s + v, 0) / samples.values.length);
        target = round1(average * TARGET_FRACTION);
        fromResearch = false;
        reveal(false, samples.values);
      } else {
        fromResearch = true;
        target = RESEARCH_TARGET;
        reveal(false, []);
      }
    }

    function reveal(isSecond: boolean, sampleValues: number[] = []) {
      const buckets = sampleValues.length > 0 ? bucketsOf(sampleValues) : RESEARCH_BUCKETS;
      const winnerText = fromResearch
        ? `Пока участников мало для точного победного числа — по данным исследований оно около ${target}.`
        : `Победное число сейчас — ${target}.`;

      root.innerHTML = `
        <div class="amount-picker">
          <p class="choice-prompt">Ты назвал${isSecond ? " во 2-й раз" : ""}: <strong>${isSecond ? guess2 : guess}</strong></p>
          ${renderHistogram(buckets, isSecond ? guess2! : guess)}
          <p class="hint">${winnerText}</p>
          <div class="actions" style="justify-content:center">
            ${!isSecond ? '<button class="button button-quiet" type="button" data-again>Ещё раз</button>' : ""}
            <button class="button" type="button" data-done>Готово</button>
          </div>
        </div>`;
      if (!isSecond) {
        $("[data-again]").addEventListener("click", () => play(true));
      }
      $("[data-done]").addEventListener("click", finish);
    }

    function finish() {
      const result: GameResult = {
        testId: "beauty",
        finishedAt: new Date().toISOString(),
        metrics: { ...computeBeautyResult(guess, guess2, average, target) },
      };
      onFinish(result);
    }

    return () => {};
  },

  summarize(result) {
    const m = result.metrics;
    const depth =
      m.guess <= 5
        ? "рациональный предел — ты рассуждала «до конца»"
        : m.guess <= 22
        ? "несколько шагов рассуждения о чужой рациональности"
        : m.guess <= 35
        ? "один шаг вперёд — учла, что другие тоже думают о среднем"
        : "ответ без поправки на рассуждения остальных";

    // s считается всегда: если живого среднего пока мало, target — ориентир из исследований
    const hasS = m.s !== undefined;
    const fromResearch = m.fromResearch === 1;

    return {
      primary: hasS
        ? {
            metric: "s",
            label: "насколько твой ответ близок к цели — 2/3 среднего по всем участникам",
            display: `${Math.round(m.s * 100)}%`,
            comparison: (p) => `Ты угадала точнее, чем ${p}% участников.`,
          }
        : {
            metric: "guess",
            label: "твоё число — чем оно меньше, тем глубже ты закладывалась на рациональность остальных",
            display: m.guess.toLocaleString("ru-RU"),
            comparison: (p) => `Ты рассуждаешь на большую глубину, чем ${100 - p}% участников.`,
          },
      details: [
        ...(hasS
          ? [
              ...(fromResearch
                ? []
                : [{ label: "Средний ответ участников", value: m.average.toLocaleString("ru-RU") }]),
              {
                label: fromResearch ? "Цель по данным исследований (2/3 от среднего)" : "Цель (2/3 от среднего)",
                value: m.target.toLocaleString("ru-RU"),
              },
            ]
          : [{ label: "Цель игры", value: `${TARGET_FRACTION.toFixed(2)}× среднее по всем ответам` }]),
        { label: "Глубина рассуждения", value: depth },
        ...(m.guess2 !== undefined ? [{ label: "Ответ во 2-й раз", value: m.guess2.toLocaleString("ru-RU") }] : []),
      ],
      science: {
        text:
          "Это p-beauty contest («конкурс красоты» по Кейнсу) — методика, которую ввела Розмари Нагель. Она проверяет не то, насколько ты рациональна сама по себе, а на сколько шагов вперёд ты моделируешь мышление других: наивный ответ — около 50, «я думаю, что все ответят 50, значит назову 33» — один шаг, «я думаю, что все подумают как я» — ещё глубже, и так далее к нулю. В реальных экспериментах даже опытные участники редко доходят до конца этой цепочки — обычно рассуждение останавливается на 1–3 шагах. Это игровой тест, а не диагноз: он показывает, как ты рассуждала именно в этом раунде.",
        source:
          "Nagel R. (1995). Unraveling in Guessing Games: An Experimental Study. American Economic Review, 85(5), 1313–1326.",
      },
    };
  },
};
