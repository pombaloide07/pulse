import type {
  AppState,
  Challenge,
  Dish,
  MealEntry,
  Member,
  Profile,
  Session,
  SetLog,
  WeightEntry,
  Workout,
} from "./types";
import { addDays, toISO } from "./dates";
import { defaultTargets, dishGrams, dishMacros } from "./nutrition";

/** PRNG determinístico — o seed sempre gera a mesma história. */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFAULT_WORKOUTS: Workout[] = [
  {
    id: "w-a",
    letter: "A",
    name: "Peito e tríceps",
    items: [
      { exerciseId: "supino-reto", sets: 4, targetReps: 8, targetLoad: 44 },
      { exerciseId: "supino-inclinado-halteres", sets: 3, targetReps: 10, targetLoad: 22 },
      { exerciseId: "crucifixo-maquina", sets: 3, targetReps: 12, targetLoad: 55 },
      { exerciseId: "triceps-corda", sets: 3, targetReps: 12, targetLoad: 27 },
      { exerciseId: "triceps-frances", sets: 3, targetReps: 10, targetLoad: 12 },
    ],
  },
  {
    id: "w-b",
    letter: "B",
    name: "Costas e bíceps",
    items: [
      { exerciseId: "puxada-frente", sets: 4, targetReps: 10, targetLoad: 58 },
      { exerciseId: "remada-curvada", sets: 4, targetReps: 8, targetLoad: 46 },
      { exerciseId: "remada-baixa", sets: 3, targetReps: 10, targetLoad: 55 },
      { exerciseId: "rosca-direta", sets: 3, targetReps: 10, targetLoad: 24 },
      { exerciseId: "rosca-martelo", sets: 3, targetReps: 12, targetLoad: 12 },
    ],
  },
  {
    id: "w-c",
    letter: "C",
    name: "Pernas e ombros",
    items: [
      { exerciseId: "agachamento-livre", sets: 4, targetReps: 8, targetLoad: 62 },
      { exerciseId: "leg-press", sets: 4, targetReps: 10, targetLoad: 180 },
      { exerciseId: "mesa-flexora", sets: 3, targetReps: 12, targetLoad: 40 },
      { exerciseId: "desenvolvimento-halteres", sets: 4, targetReps: 10, targetLoad: 18 },
      { exerciseId: "elevacao-lateral", sets: 3, targetReps: 14, targetLoad: 8 },
    ],
  },
];

/**
 * Carga histórica de um item: começa abaixo do alvo e sobe em degraus
 * de placa (2–2,5kg ou 5kg pra máquinas pesadas) até chegar perto do alvo.
 * A elevação lateral fica parada — é o sinal de platô do Progresso.
 */
function loadAt(exerciseId: string, target: number, week: number, totalWeeks: number): number {
  if (exerciseId === "elevacao-lateral") return target; // platô proposital
  const step = target >= 100 ? 10 : target >= 40 ? 4 : 2;
  const stepsBack = Math.max(0, Math.floor((totalWeeks - 1 - week) / 2));
  return Math.max(step, target - stepsBack * step);
}

function makeHistory(workouts: Workout[], weeks: number, rnd: () => number): Session[] {
  const sessions: Session[] = [];
  const today = new Date();
  // padrões de dias por semana: seg/qua/sex + eventualmente sáb
  const patterns = [
    [0, 2, 4],
    [0, 2, 4, 5],
    [0, 1, 3],
    [1, 3, 5],
  ];
  let rotation = 0;
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);

  for (let w = 0; w < weeks; w++) {
    // uma semana fraca no meio — vida real (PRD: "um dia ruim não é nada")
    const weak = w === Math.floor(weeks / 2);
    const pattern = weak ? [2] : patterns[Math.floor(rnd() * patterns.length)];
    for (const dow of pattern) {
      const date = addDays(monday, w * 7 + dow);
      if (toISO(date) >= toISO(today)) continue; // história vai até ontem
      const workout = workouts[rotation % workouts.length];
      rotation++;
      const logs = workout.items.map((item, idx) => {
        // de vez em quando pula o último exercício — sem drama
        const skipped = idx === workout.items.length - 1 && rnd() < 0.18;
        const load = loadAt(item.exerciseId, item.targetLoad, w, weeks);
        const sets: SetLog[] = Array.from({ length: item.sets }, (_, s) => {
          if (skipped) return { load: 0, reps: 0, done: false };
          const lastSetTired = s === item.sets - 1 && rnd() < 0.35;
          return {
            load,
            reps: Math.max(4, item.targetReps - (lastSetTired ? 2 : 0)),
            done: true,
          };
        });
        return { exerciseId: item.exerciseId, sets };
      });
      const startedAt = date.getTime() + (18 * 60 + Math.floor(rnd() * 90)) * 60000;
      sessions.push({
        id: `seed-${toISO(date)}`,
        workoutId: workout.id,
        date: toISO(date),
        startedAt,
        finishedAt: startedAt + (52 + Math.floor(rnd() * 20)) * 60000,
        logs,
      });
    }
  }
  return sessions;
}

