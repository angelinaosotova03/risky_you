// Чистый расчёт "Задач-ловушек" (CRT) — без UI.
export const QUESTIONS_PER_GAME = 3;
export const SOFT_TIMER_S = 30;

export interface Question {
  text: string;
  correct: number;
  trap: number; // типичный интуитивный неверный ответ
}

export const POOL: Question[] = [
  { text: "У Маши 5 сыновей, и у каждого есть одна сестра. Сколько детей у Маши?", correct: 6, trap: 10 },
  {
    text: "Поезд длиной 1 км едет со скоростью 1 км в минуту через тоннель длиной 1 км. Сколько минут пройдёт от въезда головы поезда до выезда хвоста?",
    correct: 2,
    trap: 1,
  },
  { text: "Сколько месяцев в году имеют 28 дней?", correct: 12, trap: 1 },
  { text: "Ты бежишь марафон и обгоняешь бегуна, который был вторым. Каким по счёту стал теперь ты?", correct: 2, trap: 1 },
  {
    text: "В первый день тебе платят 1 ₽, и каждый следующий день зарплата удваивается. Сколько рублей тебе заплатят на 10-й день?",
    correct: 512,
    trap: 1024,
  },
  { text: "У тебя было 2 яблока. Тебе дали ещё 3 пары яблок. Сколько яблок у тебя теперь?", correct: 8, trap: 5 },
  {
    text: "В тёмной комнате в коробке лежат вперемешку 10 красных и 10 синих носков. Сколько носков нужно вытащить минимум, чтобы точно получить пару одного цвета?",
    correct: 3,
    trap: 11,
  },
  {
    text: "Товар стоил 100 ₽. Цену сначала подняли на 50%, а потом снизили на 50%. Сколько товар стоит теперь (в ₽)?",
    correct: 75,
    trap: 100,
  },
  {
    text: "Верёвка горит 30 минут, если её зажечь с двух концов одновременно. Сколько минут она будет гореть, если зажечь только с одного конца?",
    correct: 60,
    trap: 30,
  },
  {
    text: "В лестнице 10 ступенек. Ты идёшь, перешагивая сразу через одну (по 2 ступени за шаг). Сколько шагов понадобится, чтобы дойти до верха?",
    correct: 5,
    trap: 10,
  },
  {
    text: "В группе 6 человек, средний балл за тест — 70. Одному по ошибке засчитали 0 вместо реального балла, и его исключили из подсчёта. Какой стал средний балл у оставшихся 5 (в баллах)?",
    correct: 84,
    trap: 70,
  },
  {
    text: "Ты проехал первую половину 60-километрового пути со скоростью 60 км/ч, а вторую половину — со скоростью 30 км/ч. Сколько минут заняла вся поездка?",
    correct: 90,
    trap: 80,
  },
];

const NUMBER_WORDS: Record<string, number> = {
  ноль: 0,
  один: 1,
  одна: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
  одиннадцать: 11,
  двенадцать: 12,
  тринадцать: 13,
  четырнадцать: 14,
  пятнадцать: 15,
  шестнадцать: 16,
  семнадцать: 17,
  восемнадцать: 18,
  девятнадцать: 19,
  двадцать: 20,
};

/**
 * Достаёт число из свободного текста ответа: "6", " 6 ", "6 детей", "шесть" — всё
 * приводится к 6. Пустой/нечисловой ответ (в том числе по таймеру) → null.
 */
export function normalizeAnswer(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "") return null;
  if (trimmed in NUMBER_WORDS) return NUMBER_WORDS[trimmed];
  const match = trimmed.match(/-?\d+([.,]\d+)?/);
  if (!match) return null;
  return Number(match[0].replace(",", "."));
}

export type AnswerCategory = "correct" | "trap" | "other";

export function classifyAnswer(raw: string, q: Question): AnswerCategory {
  const value = normalizeAnswer(raw);
  if (value === null) return "other";
  if (value === q.correct) return "correct";
  if (value === q.trap) return "trap";
  return "other";
}

export interface ReflectionMetrics {
  reflectionScore: number;
  correctCount: number;
  trapCount: number;
  otherCount: number;
  totalRounds: number;
}

export function computeReflectionResult(categories: AnswerCategory[]): ReflectionMetrics {
  const correctCount = categories.filter((c) => c === "correct").length;
  const trapCount = categories.filter((c) => c === "trap").length;
  const otherCount = categories.filter((c) => c === "other").length;
  const totalRounds = categories.length;
  // Проценты в результатах — целые (см. соглашение об округлении в тексте результата)
  const reflectionScore = totalRounds ? Math.round((correctCount / totalRounds) * 100) : 0;
  return { reflectionScore, correctCount, trapCount, otherCount, totalRounds };
}

export function pickQuestions(count: number): Question[] {
  return POOL.slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
