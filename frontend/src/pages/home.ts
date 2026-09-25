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
      <section class="about-card">
        <div class="about-text">
          <h2>О проекте</h2>
          <p>Risky You — это не тест на IQ и не гороскоп. Это ${TESTS.length} маленьких игр, каждая — переупакованный классический эксперимент из поведенческой экономики и психологии: та же механика, на которой учёные измеряют неприятие потерь, доверие к незнакомцам или склонность поддаваться первому импульсу.</p>
          <p>Ты играешь пару минут — и получаешь не диагноз, а честную цифру на понятной шкале, плюс сравнение с другими участниками. Никакой регистрации: результаты хранятся у тебя в браузере.</p>
        </div>
        <img class="about-art" src="/art/intro-balloon-girl.png" alt="" width="480" height="640" loading="lazy" />
      </section>
      <div class="tiles">${tiles}</div>
    </section>`;
}
