import { TESTS, minutesLabel } from "../tests";

export function renderHome(root: HTMLElement) {
  const tiles = TESTS.map((t) => {
    const inner = `
      <span class="tile-glyph">${t.glyph}</span>
      <h2 class="tile-title">${t.title}</h2>
      <p class="tile-question">${t.question}</p>
      <span class="tile-meta">${t.load ? minutesLabel(t.minutes) : "Скоро"}</span>`;
    return t.load
      ? `<a class="tile tile-live" href="/test/${t.id}" data-link style="--tint:${t.tint}">${inner}</a>`
      : `<div class="tile tile-soon" style="--tint:${t.tint}" aria-disabled="true">${inner}</div>`;
  }).join("");

  root.innerHTML = `
    <section class="page">
      <header class="hero">
        <h1>Как ты принимаешь решения?</h1>
        <p>Короткие игры по мотивам классических экспериментов психологии. Результаты сохраняются в твоём профиле, и их можно сравнить с другими участниками.</p>
      </header>
      <div class="tiles">${tiles}</div>
    </section>`;
}
