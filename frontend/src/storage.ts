import type { GameResult } from "./types";

const ANON_KEY = "ry.anonId";
const RESULTS_KEY = "ry.results";

let memoryAnonId: string | null = null;
let memoryResults: GameResult[] = [];

/** Идентификатор браузера до регистрации. При регистрации бэкенд привяжет его к аккаунту. */
export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    memoryAnonId ??= crypto.randomUUID();
    return memoryAnonId;
  }
}

export function getResults(): GameResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as GameResult[]) : [];
  } catch {
    return memoryResults;
  }
}

export function saveResult(result: GameResult): void {
  const all = [...getResults(), result];
  memoryResults = all;
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {
    /* приватный режим — живём в памяти вкладки */
  }
}
