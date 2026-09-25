import { playBalloonPop, playBalloonRub } from "../sound";
import { pluralLabel } from "../plural";
import type { Game, GameResult } from "../types";
import {
  BALLOONS,
  MAX_PUMPS,
  REWARD,
  computeBalloonResult,
  generateExplosionPoints,
  type BalloonRound,
} from "./balloon.logic";

const OUTCOME_MS = 900;
const coins = (n: number) => pluralLabel(n, ["монета", "монеты", "монет"]);

export const balloon: Game = {
  mount(root, onFinish) {
    const points = generateExplosionPoints();
    const rounds: BalloonRound[] = [];
    let index = 0;
    let pumps = 0;
    let bank = 0;
    let locked = false;
    let playing = false;
    let timer: number | undefined;

    root.innerHTML = `
      <div class="intro">
        <h1>Шарик</h1>
        <p class="lead">Перед тобой ${BALLOONS} шариков. Каждое нажатие накачивает шарик и добавляет в него ${coins(REWARD)}.</p>
        <p>Деньги можно в любой момент забрать в копилку. Если шарик лопнет раньше, всё, что было в нём, сгорит. Каждый шарик может лопнуть на любом нажатии.</p>
        <button class="button" type="button" data-start>Начать</button>
      </div>`;
    root.querySelector("[data-start]")!.addEventListener("click", play);

    function play() {
      playing = true;
      root.innerHTML = `
        <div class="bart">
          <div class="bart-status">
            <span data-round></span>
            <span>Копилка: <strong data-bank></strong></span>
          </div>
          <div class="bart-stage">
            <svg class="balloon" viewBox="0 0 200 260" aria-hidden="true">
              <path class="balloon-string" d="M100 200c-8 20 8 35 0 58"/>
              <g class="balloon-body">
                <ellipse cx="100" cy="105" rx="70" ry="86"/>
                <path d="M91 189h18l-9 12z"/>
                <ellipse class="balloon-shine" cx="72" cy="70" rx="11" ry="22" transform="rotate(20 72 70)"/>
              </g>
            </svg>
            <p class="bart-outcome" data-outcome aria-live="polite"></p>
          </div>
          <p class="bart-pot">В шарике: <strong data-pot></strong></p>
          <div class="actions">
            <button class="button" type="button" data-pump>Накачать</button>
            <button class="button button-quiet" type="button" data-collect>Забрать деньги</button>
          </div>
          <p class="hint">Пробел — накачать, Enter — забрать</p>
        </div>`;
      root.querySelector("[data-pump]")!.addEventListener("click", pump);
      root.querySelector("[data-collect]")!.addEventListener("click", collect);
      root.querySelector(".balloon")!.addEventListener("click", pump);
      update();
    }

    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

    function update() {
      $("[data-round]").textContent = `Шарик ${index + 1} из ${BALLOONS}`;
      $("[data-bank]").textContent = coins(bank);
      $("[data-pot]").textContent = coins(pumps * REWARD);
      $<SVGElement>(".balloon").style.setProperty("--s", String(0.3 + (0.7 * pumps) / MAX_PUMPS));
      $<HTMLButtonElement>("[data-pump]").disabled = locked;
      $<HTMLButtonElement>("[data-collect]").disabled = locked || pumps === 0;
    }

    function pump() {
      if (locked) return;
      pumps += 1;
      if (pumps >= points[index]) {
        playBalloonPop();
        rounds.push({ pumps, exploded: true });
        showOutcome("popped", `Лопнул! Сгорело ${coins(pumps * REWARD)}`);
      } else {
        playBalloonRub(pumps, MAX_PUMPS);
        update();
      }
    }

    function collect() {
      if (locked || pumps === 0) return;
      bank += pumps * REWARD;
      rounds.push({ pumps, exploded: false });
      showOutcome("collected", `+${coins(pumps * REWARD)} в копилку`);
    }

    function showOutcome(kind: "popped" | "collected", text: string) {
      locked = true;
      update();
      $(".bart-stage").classList.add(`is-${kind}`);
      $("[data-outcome]").textContent = text;
      timer = window.setTimeout(next, OUTCOME_MS);
    }

    function next() {
      index += 1;
      pumps = 0;
      locked = false;
      if (index >= BALLOONS) return finish();
      $(".bart-stage").classList.remove("is-popped", "is-collected");
      $("[data-outcome]").textContent = "";
      update();
    }

    function finish() {
      playing = false;
      const m = computeBalloonResult(rounds);
      bank = m.totalEarned;
      const result: GameResult = {
        testId: "balloon",
        finishedAt: new Date().toISOString(),
        metrics: { ...m },
      };
      onFinish(result);
    }

    function onKey(e: KeyboardEvent) {
      if (!playing || e.repeat) return;
      // На кнопке в фокусе браузер сам нажмёт её — не дублируем
      if ((e.target as Element).tagName === "BUTTON") return;
      if (e.code === "Space") {
        e.preventDefault();
        pump();
      } else if (e.code === "Enter") {
        e.preventDefault();
        collect();
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
    const strategyPumps = MAX_PUMPS / 2;
    return {
      primary: {
        metric: "adjustedPumps",
        label: "нажатий в среднем на шариках, которые не лопнули",
        display: m.adjustedPumps.toLocaleString("ru-RU"),
        comparison: (p) =>
          m.looksRandom === 1
            ? "Ты ни разу не накачала шарик — похоже на случайные нажатия, этому результату лучше не доверять."
            : `Ты рискуешь больше, чем ${p}% участников.`,
      },
      details: [
        { label: "Заработано", value: coins(m.totalEarned) },
        { label: "Лопнуло шариков", value: `${m.explosions} из ${BALLOONS}` },
        { label: "Самая выгодная стратегия", value: `около ${pluralLabel(strategyPumps, ["нажатие", "нажатия", "нажатий"])}` },
        ...(m.lowAccuracy === 1 ? [{ label: "Точность", value: "низкая — все шарики лопнули" }] : []),
      ],
      science: {
        text:
          "Это Balloon Analogue Risk Task (BART), методика Карла Лежуэ и коллег. Среднее число нажатий на уцелевших шариках связано с рискованным поведением в жизни: курением, азартными играми, безрассудным вождением. Это игровой тест, а не диагноз: он показывает, как ты действовал именно в этой игре.",
        source:
          "Lejuez C. W. et al. (2002). Evaluation of a behavioral measure of risk taking: The Balloon Analogue Risk Task (BART). Journal of Experimental Psychology: Applied, 8(2), 75–84.",
      },
    };
  },
};
