export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Segunda-feira da semana da data. */
export function mondayOf(d: Date): Date {
  const c = new Date(d);
  const dow = (c.getDay() + 6) % 7; // 0 = segunda
  c.setDate(c.getDate() - dow);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Os 7 dias (ISO) da semana corrente, seg → dom. */
export function currentWeekISO(): string[] {
  const mon = mondayOf(new Date());
  return Array.from({ length: 7 }, (_, i) => toISO(addDays(mon, i)));
}

export const WEEKDAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];

export const WEEKDAY_SHORT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const WEEKDAYS_PT = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
];

export function formatLong(d: Date): string {
  return `${WEEKDAYS_PT[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
}

export function formatShort(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Diferença em dias inteiros entre dois ISO (a - b). */
export function diffDays(a: string, b: string): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
