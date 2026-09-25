import { getSample } from "../api";
import { pluralLabel } from "../plural";
import type { Game, GameResult } from "../types";
import {
  COLD_START_MIN_SAMPLE,
  ENDOWMENT,
  RECEIVER_GIVEN,
  ROUNDS,
  computeSenderRound,
  computeTrustResult,
  receiverBankDelta,
  resolvePartnerRate,
  senderBankDelta,
  type SenderRound,
} from "./trust.logic";

// Trust Game (Berg, Dickhaut & McCabe, 1995). 3 раунда отправителем + 1 раунд получателем.
// Партнёр в раундах отправителя — реальный ответ другого игрока из роли получателя
// (эндпоинт /sample), а не симуляция. Твой собственный ответ как получателя уходит
// в ту же базу и становится партнёром для будущих игроков.
// Текст исхода тут длиннее, чем в других играх ("Партнёр получил X и вернул Y...") —
// на прочтение нужно больше времени, чем стандартные 900мс
const OUTCOME_MS = 1800;

const coinsLabel = (n: number) => pluralLabel(n, ["монета", "монеты", "монет"]);

export const trust: Game = {
  mount(root, onFinish) {
    const rounds: SenderRound[] = [];
    let index = 0;
    let bank = 0;
    let locked = false;
    let timer: number | undefined;
    let receiverReturn = 0;

    root.innerHTML = `
      <div class="intro">
        <h1>Доверие</h1>
        <p class="lead">${ROUNDS} раунда ты отправитель: тебе дают ${coinsLabel(ENDOWMENT)}, можешь передать любую часть партнёру — сумма утроится, а партнёр сам решит, сколько вернуть.</p>
        <p>Потом ты сам окажешься в роли партнёра, которому прислали монеты.</p>
        <button class="button" type="button" data-start>Начать</button>
      </div>`;
    root.querySelector("[data-start]")!.addEventListener("click", play);

    function play() {
      senderRound();
    }

    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

    function senderRound() {
      // Партнёра запрашиваем сразу, чтобы к моменту клика "Передать" сеть уже успела ответить
      const partnerPromise = getSample("trust", "receiverReturn", COLD_START_MIN_SAMPLE);

      root.innerHTML = `
        <div class="amount-picker">
          <div class="bart-status">
            <span>Раунд ${index + 1} из ${ROUNDS}</span>
            <span>Копилка: <strong data-bank>${coinsLabel(bank)}</strong></span>
          </div>
          <p class="amount-value" data-value>0</p>
          <input class="amount-range" type="range" min="0" max="${ENDOWMENT}" step="1" value="0" data-range />
          <p class="hint">У тебя ${coinsLabel(ENDOWMENT)}. Сколько отправишь партнёру?</p>
          <div class="actions">
            <button class="button" type="button" data-submit>Передать</button>
          </div>
          <p class="bart-outcome" data-outcome aria-live="polite">&nbsp;</p>
        </div>`;

      const range = $<HTMLInputElement>("[data-range]");
      const value = $("[data-value]");
      range.addEventListener("input", () => {
        value.textContent = range.value;
      });
      $("[data-submit]").addEventListener("click", () => submitSender(partnerPromise));
    }

    async function submitSender(partnerPromise: ReturnType<typeof getSample>) {
      if (locked) return;
      locked = true;
      const range = $<HTMLInputElement>("[data-range]");
      $<HTMLButtonElement>("[data-submit]").disabled = true;

      const sent = Number(range.value);
      const sample = await partnerPromise;
      const { rate, fromResearch } = resolvePartnerRate(sample?.value ?? null);
      const round = computeSenderRound(sent, rate, fromResearch);
      bank += senderBankDelta(round);
      rounds.push(round);

      const note = fromResearch ? " (по данным исследований)" : "";
      $("[data-outcome]").textContent =
        sent === 0
          ? "Ты ничего не передала — партнёр остался ни при чём"
          : `Партнёр получил ${coinsLabel(round.tripled)} и вернул тебе ${coinsLabel(round.returned)}${note}`;
      timer = window.setTimeout(nextSender, OUTCOME_MS);
    }

    function nextSender() {
      index += 1;
      locked = false;
      if (index >= ROUNDS) return receiverRound();
      senderRound();
    }

    function receiverRound() {
      root.innerHTML = `
        <div class="amount-picker">
          <p class="choice-prompt">А теперь доверились тебе: тебе прислали ${coinsLabel(RECEIVER_GIVEN)}.</p>
          <p class="amount-value" data-value>0%</p>
          <input class="amount-range" type="range" min="0" max="100" step="5" value="0" data-range />
          <p class="hint">Сколько процентов вернёшь отправителю?</p>
          <div class="actions">
            <button class="button" type="button" data-submit>Вернуть</button>
          </div>
        </div>`;
      const range = $<HTMLInputElement>("[data-range]");
      const value = $("[data-value]");
      range.addEventListener("input", () => {
        value.textContent = `${range.value}%`;
      });
      $("[data-submit]").addEventListener("click", submitReceiver);
    }

    function submitReceiver() {
      const range = $<HTMLInputElement>("[data-range]");
      receiverReturn = Number(range.value);
      bank += receiverBankDelta(receiverReturn);
      finish();
    }

    function finish() {
      const result: GameResult = {
        testId: "trust",
        finishedAt: new Date().toISOString(),
        // Твой ответ как получателя (receiverReturn) — становится реальным партнёром для будущих игроков
        metrics: { ...computeTrustResult(rounds, receiverReturn, bank) },
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
        metric: "trustShare",
        label: "какую долю монет ты в среднем передавала незнакомому партнёру",
        display: `${m.trustShare.toLocaleString("ru-RU")}%`,
        comparison: (p) => `Ты доверяешь больше, чем ${p}% участников.`,
      },
      details: [
        { label: "Заработано всего", value: coinsLabel(m.totalEarned) },
        { label: "В среднем возвращали", value: coinsLabel(m.avgReturned) },
        {
          label: "Доверие",
          // Окупалось — если вернули больше, чем ты сама отправила (а не больше утроенной суммы)
          value: m.avgReturned > m.avgSent ? "окупалось" : "не окупалось",
        },
        { label: "Ты сам вернул", value: `${m.receiverReturn}%` },
      ],
      science: {
        text:
          "Это Trust Game (игра на доверие) Джойс Берг, Джона Дикхаута и Кевина Маккейба. Один человек решает, сколько отправить другому (сумма утраивается по пути), второй решает, сколько вернуть. Сколько ты отправляешь, не зная заранее, вернут ли тебе что-то, — прямая поведенческая мера доверия к незнакомцам, в отличие от простой готовности рисковать: здесь исход зависит от решения другого человека, а не от случая. Партнёром для тебя был реальный ответ другого игрока в роли получателя (или данные исследований, если игроков пока мало) — а твой собственный ответ как получателя точно так же стал партнёром для кого-то другого. Это игровой тест, а не диагноз: он показывает, как ты действовала именно в этих раундах.",
        source:
          "Berg J., Dickhaut J., McCabe K. (1995). Trust, Reciprocity, and Social History. Games and Economic Behavior, 10(1), 122–142.",
      },
    };
  },
};
