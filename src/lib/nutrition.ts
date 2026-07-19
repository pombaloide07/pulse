import type { AppState, Dish, Food, FoodMacros, Goal, MealEntry, Profile } from "./types";
import { FOOD_BY_ID } from "./foods";
import { addDays, fromISO, toISO, todayISO } from "./dates";
import { weeklyVolume } from "./logic";

export const EMPTY_MACROS: FoodMacros = { kcal: 0, prot: 0, carb: 0, fat: 0 };

export function addMacros(a: FoodMacros, b: FoodMacros): FoodMacros {
  return { kcal: a.kcal + b.kcal, prot: a.prot + b.prot, carb: a.carb + b.carb, fat: a.fat + b.fat };
}

export function scaleMacros(per100: FoodMacros, grams: number): FoodMacros {
  const k = grams / 100;
  return { kcal: per100.kcal * k, prot: per100.prot * k, carb: per100.carb * k, fat: per100.fat * k };
}

export function foodMacros(food: Food, grams: number): FoodMacros {
  return scaleMacros(food.per100, grams);
}

export function dishMacros(dish: Dish): FoodMacros {
  return dish.ingredients.reduce((acc, ing) => {
    const food = FOOD_BY_ID[ing.foodId];
    return food ? addMacros(acc, foodMacros(food, ing.grams)) : acc;
  }, EMPTY_MACROS);
}

export function dishGrams(dish: Dish): number {
  return dish.ingredients.reduce((acc, i) => acc + i.grams, 0);
}

/* ————— calculadora (Mifflin-St Jeor) ————— */

export function tmb(profile: Profile, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return Math.round(base + (profile.sex === "M" ? 5 : -161));
}

export function gastoTotal(profile: Profile, weightKg: number): number {
  return Math.round(tmb(profile, weightKg) * profile.activity);
}

const round5 = (n: number) => Math.round(n / 5) * 5;
const round10 = (n: number) => Math.round(n / 10) * 10;

/**
 * Metas padrão pro nicho (PRD §7.2): proteína puxada, superávit
 * moderado no bulking — superávit agressivo vira barriguinha, não músculo.
 */
export function defaultTargets(profile: Profile, weightKg: number): FoodMacros {
  const get = gastoTotal(profile, weightKg);
  const kcal = round10(profile.goal === "bulk" ? get + 300 : profile.goal === "cut" ? get - 500 : get);
  const prot = round5((profile.goal === "maint" ? 1.8 : 2.0) * weightKg);
  const fat = round5((kcal * 0.25) / 9);
  const carb = round5(Math.max(0, (kcal - prot * 4 - fat * 9) / 4));
  return { kcal, prot, carb, fat };
}

/** §11 — piso calórico: abaixo disso o app avisa em vez de obedecer calado. */
export function kcalFloor(profile: Profile, weightKg: number): number {
  return Math.max(profile.sex === "M" ? 1500 : 1200, tmb(profile, weightKg));
}

export const GOAL_LABEL: Record<Goal, string> = {
  bulk: "Bulking",
  cut: "Cutting",
  maint: "Manutenção",
};

/* ————— registro & acompanhamento ————— */

export function dayEntries(state: AppState, iso: string): MealEntry[] {
  return state.meals.filter((m) => m.date === iso).sort((a, b) => a.minutes - b.minutes);
}

export function dayTotals(state: AppState, iso: string): FoodMacros {
  return dayEntries(state, iso).reduce((acc, m) => addMacros(acc, m.macros), EMPTY_MACROS);
}

export interface PeriodAvg {
  kcal: number;
  prot: number;
  loggedDays: number;
}

/** Média por dia registrado nos últimos n dias (dia sem registro é ruído, não zero). */
export function periodAvg(state: AppState, nDays: number, endIso = todayISO()): PeriodAvg {
  const start = toISO(addDays(fromISO(endIso), -(nDays - 1)));
  const byDay = new Map<string, FoodMacros>();
  for (const m of state.meals) {
    if (m.date < start || m.date > endIso) continue;
    byDay.set(m.date, addMacros(byDay.get(m.date) ?? EMPTY_MACROS, m.macros));
  }
  const days = [...byDay.values()];
  if (!days.length) return { kcal: 0, prot: 0, loggedDays: 0 };
  return {
    kcal: Math.round(days.reduce((a, d) => a + d.kcal, 0) / days.length),
    prot: Math.round(days.reduce((a, d) => a + d.prot, 0) / days.length),
    loggedDays: days.length,
  };
}

