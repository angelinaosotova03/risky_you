import { bisectMid, roundTo } from "../bisect";
import type { Game, GameResult } from "../types";
import { DELAY_DAYS, LATER_AMOUNT, ROUNDS, X_MAX, X_MIN, computePatienceResult, type PatienceOutcome } from "./patience.logic";

// Опросник временного дисконтирования (Kirby), адаптивное титрование: "X ₽ сейчас
// или LATER_AMOUNT через DELAY_DAYS дней?". Бисекция X находит точку безразличия V
// за ROUNDS шагов. Плюс 1 настоящий раунд ожидания с реальным таймером — он не входит
// в ось, но показывается в тексте результата.
const REAL_WAIT_S = 15;
const REAL_NOW_POINTS = 10;
const REAL_LATER_POINTS = 25;
const OUTCOME_MS = 700;
const REAL_OUTCOME_MS = 1400;

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export const patience: Game = {
  mount(root, onFinish) {
    const rounds: PatienceOutcome[] = [];
    let index = 0;
    let locked = false;
    let timer: number | undefined;
    let realTicker: number | undefined;
    let range = { lo: X_MIN, hi: X_MAX };

    root.innerHTML = `
      <div class="intro">
        <h1>Сейчас или потом</h1>
        <p class="lead">${ROUNDS} вопросов: сумма сейчас или ${rub(LATER_AMOUNT)} через ${DELAY_DAYS} дней. Плюс один настоящий раунд ожидания в конце.</p>
        <button class="button" type="button" data-start>Начать</button>
      </div>`;
    root.querySelector("[data-start]")!.addEventListener("click", play);

    function play() {
      round();
    }

    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

    function currentX(): number {
      return roundTo(bisectMid(range), 10);
    }

    function round() {
      const x = currentX();
      root.innerHTML = `
        <div class="choice-stage">
          <div class="bart-status">
            <span>Раунд ${index + 1} из ${ROUNDS}</span>
          </div>
          <p class="choice-prompt">Что выбираешь?</p>
          <div class="choice-buttons">
            <button class="choice-button" type="button" data-now>${rub(x)}<br />сейчас</button>
            <button class="choice-button" type="button" data-later>${rub(LATER_AMOUNT)}<br />через ${DELAY_DAYS} дней</button>
          </div>
          <p class="bart-outcome" data-outcome aria-live="polite">&nbsp;</p>
        </div>`;
      $("[data-now]").addEventListener("click", () => choose(x, true));
      $("[data-later]").addEventListener("click", () => choose(x, false));
    }

    function choose(x: number, choseNow: boolean) {
      if (locked) return;
      locked = true;
      rounds.push({ x, choseNow });
      // Выбрал "сейчас" при X → V ≤ X (сузили верхнюю границу); выбрал "потом" → V > X
      range = choseNow ? { ...range, hi: x } : { ...range, lo: x };
      $<HTMLButtonElement>("[data-now]").disabled = true;
      $<HTMLButtonElement>("[data-later]").disabled = true;
      $("[data-outcome]").textContent = choseNow ? "Записано: сейчас" : "Записано: подождать";
      timer = window.setTimeout(next, OUTCOME_MS);
    }

    function next() {
      index += 1;
      locked = false;
      if (index >= ROUNDS) return realRound();
      round();
    }

    function realRound() {
      let remaining = REAL_WAIT_S;
      let settled = false;
      root.innerHTML = `
        <div class="choice-stage">
          <p class="choice-prompt">Настоящий раунд: подожди и получи ${REAL_LATER_POINTS} очков, или забери ${REAL_NOW_POINTS} сейчас.</p>
          <p class="bart-pot">Осталось: <strong data-timer>${remaining}</strong> с</p>
          <div class="actions" style="justify-content:center">
            <button class="button" type="button" data-take-now>Забрать сейчас (${REAL_NOW_POINTS})</button>
          </div>
          <p class="bart-outcome" data-outcome aria-live="polite">&nbsp;</p>
        </div>`;
      $("[data-take-now]").addEventListener("click", () => settle(REAL_WAIT_S - remaining));

      realTicker = window.setInterval(() => {
        remaining -= 1;
        const el = root.querySelector("[data-timer]");
        if (el) el.textContent = String(remaining);
        if (remaining <= 0) {
          window.clearInterval(realTicker);
          settle(REAL_WAIT_S);
        }
      }, 1000);

      // Показываем, что реально произошло, прежде чем перейти к итогам —
      // без этого раунд с настоящим ожиданием заканчивался молча
      function settle(waitedSeconds: number) {
        if (settled) return;
        settled = true;
        window.clearInterval(realTicker);
        $<HTMLButtonElement>("[data-take-now]").disabled = true;
        $("[data-outcome]").textContent =
          waitedSeconds >= REAL_WAIT_S
            ? `Ты дождался! +${REAL_LATER_POINTS} очков`
            : `Забрал раньше: +${REAL_NOW_POINTS} очков`;
        timer = window.setTimeout(() => finish(waitedSeconds), REAL_OUTCOME_MS);
      }
    }

    function finish(realWaitResult: number) {
      const result: GameResult = {
        testId: "patience",
        finishedAt: new Date().toISOString(),
        metrics: { ...computePatienceResult(rounds, realWaitResult) },
      };
      onFinish(result);
    }

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(realTicker);
    };
  },

  summarize(result) {
    const m = result.metrics;
    const rawAnnualRate = (Math.pow(LATER_AMOUNT / m.v, 12) - 1) * 100;
    // При маленьком V (например 50) годовые улетают в астрономические числа —
    // показываем понятный потолок, а не "409600000000000%"
    const ANNUAL_RATE_CAP = 10_000;
    const annualRateText =
      rawAnnualRate > ANNUAL_RATE_CAP
        ? `больше ${ANNUAL_RATE_CAP.toLocaleString("ru-RU")}`
        : Math.round(rawAnnualRate).toLocaleString("ru-RU");
    const waitedText =
      m.realWaited === 1 ? `выдержал ${REAL_WAIT_S} секунд` : `сдался на ${m.realWaitResult}-й секунде`;

    return {
      primary: {
        metric: "k",
        label: "твой коэффициент гиперболического дисконтирования k — чем меньше, тем терпеливее",
        display: `${m.k.toLocaleString("ru-RU")}`,
        comparison: (p) => `Ты терпеливее, чем ${100 - p}% участников.`,
      },
      details: [
        { label: "Точка безразличия", value: rub(roundTo(m.v, 10)) },
        { label: "Это как требовать годовых", value: `${annualRateText}%` },
        { label: "Настоящее ожидание", value: waitedText },
      ],
      science: {
        text:
          "Это адаптивная версия опросника временного дисконтирования (в духе методики Kirby): игра бисекцией находит точку безразличия V — сумму сейчас, равноценную для тебя более крупной сумме через месяц. Коэффициент k показывает, насколько круто ты обесцениваешь будущее: чем он больше, тем сильнее тебе важно получить деньги немедленно. В конце — настоящий короткий раунд ожидания, а не гипотетический вопрос: там либо действительно ждёшь, либо действительно забираешь меньше сейчас. Это игровой тест, а не диагноз: он показывает, как ты выбирала именно в этих раундах.",
        source:
          "Kirby K. N., Petry N. M., Bickel W. K. (1999). Heroin addicts have higher discount rates for delayed rewards than non-drug-using controls. Journal of Experimental Psychology: General, 128(1), 78–87.",
      },
    };
  },
};
