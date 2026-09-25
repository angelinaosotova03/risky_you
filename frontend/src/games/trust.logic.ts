// Чистый расчёт "Доверия" — без UI и без сети (сетевой результат передаётся как число).
export const ROUNDS = 3;
export const ENDOWMENT = 10; // монет, слайдер 0-10
export const MULTIPLIER = 3;
export const RECEIVER_GIVEN = 15; // монет — фиксированный пример из методики
export const COLD_START_MIN_SAMPLE = 50;
export const COLD_START_RATE = 1 / 3;

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface SenderRound {
  sent: number;
  tripled: number;
  returned: number;
  fromResearch: boolean;
}

export interface TrustMetrics {
  trustShare: number;
  totalEarned: number;
  avgSent: number;
  avgReturned: number;
  receiverReturn: number;
}

/** sampleValue — реальный ответ из базы (0-100, доля возврата) или null, если данных мало */
export function resolvePartnerRate(sampleValue: number | null): { rate: number; fromResearch: boolean } {
  if (sampleValue == null) return { rate: COLD_START_RATE, fromResearch: true };
  return { rate: sampleValue / 100, fromResearch: false };
}

export function computeSenderRound(sent: number, rate: number, fromResearch: boolean): SenderRound {
  const tripled = sent * MULTIPLIER;
  const returned = Math.round(tripled * rate);
  return { sent, tripled, returned, fromResearch };
}

/** Сколько монет прибавляется в банк за раунд отправителя */
export function senderBankDelta(round: SenderRound): number {
  return ENDOWMENT - round.sent + round.returned;
}

/** Сколько монет прибавляется в банк за раунд получателя */
export function receiverBankDelta(receiverReturnPct: number): number {
  return Math.round(RECEIVER_GIVEN * (1 - receiverReturnPct / 100));
}

/** Считает итоговые метрики по трём раундам отправителя + доле возврата как получателя */
export function computeTrustResult(rounds: SenderRound[], receiverReturn: number, bank: number): TrustMetrics {
  const trustShare = rounds.length
    ? Math.round((rounds.reduce((s, r) => s + r.sent / ENDOWMENT, 0) / rounds.length) * 100)
    : 0;
  const avgSent = rounds.length ? round1(rounds.reduce((s, r) => s + r.sent, 0) / rounds.length) : 0;
  const avgReturned = rounds.length ? round1(rounds.reduce((s, r) => s + r.returned, 0) / rounds.length) : 0;
  return { trustShare, totalEarned: bank, avgSent, avgReturned, receiverReturn };
}
