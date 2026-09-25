import type { GameResult } from "./types";
import { getAnonId } from "./storage";

export interface Norm {
  percentile: number | null;
  sample_size: number;
}

export interface Average {
  average: number | null;
  sample_size: number;
}

export interface Sample {
  value: number | null;
  sample_size: number;
}

export interface Samples {
  values: number[];
  sample_size: number;
}

/** Сеть не должна ломать игру: при любой ошибке возвращаем null. */
async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`/api${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function postResult(result: GameResult) {
  return request<{ id: number }>("/results", {
    method: "POST",
    body: JSON.stringify({ anon_id: getAnonId(), test_id: result.testId, metrics: result.metrics }),
  });
}

export function getNorm(testId: string, metric: string, value: number) {
  const q = new URLSearchParams({ metric, value: String(value) });
  return request<Norm>(`/norms/${testId}?${q}`);
}

export function getAverage(testId: string, metric: string) {
  const q = new URLSearchParams({ metric });
  return request<Average>(`/norms/${testId}/average?${q}`);
}

/** Один случайный реальный ответ — используется как "партнёр" в Доверии и Ультиматуме.
 * minSample — свой (ниже, чем у радара) порог холодного старта для конкретной игры. */
export function getSample(testId: string, metric: string, minSample?: number) {
  const q = new URLSearchParams({ metric, ...(minSample ? { min_sample: String(minSample) } : {}) });
  return request<Sample>(`/norms/${testId}/sample?${q}`);
}

/** Список реальных ответов — используется для гистограммы в Двух третях */
export function getSamples(testId: string, metric: string, limit = 500, minSample?: number) {
  const q = new URLSearchParams({
    metric,
    limit: String(limit),
    ...(minSample ? { min_sample: String(minSample) } : {}),
  });
  return request<Samples>(`/norms/${testId}/samples?${q}`);
}
