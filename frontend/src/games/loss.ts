import { bisectMid, roundTo } from "../bisect";
import { playClick, playFlip, playLose, playWin } from "../sound";
import type { Game, GameResult } from "../types";
import { CONTROL_R, L_OPTIONS, R_MAX, R_MIN, ROUNDS, computeLossResult, type LossOutcome } from "./loss.logic";

// Смешанные лотереи (Tom et al., 2007) + коэффициент неприятия потерь λ
// (Канеман, Тверски). Орёл +G, решка −L, G = r×L. Принял ставку с отношением r —
// значит λ ≤ r; отказался — λ > r. Бисекция r в [R_MIN, R_MAX] по логшкале сама
// находит твой λ за ROUNDS шагов, плюс 1 контрольный раунд против случайных нажатий.
const OUTCOME_MS = 900;
const FLIP_MS = 700;

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export const loss: Game = {
  mount(root, onFinish) {
    const rounds: LossOutcome[] = [];
    let index = 0;
    let bank = 0;
    let locked = false;
    let playing = false;
    let timer: number | undefined;
    let turn = 0;
    let range = { lo: R_MIN, hi: R_MAX };

    const totalSteps = ROUNDS + 1; // + контрольный раунд

    root.innerHTML = `
      <div class="intro">
        <h1>Ставка 50 на 50</h1>
        <p class="lead">${totalSteps} монеток. В каждом раунде — ставка: орёл — выигрыш, решка — проигрыш. «Бросаю» или «Пас».</p>
        <p>Шанс на орла и решку — всегда 50/50. Проигрыш и выигрыш каждый раз разные.</p>
        <button class="button" type="button" data-start>Начать</button>
      </div>`;
    root.querySelector("[data-start]")!.addEventListener("click", play);

    function play() {
      playing = true;
      round();
    }

    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

    function currentR(): number {
      return index < ROUNDS ? bisectMid(range, true) : CONTROL_R;
    }

    function currentL(): number {
      return L_OPTIONS[index % L_OPTIONS.length];
    }

    function round() {
      root.innerHTML = `
        <div class="bart">
          <div class="bart-status">
            <span data-round></span>
            <span>Копилка: <strong data-bank></strong></span>
          </div>
          <div class="bart-stage">
            <div class="coin">
              <div class="coin-inner">
                <svg class="coin-face coin-heads" viewBox="0 0 100 100" aria-hidden="true">
                  <circle class="coin-base" cx="50" cy="50" r="42"/>
                  <circle class="coin-rim" cx="50" cy="50" r="34" fill="none"/>
                  <ellipse class="coin-shine" cx="36" cy="34" rx="10" ry="16" transform="rotate(20 36 34)"/>
                </svg>
                <svg class="coin-face coin-tails" viewBox="0 0 100 100" aria-hidden="true">
                  <circle class="coin-base" cx="50" cy="50" r="42"/>
                  <circle class="coin-rim" cx="50" cy="50" r="34" fill="none"/>
                  <path class="coin-mark" d="M36 50h28M50 36v28"/>
                </svg>
              </div>
            </div>
            <p class="bart-outcome" data-outcome aria-live="polite">&nbsp;</p>
          </div>
          <p class="bart-pot">Ставка: <strong data-pot></strong></p>
          <div class="actions">
            <button class="button" type="button" data-accept>Бросаю</button>
            <button class="button button-quiet" type="button" data-decline>Пас</button>
          </div>
          <p class="hint">Пробел — бросаю, Enter — пас</p>
        </div>`;
      root.querySelector("[data-accept]")!.addEventListener("click", accept);
      root.querySelector("[data-decline]")!.addEventListener("click", decline);
      update();
    }

    function update() {
      const L = currentL();
      const G = Math.round(currentR() * L);
      $("[data-round]").textContent = `Раунд ${index + 1} из ${totalSteps}`;
      $("[data-bank]").textContent = rub(bank);
      $("[data-pot]").textContent = `Орёл: +${rub(G)} / решка: −${rub(L)}`;
      $<HTMLButtonElement>("[data-accept]").disabled = locked;
      $<HTMLButtonElement>("[data-decline]").disabled = locked;
    }

    function accept() {
      if (locked) return;
      locked = true;
      update();
      const won = Math.random() < 0.5;
      turn += 3 * 360 + (won ? 0 : 180);
      $<HTMLElement>(".coin-inner").style.setProperty("--turn", `${turn}deg`);
      playFlip();
      timer = window.setTimeout(() => {
        const L = currentL();
        const G = Math.round(currentR() * L);
        if (won) {
          bank += G;
          playWin();
        } else {
          bank -= L;
          playLose();
        }
        rounds.push({ r: currentR(), accepted: true, control: index >= ROUNDS });
        narrow(true);
        showOutcome("accepted", won ? `Орёл! +${rub(G)}` : `Решка. −${rub(L)}`);
      }, FLIP_MS);
    }

    function decline() {
      if (locked) return;
      playClick();
      rounds.push({ r: currentR(), accepted: false, control: index >= ROUNDS });
      narrow(false);
      showOutcome("declined", "Пас — 0 ₽");
    }

    /** Сужаем интервал бисекции по ответу: принял → λ ≤ r (hi = r), отказал → λ > r (lo = r) */
    function narrow(accepted: boolean) {
      if (index >= ROUNDS) return; // контрольный раунд не входит в бисекцию
      const r = currentR();
      if (accepted) range = { ...range, hi: r };
      else range = { ...range, lo: r };
    }

    function showOutcome(kind: "accepted" | "declined", text: string) {
      locked = true;
      update();
      $(".bart-stage").classList.add(`is-${kind}`);
      $("[data-outcome]").textContent = text;
      timer = window.setTimeout(next, OUTCOME_MS);
    }

    function next() {
      index += 1;
      locked = false;
      if (index >= totalSteps) return finish();
      $(".bart-stage").classList.remove("is-accepted", "is-declined");
      round();
    }

    function finish() {
      playing = false;
      const result: GameResult = {
        testId: "loss",
        finishedAt: new Date().toISOString(),
        metrics: { ...computeLossResult(rounds, bank) },
      };
      onFinish(result);
    }

    function onKey(e: KeyboardEvent) {
      if (!playing || e.repeat) return;
      if ((e.target as Element).tagName === "BUTTON") return;
      if (e.code === "Space") {
        e.preventDefault();
        accept();
      } else if (e.code === "Enter") {
        e.preventDefault();
        decline();
      }
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  },

  summarize(result) {
    const m = result.metrics;
    // Деньги в результатах округляются до 10 ₽ — это про читаемость текста,
    // не про точность самого λ (тот считается по несокращённым ставкам)
    const feelsLike = roundTo(m.lambda * 100, 10);
    return {
      primary: {
        metric: "lambda",
        label: "твой коэффициент неприятия потерь λ",
        display: `${m.lambda.toLocaleString("ru-RU")}×`,
        comparison: (p) =>
          m.looksRandom === 1
            ? "Ответы противоречивы — похоже на случайные нажатия, этому результату лучше не доверять."
            : `Ты избегаешь потерь сильнее, чем ${p}% участников.`,
      },
      details: [
        { label: "Потеря 100 ₽ ощущается как выигрыш", value: rub(feelsLike) },
        { label: "У большинства людей λ около", value: "2×" },
        { label: "Принято ставок", value: `${m.acceptedCount} из ${m.totalRounds}` },
        { label: "Заработано", value: rub(roundTo(m.totalEarned, 10)) },
      ],
      science: {
        text:
          "Это смешанные лотереи (орёл — выигрыш, решка — проигрыш, 50/50) — методика в духе Sabrina Tom и коллег, а также классического коэффициента неприятия потерь λ из теории перспектив Канемана и Тверски. Игра сама подбирает следующую ставку методом бисекции, сужая диапазон вокруг твоего личного порога λ — соотношения, при котором выигрыш и проигрыш ощущаются равнозначными. У большинства людей λ около 2: потеря воспринимается вдвое сильнее равного по размеру выигрыша. Это игровой тест, а не диагноз: он показывает, как ты действовала именно в этих раундах.",
        source:
          "Tom S. M., Fox C. R., Trepel C., Poldrack R. A. (2007). The neural basis of loss aversion in decision-making under risk. Science, 315(5811), 515–518.",
      },
    };
  },
};
