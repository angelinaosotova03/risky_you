// Заглушки до готовых SVG. Все картинки идут через один слот фиксированного размера —
// когда ручной SVG появится и получит статус final в манифесте, замена не сдвинет вёрстку.
export type ArtKind = "avatar" | "tile-icon" | "result-art";
export type ArtStatus = "placeholder" | "draft" | "final";

export interface ArtEntry {
  id: string;
  kind: ArtKind;
  status: ArtStatus;
}

/** Статус по каждой картинке сайта. draft — есть рисунок, но не проверен на обеих темах
 * или не хватает hover-анимации из ТЗ. placeholder — рисунка нет вовсе, showим заглушку. */
export const ART_MANIFEST: ArtEntry[] = [
  { id: "balloon", kind: "tile-icon", status: "draft" },
  { id: "loss", kind: "tile-icon", status: "draft" },
  { id: "patience", kind: "tile-icon", status: "draft" },
  { id: "decks", kind: "tile-icon", status: "draft" },
  // Предмет иконки по ТЗ (рука с монетой / шоколадка / мишень / мышеловка) не совпадает
  // с тем, что нарисовано сейчас — честнее показать заглушку, чем выдавать несовпадение за финал
  { id: "trust", kind: "tile-icon", status: "placeholder" },
  { id: "ultimatum", kind: "tile-icon", status: "placeholder" },
  { id: "beauty", kind: "tile-icon", status: "placeholder" },
  { id: "reflection", kind: "tile-icon", status: "placeholder" },
];

export function artStatus(kind: ArtKind, id: string): ArtStatus {
  return ART_MANIFEST.find((e) => e.kind === kind && e.id === id)?.status ?? "placeholder";
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Аватар-заглушка: цвет по hash(nickname), 1-2 буквы ника. Один ник — всегда один аватар. */
export function avatarPlaceholder(nickname: string, palette: string[]): string {
  const color = palette[hashCode(nickname) % palette.length] ?? "#999";
  const initials = nickname.trim().slice(0, 2).toUpperCase() || "?";
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
    <rect width="16" height="16" rx="8" fill="${color}"/>
    <text x="8" y="11" text-anchor="middle" font-size="7" fill="#fff">${initials}</text>
  </svg>`;
}

/** Иконка-заглушка плитки: квадрат цвета акцента игры с первой буквой названия */
export function tileIconPlaceholder(title: string, tint: string): string {
  const letter = title.trim().charAt(0).toUpperCase() || "?";
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
    <rect width="16" height="16" fill="${tint}"/>
    <text x="8" y="11.5" text-anchor="middle" font-size="9" fill="#fff">${letter}</text>
  </svg>`;
}

/** Картинка результата-заглушка: блок цвета оси с названием черты */
export function resultArtPlaceholder(traitLabel: string, tint: string): string {
  return `<svg viewBox="0 0 320 160" aria-hidden="true">
    <rect width="320" height="160" fill="${tint}"/>
    <text x="160" y="85" text-anchor="middle" font-size="18" fill="#fff">${traitLabel}</text>
  </svg>`;
}