/** Presença dos amigos: padrões semanais fixos + ruído determinístico. */
function makeFriends(weeks: number, rnd: () => number): Member[] {
  const friends = [
    { id: "m-lucas", name: "Lucas", initials: "LU", color: "#2f6b52", days: [0, 1, 3, 4], today: true, volumePct: 8 },
    { id: "m-matheus", name: "Matheus", initials: "MA", color: "#d9950f", days: [0, 2, 4], today: false, volumePct: 3 },
    { id: "m-rafa", name: "Rafa", initials: "RA", color: "#4f7fa3", days: [0, 1, 2, 3, 4], today: true, volumePct: 12 },
    { id: "m-joao", name: "João", initials: "JO", color: "#a05fa3", days: [1, 3], today: false, volumePct: 0 },
  ];
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const todayIso = toISO(today);

  return friends.map((f) => {
    const presence: string[] = [];
    for (let w = 0; w < weeks; w++) {
      for (const dow of f.days) {
        if (rnd() < 0.22) continue; // faltou — acontece
        const date = toISO(addDays(monday, w * 7 + dow));
        if (date > todayIso) continue;
        if (date === todayIso && !f.today) continue;
        presence.push(date);
      }
    }
    if (f.today && !presence.includes(todayIso)) presence.push(todayIso);
    return {
      id: f.id,
      name: f.name,
      initials: f.initials,
      color: f.color,
      isMe: false,
      presence,
      stats: { volumePct: f.volumePct },
    };
  });
}

/* ————— fase 2: pratos, refeições e peso ————— */

const DEFAULT_DISHES: Dish[] = [
  {
    id: "d-marmita",
    name: "Marmita de frango",
    icon: "🍱",
    ingredients: [
      { foodId: "arroz-branco", grams: 180 },
      { foodId: "feijao-carioca", grams: 120 },
      { foodId: "peito-frango", grams: 170 },
      { foodId: "brocolis", grams: 60 },
      { foodId: "azeite", grams: 5 },
    ],
  },
  {
    id: "d-shake",
    name: "Shake pré-treino",
    icon: "🥤",
    ingredients: [
      { foodId: "whey", grams: 30 },
      { foodId: "banana", grams: 70 },
      { foodId: "leite-integral", grams: 250 },
      { foodId: "aveia", grams: 30 },
      { foodId: "pasta-amendoim", grams: 15 },
    ],
  },
  {
    id: "d-bandejao",
    name: "Bandejão RU",
    icon: "🍽️",
    ingredients: [
      { foodId: "arroz-branco", grams: 200 },
      { foodId: "feijao-carioca", grams: 140 },
      { foodId: "carne-moida", grams: 120 },
      { foodId: "farofa", grams: 25 },
      { foodId: "alface", grams: 40 },
      { foodId: "tomate", grams: 50 },
    ],
  },
  {
    id: "d-cafe",
    name: "Café da manhã",
    icon: "🍳",
    ingredients: [
      { foodId: "pao-frances", grams: 100 },
      { foodId: "ovo", grams: 100 },
      { foodId: "requeijao", grams: 20 },
      { foodId: "banana", grams: 70 },
      { foodId: "cafe", grams: 100 },
    ],
  },
];

/** Registra um prato com leve variação de porção — vida real. */
function mealFromDish(
  dish: Dish,
  date: string,
  minutes: number,
  factor: number,
  n: number
): MealEntry {
  const m = dishMacros(dish);
  return {
    id: `seed-m-${date}-${n}`,
    date,
    minutes,
    name: dish.name,
    grams: Math.round(dishGrams(dish) * factor),
    macros: { kcal: m.kcal * factor, prot: m.prot * factor, carb: m.carb * factor, fat: m.fat * factor },
    source: { kind: "dish", id: dish.id },
  };
}

