import { loadAxes, type AxisPoint } from "../radar-data";
import { getResults } from "../storage";
import { TESTS } from "../tests";
import type { GameResult } from "../types";

// Полигон "Ты" рисуем только когда пройдено хотя бы столько тестов —
// на 1-2 точках фигура ничего не показывает, только вводит в заблуждение
const MIN_GAMES_FOR_POLYGON = 3;

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

// ---------- Лепестковая диаграмма ----------

// SIZE больше RADIUS ровно настолько, чтобы под подписи хватало места, но не более —
// на телефоне вся картинка и так упирается в ширину экрана, и чем больше SIZE относительно
// RADIUS, тем мельче выглядит сам график относительно общей площади рисунка
const SIZE = 420;
const CENTER = SIZE / 2;
const RADIUS = 105;
const LABEL_GAP = 13;
const LABEL_LINE_HEIGHT = 13;
const LEVELS = [25, 50, 75, 100];
const AVERAGE_LEVEL = 50;

/** Длинные подписи из нескольких слов переносим на две строки, чтобы не вылезали за края */
function wrapLabel(label: string): string[] {
  const words = label.split(" ");
  if (words.length < 2) return [label];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

interface Point {
  x: number;
  y: number;
  angle: number;
}

function polarPoint(i: number, n: number, value: number): Point {
  const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
  const r = RADIUS * (value / 100);
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle), angle };
}

const fmt = (p: Point) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

