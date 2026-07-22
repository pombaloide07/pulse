/** Formatadores compartilhados (pt-BR) — uma regra, um lugar. */

/** Inteiro com separador de milhar: 1234 → "1.234". */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

/** Uma casa decimal com vírgula: 2.5 → "2,5". */
export function fmtDec1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

/** Iniciais pro avatar: "Pedro Lima" → "PE". */
export function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "??";
}
