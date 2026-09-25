import { averageMetric } from "../accuracy";
import { getNorm, postResult } from "../api";
import { getResults, saveResult } from "../storage";
import { findTest, TESTS } from "../tests";
import type { Game, GameResult, TestMeta } from "../types";

function nextPlayableId(currentId: string): string {
  const playable = TESTS.filter((t) => t.load);
  const idx = playable.findIndex((t) => t.id === currentId);
  return playable[(idx + 1) % playable.length]?.id ?? currentId;
}

export function renderTest(root: HTMLElement, id: string): () => void {
  const meta = findTest(id);
  let unmount: (() => void) | undefined;
  let active = true;

  if (!meta || !meta.load) {
    root.innerHTML = `
      <section class="page narrow">
        <h1>${meta ? meta.title : "Тест не найден"}</h1>
        <p class="lead">${meta ? "Этот тест ещё в разработке." : "Такого теста нет в каталоге."}</p>
        <a class="button" href="/" data-link>Выбрать другой тест</a>
      </section>`;
    return () => {};
  }

  root.innerHTML = `<section class="page narrow game-page" style="--tint:${meta.tint}"><div class="game-root"></div></section>`;
  const gameRoot = root.querySelector<HTMLElement>(".game-root")!;

  meta.load().then((game) => {
    if (!active) return;
    unmount = game.mount(gameRoot, (result) => {
      saveResult(result);
      void showResult(gameRoot, meta, game, result);
    });
  });

  return () => {
    active = false;
    unmount?.();
  };
}

async function showResult(root: HTMLElement, meta: TestMeta, game: Game, result: GameResult) {
  const s = game.summarize(result);
  const details = s.details.map((d) => `<div><dt>${d.label}</dt><dd>${d.value}</dd></div>`).join("");

  root.innerHTML = `
    <div class="result">
      <p class="result-kicker">${meta.title}</p>
      <p class="result-value">${s.primary.display}</p>
      <p class="result-label">${s.primary.label}</p>
      <p class="result-compare" aria-live="polite">Сравниваем с другими участниками…</p>
      <dl class="result-details">${details}</dl>
      <aside class="science">
        <h2>Откуда этот тест</h2>
        <p>${s.science.text}</p>
        <p class="source">${s.science.source}</p>
      </aside>
      <div class="actions">
        <button class="button button-quiet" type="button" data-share disabled>Поделиться</button>
        <a class="button" href="/test/${nextPlayableId(meta.id)}" data-link>Следующая игра</a>
        <a class="button button-quiet" href="/test/${meta.id}" data-link>Пройти ещё раз (точнее)</a>
      </div>
    </div>`;

  const compare = root.querySelector(".result-compare")!;
  const shareBtn = root.querySelector<HTMLButtonElement>("[data-share]")!;
  let sharePhrase = `Мой результат в «${meta.title}»: ${s.primary.display}`;

  shareBtn.addEventListener("click", async () => {
    shareBtn.disabled = true;
    shareBtn.textContent = "Готовим картинку…";
    try {
      const { generateShareCard, downloadDataUrl } = await import("../shareCard");
      const dataUrl = await generateShareCard(sharePhrase);
      downloadDataUrl(dataUrl, "risky-you.png");
    } finally {
      shareBtn.disabled = false;
      shareBtn.textContent = "Поделиться";
    }
  });

  await postResult(result);
  // Тот же процентиль, что видит точка на радаре в профиле: если это не первая попытка,
  // сравниваем усреднённое по всем попыткам значение, а не только последнюю (см. accuracy.ts)
  const averaged = averageMetric(getResults(), meta.id, s.primary.metric);
  const rawValue = averaged?.value ?? result.metrics[s.primary.metric];
  const norm = await getNorm(meta.id, s.primary.metric, rawValue);
  if (!norm) {
    compare.textContent = "Сравнение с другими сейчас недоступно, но результат сохранён в профиле.";
  } else if (norm.percentile === null) {
    compare.textContent = `Пока участников слишком мало для сравнения (${norm.sample_size}). Загляни позже.`;
  } else {
    sharePhrase = s.primary.comparison(Math.round(norm.percentile));
    compare.textContent = sharePhrase;
  }
  shareBtn.disabled = false;
}