function renderRadar(axes: AxisPoint[], playedCount: number): string {
  const n = axes.length;

  const rings = LEVELS.map((level) => {
    const pts = axes.map((_, i) => fmt(polarPoint(i, n, level))).join(" ");
    return `<polygon points="${pts}" class="radar-ring" />`;
  }).join("");

  const spokes = axes
    .map((axis, i) => {
      const p = polarPoint(i, n, 100);
      const empty = axis.value === null ? " radar-spoke-empty" : "";
      return `<line x1="${CENTER}" y1="${CENTER}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="radar-spoke${empty}" />`;
    })
    .join("");

  const averagePts = axes.map((_, i) => fmt(polarPoint(i, n, AVERAGE_LEVEL))).join(" ");

  // Точки "Ты": пропущенные (нет данных) оси просто не входят в замкнутый контур.
  // Оценочные точки (estimated) рисуем полыми — честно показываем, что это не настоящий процентиль.
  // Полигон рисуем только когда пройдено 3+ теста — на 1-2 точках фигура вводит в заблуждение.
  const known = axes.map((a, i) =>
    a.value === null ? null : { ...polarPoint(i, n, a.value), estimated: a.estimated, attempts: a.attempts },
  );
  const youPts = known
    .filter((p): p is Point & { estimated: boolean; attempts: number } => p !== null)
    .map(fmt)
    .join(" ");
  const showPolygon = playedCount >= MIN_GAMES_FOR_POLYGON;
  const dots = known
    .map((p) => {
      if (!p) return "";
      // После одного прохождения точка полупрозрачная (значения ещё усредняются), после двух — сплошная
      const cls = [
        "radar-dot",
        p.estimated ? "radar-dot-estimated" : "",
        p.attempts < 2 ? "is-first" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" class="${cls}" />`;
    })
    .join("");

  const labels = axes
    .map((axis, i) => {
      const p = polarPoint(i, n, 100);
      const lx = CENTER + (RADIUS + LABEL_GAP) * Math.cos(p.angle);
      const ly = CENTER + (RADIUS + LABEL_GAP) * Math.sin(p.angle);
      const anchor = Math.cos(p.angle) > 0.15 ? "start" : Math.cos(p.angle) < -0.15 ? "end" : "middle";
      const empty = axis.value === null ? " radar-label-empty" : "";
      const cls = `radar-label${empty}`;

      const lines = wrapLabel(axis.label);
      if (lines.length === 1) {
        return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" class="${cls}" style="--tint:${axis.tint}">${lines[0]}</text>`;
      }
      const startY = ly - (LABEL_LINE_HEIGHT * (lines.length - 1)) / 2;
      const tspans = lines
        .map((line, j) => `<tspan x="${lx.toFixed(1)}" y="${(startY + j * LABEL_LINE_HEIGHT).toFixed(1)}">${line}</tspan>`)
        .join("");
      return `<text text-anchor="${anchor}" class="${cls}" style="--tint:${axis.tint}">${tspans}</text>`;
    })
    .join("");

  return `
    <svg class="radar" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="Лепестковая диаграмма твоего психологического портрета">
      ${rings}
      ${spokes}
      <polygon points="${averagePts}" class="radar-average" />
      ${showPolygon && youPts ? `<polygon points="${youPts}" class="radar-you" />` : ""}
      ${dots}
      ${labels}
    </svg>`;
}

function renderTiles(axes: AxisPoint[]): string {
  return axes
    .map((a) => {
      const status =
        a.value !== null && !a.estimated
          ? `Ты: <strong>${a.value}%</strong> · Среднее: <strong>${AVERAGE_LEVEL}%</strong>`
          : a.value !== null
          ? `Ты: <strong>~${a.value}%</strong> <span class="muted">— черновая прикидка, станет точным сравнением с другими, когда наберётся больше игроков</span>`
          : a.display !== null
          ? "Пройден, но участников пока мало для сравнения"
          : "Ещё не пройден";
      return `
        <div class="radar-tile" style="--tint:${a.tint}">
          <h3>${a.label}</h3>
          <p>${status}</p>
        </div>`;
    })
    .join("");
}

// ---------- Страница ----------

export async function renderProfile(root: HTMLElement) {
  const results = getResults();

  if (results.length === 0) {
    root.innerHTML = `
      <section class="page narrow">
        <h1>Мой профиль</h1>
        <p class="lead">Здесь появятся результаты пройденных тестов.</p>
        <a class="button" href="/" data-link>Выбрать тест</a>
      </section>`;
    return;
  }

  // Последний результат по каждому тесту, в порядке каталога
  const latest = new Map<string, GameResult>();
  for (const r of results) latest.set(r.testId, r);

  const [axes, rows] = await Promise.all([
    loadAxes(results, latest),
    Promise.all(
      TESTS.filter((t) => latest.has(t.id) && t.load).map(async (t) => {
        const r = latest.get(t.id)!;
        try {
          const s = (await t.load!()).summarize(r);
          const attempts = results.filter((x) => x.testId === t.id).length;
          return `
            <li class="profile-row" style="--tint:${t.tint}">
              <span class="tile-glyph">${t.glyph}</span>
              <div>
                <h2>${t.title}</h2>
                <p>${s.primary.label}: <strong>${s.primary.display}</strong></p>
                <p class="muted">${dateFmt.format(new Date(r.finishedAt))}${attempts > 1 ? `, попыток: ${attempts}` : ""}</p>
              </div>
              <a class="button button-quiet" href="/test/${t.id}" data-link>Пройти снова</a>
            </li>`;
        } catch (err) {
          console.warn(`Не удалось показать результат теста "${t.id}"`, err);
          return "";
        }
      }),
    ),
  ]);

  const done = latest.size;
  root.innerHTML = `
    <section class="page">
      <h1>Мой профиль</h1>
      <p class="lead">Пройдено тестов: ${done} из ${TESTS.length}. Результаты хранятся в этом браузере.</p>

      <section class="radar-block">
        <h2>Твой психологический портрет</h2>
        <p class="muted">На каждой оси — процентиль: насколько сильнее у тебя выражена черта, чем у среднего участника (100% — сильнее всех, 0% — слабее всех). Приглушённый пунктирный луч — тест, который ты ещё не проходила, без точки. Полая точка — прошла, но других игроков пока мало для честного сравнения. Полупрозрачная точка — прошла только раз; после второго прохождения результат усредняется и точка становится сплошной. Фигура-полигон появляется, когда пройдено ${MIN_GAMES_FOR_POLYGON}+ тестов — на 1-2 точках она только вводит в заблуждение.</p>
        <div class="radar-legend">
          <span class="radar-legend-item"><i class="radar-swatch radar-swatch-you"></i>Ты</span>
          <span class="radar-legend-item"><i class="radar-swatch radar-swatch-average"></i>Среднее участников</span>
          <span class="radar-legend-item"><i class="radar-swatch radar-swatch-estimated"></i>Черновая прикидка (мало данных)</span>
        </div>
        <div class="radar-figure">${renderRadar(axes, done)}</div>
        <div class="radar-tiles">${renderTiles(axes)}</div>
      </section>

      <ul class="profile-list">${rows.join("")}</ul>
    </section>`;
}
