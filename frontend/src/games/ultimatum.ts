import { pluralLabel } from "../plural";
import type { Game, GameResult } from "../types";
import { MAO_LO, MAO_HI, POT, computeUltimatumResult, nextOffer, type UltimatumRound } from "./ultimatum.logic";

// Ultimatum Game (Güth, Schmittberger & Schwarze, 1982). Партнёр делит 10 монет
// и предлагает тебе часть; "Беру" — оба получают предложенное, "Отказ" — оба 0.
// Бисекция целых сумм 1-5 находит минимально приемлемое предложение (MAO) за 3 шага:
// старт 3; принял → следующее предложение ниже, отказал → выше.
// 4-й раунд — то же пограничное предложение, но "от компьютера" (человек vs машина).
// 5-й раунд — ты сам в роли предлагающего: твой ответ уходит в базу.
const OUTCOME_MS = 900;

const coinsLabel = (n: number) => pluralLabel(n, ["монета", "монеты", "монет"]);

export const ultimatum: Game = {
  mount(root, onFinish) {
    const rounds: UltimatumRound[] = [];
    let computerRound: UltimatumRound | null = null;
    let proposerOffer = 0;
    let bank = 0;
    let index = 0;
    let locked = false;
    let timer: number | undefined;
    let range = { lo: MAO_LO, hi: MAO_HI };

    const STAGE_RECEIVER = 0;
    const STAGE_COMPUTER = 1;
    const STAGE_PROPOSER = 2;
    let stage = STAGE_RECEIVER;

    root.innerHTML = `
      <div class="intro">
        <h1>Ультиматум</h1>
        <p class="lead">Партнёр делит ${POT} монет и предлагает тебе часть. «Беру» — оба получают предложенное. «Отказ» — оба получают 0.</p>
        <p>3 раунда, потом одно предложение от компьютера и один раунд, где предлагаешь уже ты.</p>
        <button class="button" type="button" data-start>Начать</button>
      </div>`;
    root.querySelector("[data-start]")!.addEventListener("click", play);

    function play() {
      receiverRound();
    }

    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

    function receiverRound() {
      const offer = nextOffer(range);
      root.innerHTML = `
        <div class="choice-stage">
          <div class="bart-status">
            <span>Раунд ${index + 1} из 3</span>
            <span>Копилка: <strong data-bank>${coinsLabel(bank)}</strong></span>
          </div>
          <p class="choice-prompt">Партнёр предлагает тебе ${coinsLabel(offer)} из ${POT}. Согласна?</p>
          <div class="choice-buttons">
            <button class="choice-button" type="button" data-accept>Беру</button>
            <button class="choice-button" type="button" data-decline>Отказ</button>
          </div>
          <p class="bart-outcome" data-outcome aria-live="polite">&nbsp;</p>
        </div>`;
      $("[data-accept]").addEventListener("click", () => answer(offer, true));
      $("[data-decline]").addEventListener("click", () => answer(offer, false));
    }

    function answer(offer: number, accepted: boolean) {
      if (locked) return;
      locked = true;
      if (accepted) bank += offer;
      rounds.push({ offer, accepted });
      // Принял → MAO ≤ offer (сужаем верх), отказал → MAO > offer (сужаем низ)
      range = accepted ? { ...range, hi: offer } : { ...range, lo: offer };
      $<HTMLButtonElement>("[data-accept]").disabled = true;
      $<HTMLButtonElement>("[data-decline]").disabled = true;
      $("[data-outcome]").textContent = accepted ? `Принято: +${coinsLabel(offer)}` : "Отказ: 0";
      timer = window.setTimeout(next, OUTCOME_MS);
    }

    function next() {
      locked = false;
      index += 1;
      if (index < 3) return receiverRound();
      if (stage === STAGE_RECEIVER) return computerRound_();
      return proposerRound();
    }

    function computerRound_() {
      stage = STAGE_COMPUTER;
      const offer = nextOffer(range); // та же пограничная сумма, но теперь "от компьютера"
      root.innerHTML = `
        <div class="choice-stage">
          <div class="bart-status">
            <span>Раунд от компьютера</span>
            <span>Копилка: <strong data-bank>${coinsLabel(bank)}</strong></span>
          </div>
          <p class="choice-prompt">Компьютер предлагает тебе ${coinsLabel(offer)} из ${POT}. Согласна?</p>
          <div class="choice-buttons">
            <button class="choice-button" type="button" data-accept>Беру</button>
            <button class="choice-button" type="button" data-decline>Отказ</button>
          </div>
          <p class="bart-outcome" data-outcome aria-live="polite">&nbsp;</p>
        </div>`;
      $("[data-accept]").addEventListener("click", () => answerComputer(offer, true));
      $("[data-decline]").addEventListener("click", () => answerComputer(offer, false));
    }

    function answerComputer(offer: number, accepted: boolean) {
      if (locked) return;
      locked = true;
      if (accepted) bank += offer;
      computerRound = { offer, accepted };
      $<HTMLButtonElement>("[data-accept]").disabled = true;
      $<HTMLButtonElement>("[data-decline]").disabled = true;
      $("[data-outcome]").textContent = accepted ? `Принято: +${coinsLabel(offer)}` : "Отказ: 0";
      timer = window.setTimeout(proposerRound, OUTCOME_MS);
    }

    function proposerRound() {
      stage = STAGE_PROPOSER;
      root.innerHTML = `
        <div class="amount-picker">
          <p class="choice-prompt">Теперь ты делишь ${POT} монет. Сколько предложишь партнёру?</p>
          <p class="amount-value" data-value>0</p>
          <input class="amount-range" type="range" min="0" max="${POT}" step="1" value="0" data-range />
          <div class="actions">
            <button class="button" type="button" data-submit>Предложить</button>
          </div>
        </div>`;
      const rangeInput = $<HTMLInputElement>("[data-range]");
      const value = $("[data-value]");
      rangeInput.addEventListener("input", () => {
        value.textContent = rangeInput.value;
      });
      $("[data-submit]").addEventListener("click", () => {
        proposerOffer = Number(rangeInput.value);
        finish();
      });
    }

    function finish() {
      const result: GameResult = {
        testId: "ultimatum",
        finishedAt: new Date().toISOString(),
        metrics: { ...computeUltimatumResult(rounds, computerRound, proposerOffer, bank) },
      };
      onFinish(result);
    }

    return () => {
      window.clearTimeout(timer);
    };
  },

  summarize(result) {
    const m = result.metrics;
    return {
      primary: {
        metric: "fairnessThreshold",
        label: "наименьшая доля от суммы (MAO), на которую ты согласилась",
        display: `${m.fairnessThreshold.toLocaleString("ru-RU")}%`,
        comparison: (p) =>
          m.looksRandom === 1
            ? "Ответы противоречивы — то, что ты приняла, ты же в другой раз отвергла. Похоже на случайные нажатия, этому результату лучше не доверять."
            : `Ты строже относишься к справедливости раздела, чем ${p}% участников.`,
      },
      details: [
        { label: "Заработано", value: coinsLabel(m.totalEarned) },
        { label: "Принято предложений", value: `${m.acceptedCount} из ${m.totalRounds}` },
        { label: "Сам предложил партнёру", value: `${coinsLabel(m.proposerOffer)} из 10` },
        ...(m.forgaveMachine === 1
          ? [{ label: "Заметили", value: "Несправедливость от машины ты простила — так делает большинство" }]
          : []),
      ],
      science: {
        text:
          "Это Ultimatum Game — методика Вернера Гюта и коллег. Рационально выгодно соглашаться на любую ненулевую долю: получить что-то лучше, чем ничего. Но на практике люди систематически отказываются от слишком неравных разделов — жертвуют своей выгодой, лишь бы наказать несправедливость, даже если это чужой незнакомый человек и разовая игра. Минимально приемлемое предложение (MAO), которое подобрала бисекция, — грубая мера твоего чувства справедливости. Отдельный раунд сравнивает, простишь ли ты то же самое предложение компьютеру, если не простила человеку. Это игровой тест, а не диагноз: он показывает, как ты действовала именно в этих раундах.",
        source:
          "Güth W., Schmittberger R., Schwarze B. (1982). An experimental analysis of ultimatum bargaining. Journal of Economic Behavior & Organization, 3(4), 367–388.",
      },
    };
  },
};
