export type MuscleGroup =
  | "Peito"
  | "Costas"
  | "Ombros"
  | "Bíceps"
  | "Tríceps"
  | "Pernas"
  | "Glúteos"
  | "Abdômen";

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: "Barra" | "Halteres" | "Máquina" | "Polia" | "Peso do corpo";
}

/** Um exercício dentro de um treino do plano. */
export interface PlanItem {
  exerciseId: string;
  sets: number;
  targetReps: number;
  /** kg; 0 = peso do corpo / sem alvo definido */
  targetLoad: number;
}

export interface Workout {
  id: string;
  /** "A", "B", "C"… */
  letter: string;
  name: string;
  items: PlanItem[];
}

/** Um dia no plano semanal: o id de um treino, ou "rest" (descanso). */
export type ScheduleDay = string;
export const REST_DAY = "rest";

export interface SetLog {
  load: number;
  reps: number;
  done: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface Session {
  id: string;
  workoutId: string;
  /** ISO yyyy-mm-dd */
  date: string;
  startedAt: number;
  finishedAt: number | null;
  logs: ExerciseLog[];
}

export interface Member {
  id: string;
  name: string;
  /** iniciais pro avatar */
  initials: string;
  color: string;
  isMe: boolean;
  /** datas ISO em que treinou */
  presence: string[];
  /** agregados inofensivos que o grupo pode ver (§11: nunca peso/foto) */
  stats?: { volumePct?: number };
}

/* ————— Fase 2: dieta e corpo ————— */

export interface FoodMacros {
  kcal: number;
  prot: number;
  carb: number;
  fat: number;
}

export type FoodGroup =
  | "Básicos"
  | "Proteínas"
  | "Padaria & lanches"
  | "Frutas"
  | "Verduras & legumes"
  | "Laticínios"
  | "Suplementos"
  | "Bebidas"
  | "Da vida real";

export interface Food {
  id: string;
  name: string;
  group: FoodGroup;
  /** macros por 100g (ou 100ml) */
  per100: FoodMacros;
  /** dica de porção: "1 un ≈ 50g" */
  unitName?: string;
  unitGrams?: number;
}

export interface DishIngredient {
  foodId: string;
  grams: number;
}

/** "Meus Pratos" — a marmita definida uma vez, registrada em um toque. */
export interface Dish {
  id: string;
  name: string;
  icon: string;
  ingredients: DishIngredient[];
}

export interface MealEntry {
  id: string;
  /** ISO yyyy-mm-dd */
  date: string;
  /** minutos do dia (0–1439) */
  minutes: number;
  name: string;
  grams: number;
  /** snapshot no momento do registro — editar um prato não reescreve o passado */
  macros: FoodMacros;
  source?: { kind: "dish" | "food"; id: string };
}

export type Goal = "bulk" | "cut" | "maint";

export interface Profile {
  sex: "M" | "F";
  age: number;
  heightCm: number;
  /** fator de atividade (1.2–1.9) */
  activity: number;
  goal: Goal;
  targets: FoodMacros;
  /** §11 — modo "só proteína e presença" */
  hideNumbers: boolean;
}

export interface WeightEntry {
  /** ISO yyyy-mm-dd */
  date: string;
  kg: number;
}

/* ————— Fase 3: desafios ————— */

/**
 * Desafio estilo GymRats: prazo + grupo + check-in (PRD §7.4).
 * O check-in é a presença: concluiu treino no dia, pontuou.
 */
export interface Challenge {
  id: string;
  name: string;
  /** ISO yyyy-mm-dd, inclusivo */
  startsOn: string;
  endsOn: string;
  createdBy?: string;
}

export interface AppState {
  version: number;
  userName: string;
  workouts: Workout[];
  /** agenda semanal seg→dom (7 itens); cada dia é um workoutId ou "rest" */
  schedule?: ScheduleDay[];
  sessions: Session[];
  members: Member[];
  /** id da sessão em andamento, se houver */
  activeSessionId: string | null;
  /* fase 2 */
  profile: Profile;
  dishes: Dish[];
  meals: MealEntry[];
  weights: WeightEntry[];
  /* fase 3 */
  challenges: Challenge[];
}
