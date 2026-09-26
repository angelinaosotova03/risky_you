import { averageMetric } from "./accuracy";
import { getNorm } from "./api";
import { TESTS } from "./tests";
import { TRAITS } from "./traits";
import type { GameResult } from "./types";

// Вынесено отдельно от profile.ts, чтобы карточка для шеринга могла считать те же
// оси радара (с тем же сетевым сравнением), не дублируя логику percentile/оценок.

export interface AxisPoint {
  id: string;
  tint: string;
  label: string;
  value: number | null; // 0-100 для отрисовки, null — совсем нет данных (тест не пройден)
  estimated: boolean; // true — value это грубая оценка по диапазону игры, а не настоящий процентиль
  display: string | null; // отображаемое значение метрики (для плитки), если тест пройден
  attempts: number; // сколько раз пройден именно с этой метрикой — 1 = полупрозрачная точка, 2+ = сплошная
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Пока других участников мало для percentile, оцениваем твой результат по диапазону самой игры */
export function estimateFromRange(rawValue: number, range: [number, number], invert?: boolean): number {
  const [min, max] = range;
  const scaled = clamp(((rawValue - min) / (max - min)) * 100, 0, 100);
  return Math.round(invert ? 100 - scaled : scaled);
}

/** Для каждого теста каталога считает процентиль по его primary-метрике, если результат уже есть.
 * Значение усредняется по всем попыткам с этой метрикой — точность растёт после повторных прохождений. */
export async function loadAxes(results: GameResult[], latest: Map<string, GameResult>): Promise<AxisPoint[]> {
  return Promise.all(
    TESTS.map(async (t): Promise<AxisPoint> => {
      const trait = TRAITS[t.id] ?? { label: t.title };
      const result = latest.get(t.id);
      if (!t.load || !result) {
        return { id: t.id, tint: t.tint, label: trait.label, value: null, estimated: false, display: null, attempts: 0 };
      }

      try {
        const game = await t.load();
        const s = game.summarize(result);
        const averaged = averageMetric(results, t.id, s.primary.metric);
        const rawValue = averaged?.value ?? result.metrics[s.primary.metric];
        const attempts = averaged?.attempts ?? 1;
        const norm = await getNorm(t.id, s.primary.metric, rawValue);

        if (norm && norm.percentile !== null) {
          const value = Math.round(trait.invert ? 100 - norm.percentile : norm.percentile);
          return { id: t.id, tint: t.tint, label: trait.label, value, estimated: false, display: s.primary.display, attempts };
        }

        // Настоящего сравнения с другими пока нет — не прячем твой результат,
        // а грубо прикидываем его по диапазону значений этой игры
        if (trait.range) {
          const value = estimateFromRange(rawValue, trait.range, trait.invert);
          return { id: t.id, tint: t.tint, label: trait.label, value, estimated: true, display: s.primary.display, attempts };
        }
        return { id: t.id, tint: t.tint, label: trait.label, value: null, estimated: false, display: s.primary.display, attempts };
      } catch (err) {
        // Один битый/устаревший результат не должен ронять всю страницу профиля
        console.warn(`Не удалось посчитать ось диаграммы для теста "${t.id}"`, err);
        return { id: t.id, tint: t.tint, label: trait.label, value: null, estimated: false, display: null, attempts: 0 };
      }
    }),
  );
}
