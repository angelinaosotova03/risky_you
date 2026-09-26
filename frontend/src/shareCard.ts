import { loadAxes } from "./radar-data";
import { getResults } from "./storage";

// Карточки для шеринга — обе в формате сторис 1080×1920, рисуются на клиенте
// через Canvas, без сервера и без сторонних библиотек. Пиксельный шрифт
// (Press Start 2P) — только для короткого лого и бейджа архетипа, остальной
// текст — Roboto Mono, как и на самом сайте.
const W = 1080;
const H = 1920;
const MARGIN = 70;
const CONTENT_W = W - MARGIN * 2;
const MIN_GAMES_FOR_POLYGON = 3;
const LEVELS = [25, 50, 75, 100];
const DISPLAY_FONT = "Press Start 2P";
const BODY_FONT = "Roboto Mono";

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Canvas не ждёт шрифты сам — без этого первая карточка рисуется системным фолбэком */
async function ensureFonts() {
  await Promise.all([
    document.fonts.load(`700 40px "${DISPLAY_FONT}"`),
    document.fonts.load(`400 32px "${BODY_FONT}"`),
    document.fonts.load(`700 32px "${BODY_FONT}"`),
  ]);
  await document.fonts.ready;
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Скруглённая цветная плашка с текстом — для архетипа ("ИГРОК ВА-БАНК" и т.п.) */
function drawBadge(ctx: CanvasRenderingContext2D, text: string, centerY: number, tint: string): number {
  const label = text.toUpperCase();
  let fontSize = 34;
  ctx.font = `700 ${fontSize}px "${DISPLAY_FONT}"`;
  while (ctx.measureText(label).width > CONTENT_W - 80 && fontSize > 18) {
    fontSize -= 2;
    ctx.font = `700 ${fontSize}px "${DISPLAY_FONT}"`;
  }
  const textW = ctx.measureText(label).width;
  const padX = 44;
  const padY = 30;
  const boxW = textW + padX * 2;
  const boxH = fontSize + padY * 2;
  const x = W / 2 - boxW / 2;
  const y = centerY - boxH / 2;

  roundRect(ctx, x, y, boxW, boxH, boxH / 2);
  ctx.fillStyle = tint;
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, W / 2, y + boxH / 2 + 2);
  ctx.textBaseline = "alphabetic";

  return boxH;
}

async function drawRadar(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const results = getResults();
  const latest = new Map<string, (typeof results)[number]>();
  for (const r of results) latest.set(r.testId, r);
  const axes = await loadAxes(results, latest);
  const n = axes.length;
  const line = cssVar("--line", "#d5c0c5");
  const ink = cssVar("--ink", "#522a6f");
  const inkSoft = cssVar("--ink-soft", "#997b9d");

  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  for (const level of LEVELS) {
    ctx.beginPath();
    axes.forEach((_, i) => {
      const p = polar(i, n, level, cx, cy, radius);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  ctx.font = `400 26px "${BODY_FONT}"`;
  ctx.textAlign = "center";
  axes.forEach((axis, i) => {
    const edge = polar(i, n, 100, cx, cy, radius);
    ctx.strokeStyle = line;
    ctx.setLineDash(axis.value === null ? [6, 6] : []);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(edge.x, edge.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const lx = cx + (radius + 46) * Math.cos(edge.angle);
    const ly = cy + (radius + 46) * Math.sin(edge.angle);
    ctx.fillStyle = axis.value === null ? inkSoft : axis.tint;
    ctx.fillText(axis.label, lx, ly);
  });

  ctx.strokeStyle = inkSoft;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  axes.forEach((_, i) => {
    const p = polar(i, n, 50, cx, cy, radius);
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  const known = axes
    .map((a, i) => (a.value === null ? null : polar(i, n, a.value, cx, cy, radius)))
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

function drawHeader(ctx: CanvasRenderingContext2D, ink: string) {
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = `700 48px "${DISPLAY_FONT}"`;
  ctx.fillText("RISKY YOU", W / 2, 120);
}

function drawFooter(ctx: CanvasRenderingContext2D, inkSoft: string) {
  ctx.font = `400 32px "${BODY_FONT}"`;
  ctx.fillStyle = inkSoft;
  ctx.textAlign = "center";
  ctx.fillText(location.origin.replace(/^https?:\/\//, ""), W / 2, H - 70);
}

/** Карточка с результатом одной игры: архетип + фраза сравнения + радар всего профиля */
export async function generateShareCard(phrase: string, archetype: string | null, tint: string): Promise<string> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const paper = cssVar("--paper", "#faeadd");
  const ink = cssVar("--ink", "#522a6f");

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  drawHeader(ctx, ink);

  let cursorY = 250;
  if (archetype) {
    const badgeH = drawBadge(ctx, archetype, cursorY, tint);
    cursorY += badgeH / 2 + 90;
  }

  ctx.font = `700 52px "${BODY_FONT}"`;
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  const lines = wrapText(ctx, phrase, CONTENT_W);
  lines.forEach((line, i) => ctx.fillText(line, W / 2, cursorY + i * 64));
  cursorY += lines.length * 64 + 150;

  const radarR = 340;
  const radarCy = Math.min(cursorY + radarR, 1150);
  await drawRadar(ctx, W / 2, radarCy, radarR);

  drawFooter(ctx, cssVar("--ink-soft", "#997b9d"));

  return canvas.toDataURL("image/png");
}

/** Только диаграмма — без фразы и архетипа, для тех, кто хочет поделиться просто портретом */
export async function generateRadarCard(): Promise<string> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const paper = cssVar("--paper", "#faeadd");
  const ink = cssVar("--ink", "#522a6f");

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  drawHeader(ctx, ink);

  ctx.font = `700 38px "${BODY_FONT}"`;
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.fillText("Твой психологический портрет", W / 2, 210);

  await drawRadar(ctx, W / 2, 980, 340);

  drawFooter(ctx, cssVar("--ink-soft", "#997b9d"));

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