function makeMeals(weeks: number, trainingDates: Set<string>, rnd: () => number): MealEntry[] {
  const out: MealEntry[] = [];
  const today = new Date();
  const start = addDays(today, -(weeks * 7 - 1));
  const [cafe, marmita, shake, bandejao] = [
    DEFAULT_DISHES[3],
    DEFAULT_DISHES[0],
    DEFAULT_DISHES[1],
    DEFAULT_DISHES[2],
  ];
  for (let d = 0; ; d++) {
    const date = addDays(start, d);
    const iso = toISO(date);
    if (iso >= toISO(today)) break; // história até ontem; hoje é seu
    // uns 8% dos dias sem registro — semana 4 morre em todo app; aqui só afina
    if (rnd() < 0.08) continue;
    let n = 0;
    const f = () => 0.92 + rnd() * 0.24;
    out.push(mealFromDish(cafe, iso, 7 * 60 + 30 + Math.floor(rnd() * 40), f(), n++));
    out.push(mealFromDish(marmita, iso, 12 * 60 + 15 + Math.floor(rnd() * 60), f(), n++));
    if (trainingDates.has(iso)) {
      out.push(mealFromDish(shake, iso, 17 * 60 + 20 + Math.floor(rnd() * 40), 1, n++));
    }
    out.push(mealFromDish(bandejao, iso, 19 * 60 + 30 + Math.floor(rnd() * 50), f(), n++));
    // lanche da noite em boa parte dos dias
    if (rnd() < 0.55) {
      out.push(mealFromDish(shake, iso, 21 * 60 + 40, 0.6, n++));
    }
  }
  return out;
}

function makeWeights(weeks: number, rnd: () => number): WeightEntry[] {
  const out: WeightEntry[] = [];
  const today = new Date();
  const start = addDays(today, -(weeks * 7 - 1));
  const startKg = 74.2;
  const perDay = 0.35 / 7; // bulking moderado: ~0,35kg/semana
  for (let d = 0; d < weeks * 7; d += 3 + Math.floor(rnd() * 2)) {
    const date = addDays(start, d);
    if (toISO(date) > toISO(today)) break;
    const kg = startKg + perDay * d + (rnd() - 0.5) * 0.5;
    out.push({ date: toISO(date), kg: +kg.toFixed(1) });
  }
  return out;
}

function makeProfile(weightKg: number): Profile {
  const base: Profile = {
    sex: "M",
    age: 22,
    heightCm: 178,
    activity: 1.55,
    goal: "bulk",
    targets: { kcal: 0, prot: 0, carb: 0, fat: 0 },
    hideNumbers: false,
  };
  return { ...base, targets: defaultTargets(base, weightKg) };
}

interface Phase2Data {
  profile: Profile;
  dishes: Dish[];
  meals: MealEntry[];
  weights: WeightEntry[];
}

function buildPhase2(trainingDates: Set<string>): Phase2Data {
  const rnd = mulberry32(20260718 ^ 0xbeef);
  const weeks = 9;
  const weights = makeWeights(weeks, rnd);
  const lastKg = weights.length ? weights[weights.length - 1].kg : 75;
  return {
    profile: makeProfile(lastKg),
    dishes: DEFAULT_DISHES,
    meals: makeMeals(weeks, trainingDates, rnd),
    weights,
  };
}

/* ————— fase 3: desafio de demonstração ————— */

function buildSeedChallenge(): Challenge {
  const today = new Date();
  const start = addDays(today, -11);
  const end = addDays(start, 29); // 30 dias, inclusivo
  return {
    id: "c-desafio-30",
    name: "Desafio dos 30",
    startsOn: toISO(start),
    endsOn: toISO(end),
  };
}

type StateV1 = Omit<AppState, "profile" | "dishes" | "meals" | "weights" | "challenges">;
type StateV2 = Omit<AppState, "challenges">;

/** Migra um estado v1 (Fase 1) preservando treinos e presença do usuário. */
export function migrateV1toV2(v1: StateV1): StateV2 {
  const me = v1.members.find((m) => m.isMe);
  const phase2 = buildPhase2(new Set(me?.presence ?? []));
  return { ...v1, ...phase2, version: 2 };
}

/** v2 → v3: entra o desafio (Fase 3) e as stats dos amigos de demonstração. */
export function migrateV2toV3(v2: StateV2): AppState {
  const demoStats: Record<string, number> = {
    "m-lucas": 8,
    "m-matheus": 3,
    "m-rafa": 12,
    "m-joao": 0,
  };
  return {
    ...v2,
    members: v2.members.map((m) =>
      m.stats === undefined && demoStats[m.id] !== undefined
        ? { ...m, stats: { volumePct: demoStats[m.id] } }
        : m
    ),
    challenges: [buildSeedChallenge()],
    version: 3,
  };
}

export function buildSeedState(): AppState {
  const rnd = mulberry32(20260718);
  const weeks = 9;
  const workouts = DEFAULT_WORKOUTS;
  const sessions = makeHistory(workouts, weeks, rnd);
  const me: Member = {
    id: "m-pedro",
    name: "Pedro",
    initials: "PE",
    color: "#e4573d",
    isMe: true,
    presence: sessions.map((s) => s.date),
  };
  const phase2 = buildPhase2(new Set(me.presence));
  return {
    version: 3,
    userName: "Pedro",
    workouts,
    sessions,
    members: [me, ...makeFriends(weeks, rnd)],
    activeSessionId: null,
    ...phase2,
    challenges: [buildSeedChallenge()],
  };
}
