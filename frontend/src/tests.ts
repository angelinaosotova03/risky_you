import { tileIconPlaceholder } from "./art";
import type { TestMeta } from "./types";

const svg = (body: string) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/** Каталог тестов. Чтобы подключить новый — добавь load. */
export const TESTS: TestMeta[] = [
  {
    id: "balloon",
    title: "Шарик",
    question: "Сколько раз ты накачаешь шарик, пока он не лопнул?",
    minutes: 3,
    tint: "#c64c60",
    glyph: svg('<ellipse cx="24" cy="19" rx="12" ry="14" fill="currentColor"/><path d="M24 33c-2 4 2 6 0 11"/>'),
    load: () => import("./games/balloon").then((m) => m.balloon),
  },
  {
    id: "loss",
    title: "Ставка 50 на 50",
    question: "Как сильно ты боишься потерь?",
    minutes: 2,
    tint: "#9A66BE",
    glyph: svg('<circle cx="24" cy="24" r="15"/><path d="M24 9v30"/><path d="M24 9a15 15 0 0 1 0 30" fill="currentColor"/>'),
    load: () => import("./games/loss").then((m) => m.loss),
  },
  {
    id: "patience",
    title: "Сейчас или потом",
    question: "Сколько ты готов ждать ради большего?",
    minutes: 2,
    tint: "#009A7B",
    glyph: svg('<path d="M14 8h20M14 40h20M16 8c0 10 16 10 16 16s-16 6-16 16M32 8c0 10-16 10-16 16s16 6 16 16"/>'),
    load: () => import("./games/patience").then((m) => m.patience),
  },
  {
    id: "decks",
    title: "Четыре колоды",
    question: "Как быстро ты учишься на опыте?",
    minutes: 5,
    tint: "#0091B9",
    glyph: svg('<rect x="8" y="14" width="18" height="26" rx="3"/><rect x="22" y="8" width="18" height="26" rx="3" fill="currentColor"/>'),
    load: () => import("./games/decks").then((m) => m.decks),
  },
  {
    id: "trust",
    title: "Доверие",
    question: "Насколько ты доверяешь незнакомцам?",
    minutes: 2,
    tint: "#BF5884",
    // Иконка по ТЗ — "рука, протягивающая монету"; пока не нарисована, показываем заглушку
    glyph: tileIconPlaceholder("Доверие", "#BF5884"),
    load: () => import("./games/trust").then((m) => m.trust),
  },
  {
    id: "ultimatum",
    title: "Ультиматум",
    question: "Где проходит твоя граница справедливости?",
    minutes: 2,
    tint: "#A67700",
    // Иконка по ТЗ — "плитка шоколада, разломанная неровно"; пока не нарисована, показываем заглушку
    glyph: tileIconPlaceholder("Ультиматум", "#A67700"),
    load: () => import("./games/ultimatum").then((m) => m.ultimatum),
  },
  {
    id: "beauty",
    title: "Две трети",
    question: "На сколько шагов вперёд ты думаешь за других?",
    minutes: 1,
    tint: "#567CD3",
    // Иконка по ТЗ — "мишень с точками-догадками"; пока не нарисована, показываем заглушку
    glyph: tileIconPlaceholder("Две трети", "#567CD3"),
    load: () => import("./games/beauty").then((m) => m.beauty),
  },
  {
    id: "reflection",
    title: "Задачи-ловушки",
    question: "Проверяешь ли ты свою первую мысль?",
    minutes: 2,
    tint: "#649029",
    // Иконка по ТЗ — "мышеловка с сыром"; пока не нарисована, показываем заглушку
    glyph: tileIconPlaceholder("Задачи-ловушки", "#649029"),
    load: () => import("./games/reflection").then((m) => m.reflection),
  },
];

export const findTest = (id: string) => TESTS.find((t) => t.id === id);

export function minutesLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} минута`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} минуты`;
  return `${n} минут`;
}
