import { plural } from "../plural";
import type { Game, GameResult } from "../types";
import {
  BASE,
  DECKS,
  DECK_SIZE,
  DRAWS,
  STARTING_BANK,
  computeDecksResult,
  shuffled,
  type DeckId,
  type Draw,
} from "./decks.logic";

// Упрощённая Iowa Gambling Task. 4 колоды, у каждой своя базовая награда
// и своя схема штрафов за 10 карт. A и B — "плохие", C и D — "хорошие".
// A и C штрафуют часто и по чуть-чуть, B и D — редко, но много.
const FLIP_MS = 400;
// Короткий дебаунс — только чтобы случайный двойной клик/тап не засчитался как
// два хода (B12), а не чтобы замедлить игру: быстро тянуть разные карты можно и дальше
const CLICK_DEBOUNCE_MS = 250;

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

export const decks: Game = {
  mount(root, onFinish) {
    const sequences: Record<DeckId, number[]> = {
      A: shuffled(BASE.A),
      B: shuffled(BASE.B),
      C: shuffled(BASE.C),
      D: shuffled(BASE.D),
    };
    const cursor: Record<DeckId, number> = { A: 0, B: 0, C: 0, D: 0 };
    // Позиции и подписи колод перемешиваются между игроками — задача известна,
    // но нельзя подсказать другому "бери третью слева"
    const displayOrder = shuffled(DECKS);
    const history: Draw[] = [];
    let bank = STARTING_BANK;
    let flipTimer: number | undefined;
    let debounceTimer: number | undefined;
    let debounced = false;

    root.innerHTML = `
      <div class="intro">
        <h1>Четыре колоды</h1>
        <p class="lead">Перед тобой ${DECKS.length} колоды карт. Тяни карты — каждая карта приносит деньги в копилку, но иногда с картой приходит штраф.</p>
        <p>Всего у тебя будет ${DRAWS} тяг. Одни колоды в среднем выгоднее других — но заранее это не известно, придётся понять на опыте.</p>
        <button class="button" type="button" data-start>Начать</button>
      </div>`;
    root.querySelector("[data-start]")!.addEventListener("click", play);

    function play() {
      root.innerHTML = `
        <div class="decks">
          <div class="bart-status">
            <span data-round></span>
            <span>Копилка: <strong data-bank></strong></span>
          </div>
          <div class="deck-grid">
            ${displayOrder.map((id, i) => `<button class="deck-card" type="button" data-deck="${id}">Колода ${i + 1}</button>`).join("")}
          </div>
          <p class="bart-outcome" data-outcome aria-live="polite">&nbsp;</p>
        </div>`;
      displayOrder.forEach((id) => {
        root.querySelector(`[data-deck="${id}"]`)!.addEventListener("click", () => draw(id));
      });
      update();
    }

    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

    function update() {
      $("[data-round]").textContent = `Тяга ${history.length} из ${DRAWS}`;
      $("[data-bank]").textContent = rub(bank);
    }

    function draw(id: DeckId) {
      // Следующий ход доступен почти сразу — только короткий дебаунс от случайного
      // двойного клика/тапа (B12), плюс короткая вспышка на самой карте
      if (debounced) return;
      debounced = true;
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => (debounced = false), CLICK_DEBOUNCE_MS);

      const amount = sequences[id][cursor[id] % DECK_SIZE];
      cursor[id] += 1;
      bank += amount;
      history.push({ deck: id, amount });
      update();

      const btn = $<HTMLButtonElement>(`[data-deck="${id}"]`);
      const outcome = $("[data-outcome]");
      const kind = amount >= 0 ? "won" : "lost";
      btn.classList.add(`is-${kind}`);
      outcome.classList.remove("is-won", "is-lost");
      outcome.classList.add(`is-${kind}`);
      window.clearTimeout(flipTimer);
      flipTimer = window.setTimeout(() => btn.classList.remove("is-won", "is-lost"), FLIP_MS);
      outcome.textContent = amount >= 0 ? `+${rub(amount)}` : `−${rub(-amount)}`;

      // Если вкладку закрыли/ушли раньше DRAWS тяг — finish() просто не вызовется,
      // результат не сохранится, ось на радаре останется "не пройдено" (B5)
      if (history.length >= DRAWS) finish();
    }

    function finish() {
      const result: GameResult = {
        testId: "decks",
        finishedAt: new Date().toISOString(),
        metrics: { ...computeDecksResult(history, bank) },
      };
      onFinish(result);
    }

    return () => {
      window.clearTimeout(flipTimer);
      window.clearTimeout(debounceTimer);
    };
  },

  summarize(result) {
    const m = result.metrics;
    return {
      primary: {
        metric: "goodShareRecent",
        label: "доля выгодных колод в последних 20 картах",
        display: `${m.goodShareRecent.toLocaleString("ru-RU")}%`,
        comparison: (p) => `Ты учишься на опыте быстрее, чем ${p}% участников.`,
      },
      details: [
        { label: "Заработано", value: rub(m.totalEarned) },
        { label: "Выгодных тяг всего", value: `${m.goodPicks} из ${m.totalDraws}` },
        {
          label: "Изменение доли выгодных ко второй половине",
          value: `${m.learningShift > 0 ? "+" : ""}${m.learningShift.toLocaleString("ru-RU")} ${plural(Math.abs(m.learningShift), ["процентный пункт", "процентных пункта", "процентных пунктов"])}`,
        },
      ],
      science: {
        text:
          "Это упрощённая версия Iowa Gambling Task — методики Антонио Дамасио и коллег. В оригинале две колоды выгодны в долгую (частые небольшие выигрыши перекрывают редкие штрафы), а две — убыточны, несмотря на то что отдельные карты в них выглядят заманчиво. Здоровые испытуемые постепенно смещают выбор к выгодным колодам уже после нескольких десятков карт — часто раньше, чем могут внятно объяснить почему. Пациенты с повреждением префронтальной коры продолжают тянуть из убыточных колод даже после многих штрафов. Это игровой тест, а не диагноз: он показывает, как ты действовала именно в этой игре.",
        source:
          "Bechara A., Damasio A. R., Damasio H., Anderson S. W. (1994). Insensitivity to future consequences following damage to human prefrontal cortex. Cognition, 50(1-3), 7–15.",
      },
    };
  },
};