/** kcal (ou proteína) por dia, últimos n dias — pro gráfico de barras. */
export function dailySeries(
  state: AppState,
  nDays: number,
  key: "kcal" | "prot"
): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  const today = fromISO(todayISO());
  for (let i = nDays - 1; i >= 0; i--) {
    const iso = toISO(addDays(today, -i));
    out.push({ date: iso, value: Math.round(dayTotals(state, iso)[key]) });
  }
  return out;
}

/* ————— peso ————— */

export function sortedWeights(state: AppState) {
  return [...state.weights].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function latestWeight(state: AppState): number | null {
  const w = sortedWeights(state);
  return w.length ? w[w.length - 1].kg : null;
}

/* ————— a leitura do loop (PRD §7.3) ————— */

export interface LoopReading {
  kcalAvg: number;
  kcalTarget: number;
  protAvg: number;
  protPerKg: number | null;
  weightDelta: number | null;
  volumePct: number | null;
  story: string;
  verdict: string;
}

export function readLoop(state: AppState): LoopReading | null {
  const avg = periodAvg(state, 28);
  if (avg.loggedDays < 10) return null;

  const weights = sortedWeights(state);
  const today = todayISO();
  const cutoff = toISO(addDays(fromISO(today), -28));
  const recent = weights.filter((w) => w.date <= today);
  const wEnd = recent[recent.length - 1] ?? null;
  const before = recent.filter((w) => w.date <= cutoff);
  const wStart = before[before.length - 1] ?? recent[0] ?? null;
  const weightDelta =
    wEnd && wStart && wEnd.date !== wStart.date ? +(wEnd.kg - wStart.kg).toFixed(1) : null;

  const vols = weeklyVolume(state, 8).map((w) => w.volume);
  const last4 = vols.slice(4).reduce((a, b) => a + b, 0);
  const prev4 = vols.slice(0, 4).reduce((a, b) => a + b, 0);
  const volumePct = prev4 > 0 ? Math.round(((last4 - prev4) / prev4) * 100) : null;

  const kg = latestWeight(state);
  const protPerKg = kg ? +(avg.prot / kg).toFixed(1) : null;
  const target = state.profile.targets.kcal;

  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const gain = weightDelta ?? 0;
  const story =
    `Nas últimas 4 semanas você comeu em média ${fmt(avg.kcal)} kcal/dia` +
    ` (meta: ${fmt(target)})` +
    (weightDelta !== null
      ? ` e ${gain >= 0 ? "ganhou" : "perdeu"} ${Math.abs(gain).toFixed(1).replace(".", ",")}kg`
      : "") +
    "." +
    (volumePct !== null
      ? ` Sua carga total ${volumePct >= 0 ? "subiu" : "desceu"} ${Math.abs(volumePct)}%.`
      : "");

  const rate = weightDelta !== null ? gain / 4 : null;
  let verdict: string;
  const goal = state.profile.goal;
  if (goal === "bulk") {
    if (rate === null) verdict = "Registre o peso com mais frequência pra fechar a leitura.";
    else if (rate < 0.1)
      verdict =
        avg.kcal < target - 150
          ? "O peso quase não mexeu e a média está abaixo da meta — provavelmente falta comida, não treino."
          : "O peso quase não mexeu. Vale subir um pouco a meta ou conferir se os registros estão completos.";
    else if (rate <= 0.45)
      verdict =
        avg.kcal < target - 150
          ? "O superávit está funcionando, mas leve — dá pra ser mais agressivo se quiser acelerar."
          : "O superávit está funcionando. Peso subindo no ritmo certo, carga acompanhando.";
    else
      verdict =
        "Subindo rápido. Se a ideia é minimizar gordura, vale suavizar um pouco o superávit.";
  } else if (goal === "cut") {
    if (rate === null) verdict = "Registre o peso com mais frequência pra fechar a leitura.";
    else if (rate > -0.1) verdict = "O peso não desceu — na prática o déficit sumiu. Confira os fins de semana.";
    else if (rate >= -0.8) verdict = "O déficit está no ponto: descendo devagar, protegendo músculo.";
    else verdict = "Descendo rápido demais — segura um pouco pra não levar músculo junto.";
  } else {
    verdict =
      rate !== null && Math.abs(rate) < 0.15
        ? "Estável — manutenção cumprida."
        : "O peso está se mexendo mais que manutenção sugere. Se for intencional, ajuste o objetivo.";
  }

  return {
    kcalAvg: avg.kcal,
    kcalTarget: target,
    protAvg: avg.prot,
    protPerKg,
    weightDelta,
    volumePct,
    story,
    verdict,
  };
}
