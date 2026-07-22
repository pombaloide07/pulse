import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AppState,
  Challenge,
  Dish,
  MealEntry,
  PlanItem,
  Profile,
  Session,
  Workout,
} from "./types";
import { buildFreshState, buildSeedState, migrateV1toV2, migrateV2toV3 } from "./seed";
import { fromISO, todayISO } from "./dates";

const STORAGE_KEY = "pulse-state-v1";

type Action =
  | { type: "START_SESSION"; workoutId: string; sessionId: string }
  | { type: "QUICK_LOG"; workoutId: string; sessionId: string; date: string }
  | { type: "SET_LOG"; sessionId: string; exerciseId: string; setIndex: number; load: number; reps: number }
  | { type: "TOGGLE_SET"; sessionId: string; exerciseId: string; setIndex: number }
  | { type: "FINISH_SESSION"; sessionId: string }
  | { type: "DISCARD_SESSION"; sessionId: string }
  | { type: "UPDATE_WORKOUT"; workout: Workout }
  | { type: "ADD_PLAN_ITEM"; workoutId: string; item: PlanItem }
  | { type: "REMOVE_PLAN_ITEM"; workoutId: string; exerciseId: string }
  | { type: "SET_PROFILE"; patch: Partial<Profile> }
  | { type: "LOG_MEALS"; entries: MealEntry[] }
  | { type: "REMOVE_MEAL"; id: string }
  | { type: "ADD_DISH"; dish: Dish }
  | { type: "UPDATE_DISH"; dish: Dish }
  | { type: "DELETE_DISH"; id: string }
  | { type: "LOG_WEIGHT"; date: string; kg: number }
  | { type: "ADD_CHALLENGE"; challenge: Challenge }
  | { type: "ONBOARD"; name: string }
  | { type: "HYDRATE"; state: AppState }
  | { type: "RESET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "START_SESSION": {
      // activeSessionId órfão (sessão sumiu num HYDRATE/RESET) não pode
      // bloquear treino novo pra sempre — só bloqueia se a sessão existe
      const activeExists =
        state.activeSessionId && state.sessions.some((s) => s.id === state.activeSessionId);
      if (activeExists || state.sessions.some((s) => s.id === action.sessionId)) return state;
      const workout = state.workouts.find((w) => w.id === action.workoutId);
      if (!workout) return state;
      const session: Session = {
        id: action.sessionId,
        workoutId: workout.id,
        date: todayISO(),
        startedAt: Date.now(),
        finishedAt: null,
        logs: workout.items.map((item) => ({
          exerciseId: item.exerciseId,
          sets: Array.from({ length: item.sets }, () => ({
            load: item.targetLoad,
            reps: item.targetReps,
            done: false,
          })),
        })),
      };
      return {
        ...state,
        sessions: [...state.sessions, session],
        activeSessionId: session.id,
      };
    }
    case "QUICK_LOG": {
      // registro rápido: treino de hoje ou de um dia anterior lançado como
      // planejado (todas as séries feitas no alvo) — presença conta no dia
      if (state.sessions.some((s) => s.id === action.sessionId)) return state;
      const workout = state.workouts.find((w) => w.id === action.workoutId);
      if (!workout) return state;
      // meio-dia local do dia lançado: ordena direito na rotação/progressão
      const when = fromISO(action.date).getTime() + 12 * 3600 * 1000;
      const session: Session = {
        id: action.sessionId,
        workoutId: workout.id,
        date: action.date,
        startedAt: when,
        finishedAt: when,
        logs: workout.items.map((item) => ({
          exerciseId: item.exerciseId,
          sets: Array.from({ length: item.sets }, () => ({
            load: item.targetLoad,
            reps: item.targetReps,
            done: true,
          })),
        })),
      };
      return {
        ...state,
        sessions: [...state.sessions, session],
        members: state.members.map((m) =>
          m.isMe && !m.presence.includes(action.date)
            ? { ...m, presence: [...m.presence, action.date] }
            : m
        ),
      };
    }
    case "SET_LOG":
    case "TOGGLE_SET": {
      return {
        ...state,
        sessions: state.sessions.map((s) => {
          if (s.id !== action.sessionId) return s;
          return {
            ...s,
            logs: s.logs.map((l) => {
              if (l.exerciseId !== action.exerciseId) return l;
              return {
                ...l,
                sets: l.sets.map((set, i) => {
                  if (i !== action.setIndex) return set;
                  return action.type === "TOGGLE_SET"
                    ? { ...set, done: !set.done }
                    : { ...set, load: action.load, reps: action.reps };
                }),
              };
            }),
          };
        }),
      };
    }
    case "FINISH_SESSION": {
      const session = state.sessions.find((s) => s.id === action.sessionId);
      if (!session) return state;
      return {
        ...state,
        activeSessionId: null,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId ? { ...s, finishedAt: Date.now() } : s
        ),
        members: state.members.map((m) =>
          m.isMe && !m.presence.includes(session.date)
            ? { ...m, presence: [...m.presence, session.date] }
            : m
        ),
      };
    }
    case "DISCARD_SESSION": {
      return {
        ...state,
        activeSessionId: null,
        sessions: state.sessions.filter((s) => s.id !== action.sessionId),
      };
    }
    case "UPDATE_WORKOUT": {
      return {
        ...state,
        workouts: state.workouts.map((w) => (w.id === action.workout.id ? action.workout : w)),
      };
    }
    case "ADD_PLAN_ITEM": {
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId && !w.items.some((i) => i.exerciseId === action.item.exerciseId)
            ? { ...w, items: [...w.items, action.item] }
            : w
        ),
      };
    }
    case "REMOVE_PLAN_ITEM": {
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId
            ? { ...w, items: w.items.filter((i) => i.exerciseId !== action.exerciseId) }
            : w
        ),
      };
    }
    case "SET_PROFILE": {
      return { ...state, profile: { ...state.profile, ...action.patch } };
    }
    case "LOG_MEALS": {
      const ids = new Set(state.meals.map((m) => m.id));
      return {
        ...state,
        meals: [...state.meals, ...action.entries.filter((e) => !ids.has(e.id))],
      };
    }
    case "REMOVE_MEAL": {
      return { ...state, meals: state.meals.filter((m) => m.id !== action.id) };
    }
    case "ADD_DISH": {
      if (state.dishes.some((d) => d.id === action.dish.id)) return state;
      return { ...state, dishes: [...state.dishes, action.dish] };
    }
    case "UPDATE_DISH": {
      return {
        ...state,
        dishes: state.dishes.map((d) => (d.id === action.dish.id ? action.dish : d)),
      };
    }
    case "DELETE_DISH": {
      return { ...state, dishes: state.dishes.filter((d) => d.id !== action.id) };
    }
    case "LOG_WEIGHT": {
      const others = state.weights.filter((w) => w.date !== action.date);
      return { ...state, weights: [...others, { date: action.date, kg: action.kg }] };
    }
    case "ADD_CHALLENGE": {
      if (state.challenges.some((c) => c.id === action.challenge.id)) return state;
      return { ...state, challenges: [...state.challenges, action.challenge] };
    }
    case "ONBOARD": {
      // conta real começando do zero: nome da pessoa, sem dados de demonstração
      return buildFreshState(action.name);
    }
    case "HYDRATE": {
      // estado vindo do sync (Supabase) — substitui o local se for válido.
      // Valida o mínimo estrutural: um snapshot corrompido na nuvem não pode
      // derrubar o app inteiro (as telas assumem que existe um membro isMe).
      const sane = (s: AppState) =>
        Array.isArray(s.members) &&
        s.members.some((m) => m?.isMe) &&
        Array.isArray(s.workouts) &&
        s.workouts.length > 0 &&
        Array.isArray(s.sessions);
      if (action.state?.version === 3) return sane(action.state) ? action.state : state;
      if (action.state?.version === 2) {
        const migrated = migrateV2toV3(action.state);
        return sane(migrated) ? migrated : state;
      }
      if (action.state?.version === 1) {
        // mesmo caminho de migração do loadInitial — um v1 na nuvem não pode
        // ser descartado e depois atropelado pelo push local
        const migrated = migrateV2toV3(migrateV1toV2(action.state));
        return sane(migrated) ? migrated : state;
      }
      return state;
    }
    case "RESET":
      return buildSeedState();
    default:
      return state;
  }
}

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === 3) return parsed;
      if (parsed.version === 2) return migrateV2toV3(parsed);
      if (parsed.version === 1) return migrateV2toV3(migrateV1toV2(parsed));
    }
  } catch {
    /* seed abaixo */
  }
  return buildSeedState();
}

const StoreCtx = createContext<{ state: AppState; dispatch: (a: Action) => void } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* localStorage cheio/indisponível: segue sem persistir */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore fora do StoreProvider");
  return ctx;
}
