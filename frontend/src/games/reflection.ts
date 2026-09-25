import { plural } from "../plural";
import type { Game, GameResult } from "../types";
import {
  classifyAnswer,
  computeReflectionResult,
  pickQuestions,
  QUESTIONS_PER_GAME,
  SOFT_TIMER_S,
  type AnswerCategory,
} from "./reflection.logic";

// Cognitive Reflection Test (Frederick, 2005) и CRT-2 (Thomson, Oppenheimer, 2016).
// У каждой задачи есть быстрый, интуитивно напрашивающийся, но неверный ответ —
// и правильный, до которого нужно додуматься, притормозив первую мысль.
// Пул из 12+ задач, каждый раз случайные 3 — классические "бита и мяч", "станки"
// и "кувшинки" не используются, их знает весь интернет.
// Поле — текстовое, а не числовое: ответ вида "6 детей" или "шесть" должен
// засчитываться так же, как "6" (нормализация в reflection.logic.ts).
const OUTCOME_MS = 1500;

export const reflection: Game = {
  mount(root, onFinish) {
    const questions = pickQuestions(QUESTIONS_PER_GAME);
    const categories: AnswerCategory[] = [];
    let index = 0;
    let locked = false;
    let timer: number | undefined;
    let softTicker: number | undefined;

    root.innerHTML = `
      <div class="intro">
        <h1>Задачи-ловушки</h1>
        <p class="lead">${QUESTIONS_PER_GAME} коротких задачки. У каждой есть ответ, который приходит в голову первым, — и он почти всегда неверный. Проверь свою первую мысль, прежде чем отвечать.</p>
        <button class="button" type="button" data-start>Начать</button>
      </div>`;
    root.querySelector("[data-start]")!.addEventListener("click", play);

    function play() {
      round();
    }

    const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

    function round() {
      const q = questions[index];
      let remaining = SOFT_TIMER_S;
      root.innerHTML = `
        <div class="choice-stage">
          <div class="bart-status">
            <span>Вопрос ${index + 1} из ${questions.length}</span>
            <span data-timer>${remaining} с</span>
          </div>
          <p class="choice-prompt">${q.text}</p>
          <input class="number-field" type="text" inputmode="numeric" autocomplete="off" data-answer />
          <div class="actions" style="justify-content:center; margin-top:1rem;">
            <button class="button" type="button" data-submit>Ответить</button>
          </div>
          <p class="bart-outcome" data-outcome aria-live="polite">&nbsp;</p>
        </div>`;
      $("[data-submit]").addEventListener("click", () => submit(false));
      $<HTMLInputElement>("[data-answer]").addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit(false);
      });

      // Мягкий таймер: виден, ничего не блокирует до истечения, а по истечении
      // засчитывает пустой ответ и продолжает игру (см. B10)
      softTicker = window.setInterval(() => {
        remaining = Math.max(0, remaining - 1);
        const el = root.querySelector("[data-timer]");
        if (el) el.textContent = `${remaining} с`;
        if (remaining <= 0) submit(true);
      }, 1000);
    }

    function submit(isTimeout: boolean) {
      if (locked) return;
      const input = $<HTMLInputElement>("[data-answer]");
      if (!isTimeout && input.value.trim() === "") return;
      locked = true;
      window.clearInterval(softTicker);

      const q = questions[index];
      const category = isTimeout ? "other" : classifyAnswer(input.value, q);
      categories.push(category);

      $<HTMLButtonElement>("[data-submit]").disabled = true;
      input.disabled = true;
      $("[data-outcome]").textContent =
        category === "correct"
          ? "Верно!"
          : category === "trap"
          ? `Это типичная ловушка — правильный ответ ${q.correct}`
          : isTimeout
          ? `Время вышло — правильный ответ ${q.correct}`
          : `Неверно — правильный ответ ${q.correct}`;
      timer = window.setTimeout(next, OUTCOME_MS);
    }

    function next() {
      index += 1;
      locked = false;
      if (index >= questions.length) return finish();
      round();
    }

    function finish() {
      const result: GameResult = {
        testId: "reflection",
        finishedAt: new Date().toISOString(),
        metrics: { ...computeReflectionResult(categories) },
      };
      onFinish(result);
    }

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(softTicker);
    };
  },

  summarize(result) {
    const m = result.metrics;
    return {
      primary: {
        metric: "reflectionScore",
        label: "доля задач, где ты не поддалась первому интуитивному ответу",
        display: `${m.reflectionScore.toLocaleString("ru-RU")}%`,
        comparison: (p) => `Ты внимательнее проверяешь первую мысль, чем ${p}% участников.`,
      },
      details: [
        { label: "Правильных ответов", value: `${m.correctCount} из ${m.totalRounds}` },
        { label: "Попалась в типичную ловушку", value: `${m.trapCount} ${plural(m.trapCount, ["раз", "раза", "раз"])}` },
      ],
      science: {
        text:
          "Это Cognitive Reflection Test (CRT) психолога Шейна Фредерика и его развитие CRT-2 (Thomson, Oppenheimer). Каждая задача сконструирована так, чтобы у неё был быстрый, интуитивно убедительный, но неверный ответ — и правильный, до которого можно дойти, только притормозив и пересчитав. Тест измеряет не интеллект как таковой, а склонность подвергать сомнению собственную первую реакцию — эта черта связана с меньшей подверженностью когнитивным искажениям и более взвешенными решениями в финансах и повседневной жизни. Это игровой тест, а не диагноз: он показывает, как ты рассуждала именно в этих трёх задачах.",
        source:
          "Thomson K. S., Oppenheimer D. M. (2016). Investigating an alternate form of the Cognitive Reflection Test. Judgment and Decision Making, 11(1), 99–113.",
      },
    };
  },
};
