/** Русское склонение по числу: 1 → forms[0], 2-4 → forms[1], 5-20 (и 0, 11-14) → forms[2].
 * forms = [именительный ед.ч., родительный ед.ч. (2-4), родительный мн.ч. (5-20)] —
 * например ["качок", "качка", "качков"] или ["монета", "монеты", "монет"]. */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(Math.round(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** "1 качок", "2 качка", "5 качков" — число + правильная форма слова */
export function pluralLabel(n: number, forms: [string, string, string]): string {
  return `${n.toLocaleString("ru-RU")} ${plural(n, forms)}`;
}
