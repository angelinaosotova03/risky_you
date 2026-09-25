export interface GameResult {
  testId: string;
  metrics: Record<string, number>;
  finishedAt: string;
}

export interface ResultSummary {
  primary: {
    metric: string; // ключ в metrics, по которому считается процентиль
    label: string;
    display: string;
    comparison: (percentile: number) => string;
  };
  details: { label: string; value: string }[];
  science: { text: string; source: string };
}

/** Каждая мини-игра реализует этот интерфейс — больше ничего не нужно. */
export interface Game {
  mount(root: HTMLElement, onFinish: (result: GameResult) => void): () => void;
  summarize(result: GameResult): ResultSummary;
}

export interface TestMeta {
  id: string;
  title: string;
  question: string;
  minutes: number;
  tint: string;
  glyph: string; // svg
  load?: () => Promise<Game>; // нет load — тест ещё в разработке
}
