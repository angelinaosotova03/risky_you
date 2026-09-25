import { loadAxes } from "./radar-data";
import { getResults } from "./storage";

// Карточка для шеринга: формат сторис 1080×1920 — радар + самая яркая фраза + ссылка.
// Генерируется на клиенте через Canvas, без сервера и без сторонних библиотек.
const W = 1080;
const H = 1920;
const RADAR_CX = W / 2;
const RADAR_CY = 980;
const RADAR_R = 340;
const MIN_GAMES_FOR_POLYGON = 3;
const LEVELS = [25, 50, 75, 100];

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function polar(i: number, n: number, value: number, cx: number, cy: number, r: number) {
  const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
  const rr = r * (value / 100);
  return { x: cx + rr * Math.cos(angle), y: cy + rr * Math.sin(angle), angle };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function drawRadar(ctx: CanvasRenderingContext2D) {
  const results = getResults();
  const latest = new Map<string, (typeof results)[number]>();
  for (const r of results) latest.set(r.testId, r);
  const axes = await loadAxes(results, latest);
  const n = axes.length;
  const line = cssVar("--line", "#d5c0c5");
  const ink = cssVar("--ink", "#522a6f");
  const inkSoft = cssVar("--ink-soft", "#997b9d");

  // Сетка
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  for (const level of LEVELS) {
    ctx.beginPath();
    axes.forEach((_, i) => {
      const p = polar(i, n, level, RADAR_CX, RADAR_CY, RADAR_R);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  // Спицы + подписи осей
  ctx.font = "26px sans-serif";
  ctx.textAlign = "center";
  axes.forEach((axis, i) => {
    const edge = polar(i, n, 100, RADAR_CX, RADAR_CY, RADAR_R);
    ctx.strokeStyle = line;
    ctx.setLineDash(axis.value === null ? [6, 6] : []);
    ctx.beginPath();
    ctx.moveTo(RADAR_CX, RADAR_CY);
    ctx.lineTo(edge.x, edge.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const lx = RADAR_CX + (RADAR_R + 46) * Math.cos(edge.angle);
    const ly = RADAR_CY + (RADAR_R + 46) * Math.sin(edge.angle);
    ctx.fillStyle = axis.value === null ? inkSoft : axis.tint;
    ctx.fillText(axis.label, lx, ly);
  });

  // Пунктир "среднее участников"
  ctx.strokeStyle = inkSoft;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  axes.forEach((_, i) => {
    const p = polar(i, n, 50, RADAR_CX, RADAR_CY, RADAR_R);
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Полигон "Ты" — только при 3+ пройденных играх, как на странице профиля
  const known = axes
    .map((a, i) => (a.value === null ? null : polar(i, n, a.value, RADAR_CX, RADAR_CY, RADAR_R)))
    .filter((p): p is { x: number; y: number; angle: number } => p !== null);
  const playedCount = latest.size;
  if (playedCount >= MIN_GAMES_FOR_POLYGON && known.length > 0) {
    ctx.beginPath();
    known.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = `${ink}2e`;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  for (const p of known) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
  }
}

export async function generateShareCard(phrase: string): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = cssVar("--paper", "#faeadd");
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = cssVar("--ink", "#522a6f");
  ctx.font = "700 56px sans-serif";
  ctx.fillText("Risky You", W / 2, 130);

  ctx.font = "700 64px sans-serif";
  const lines = wrapText(ctx, phrase, W - 140);
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 260 + i * 76));

  await drawRadar(ctx);

  ctx.font = "34px sans-serif";
  ctx.fillStyle = cssVar("--ink-soft", "#997b9d");
  ctx.fillText(location.origin.replace(/^https?:\/\//, ""), W / 2, H - 80);

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
