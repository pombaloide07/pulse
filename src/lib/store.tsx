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
  ExerciseLog,
  MealEntry,
  NotifyPrefs,
  PlanItem,
  Profile,
  ScheduleDay,
  Session,
  Workout,
} from "./types";
import { buildFreshState, buildSeedState, migrateV1toV2, migrateV2toV3 } from "./seed";
import { defaultSchedule } from "./logic";
import { getNotify } from "./notify";
import { initialsOf } from "./format";
import { fromISO, todayISO } from "./dates";

const STORAGE_KEY = "pulse-state-v1";

type Action =
  | { type: "START_SESSION"; workoutId: string; sessionId: string }
  | { type: "QUICK_LOG"; workoutId: string; sessionId: string; date: string }
  | { type: "SET_LOG"; sessionId: string; exerciseId: string; setIndex: number; load: number; reps: number }
  | { type: "TOGGLE_SET"; sessionId: string; exerciseId: string; setIndex: number }
  | { type: "FINISH_SESSION"; sessionId: string }
  | { type: "DELETE_SESSION"; sessionId: string }
  | { type: "SET_SESSION_DATE"; sessionId: string; date: string }
  | {
      type: "ADD_SESSION_EXERCISE";
      sessionId: string;
      exerciseId: string;
      sets: number;
      reps: number;
      load: number;
    }
  | {
      type: "REPLACE_SESSION_EXERCISE";
      sessionId: string;
      fromExerciseId: string;
      toExerciseId: string;
      reps: number;
      load: number;
    }
  | { type: "REMOVE_SESSION_EXERCISE"; sessionId: string; exerciseId: string }
  | { type: "ADD_SESSION_SET"; sessionId: string; exerciseId: string }
  | { type: "REMOVE_SESSION_SET"; sessionId: string; exerciseId: string }
  | { type: "UPDATE_WORKOUT"; workout: Workout }
  | { type: "ADD_WORKOUT"; workout: Workout }
  | { type: "DELETE_WORKOUT"; id: string }
  | { type: "SET_SCHEDULE_DAY"; day: number; value: ScheduleDay }
  | { type: "ADD_PLAN_ITEM"; workoutId: string; item: PlanItem }
  | { type: "REMOVE_PLAN_ITEM"; workoutId: string; exerciseId: string }
  | { type: "SET_PROFILE"; patch: Partial<Profile> }
  | { type: "SET_NOTIFY"; patch: Partial<NotifyPrefs> }
  | { type: "SET_NAME"; name: string }
  | { type: "LOG_MEALS"; entries: MealEntry[] }
  | { type: "UPDATE_MEAL"; entry: MealEntry }
  | { type: "REMOVE_MEAL"; id: string }
  | { type: "ADD_DISH"; dish: Dish }
  | { type: "UPDATE_DISH"; dish: Dish }
  | { type: "DELETE_DISH"; id: string }
  | { type: "LOG_WEIGHT"; date: string; kg: number }
  | { type: "REMOVE_WEIGHT"; date: string }
  | { type: "ADD_CHALLENGE"; challenge: Challenge }
  | { type: "ONBOARD"; name: string }
  | { type: "HYDRATE"; state: AppState }
  | { type: "RESET" };

/**
 * Tira uma data da minha presença — mas só se nenhum outro treino concluído
 * tiver sobrado nela. Subtrai em vez de recalcular a lista inteira: dá pra ter
 * dois treinos no mesmo dia, e presença antiga vinda de outro aparelho não
 * pode sumir só porque a sessão dela não está neste.
 */
function forgetPresence(state: AppState, iso: string): AppState {
  if (state.sessions.some((s) => s.finishedAt && s.date === iso)) return state;
  return {
    ...state,
    members: state.members.map((m) =>
      m.isMe ? { ...m, presence: m.presence.filter((d) => d !== iso) } : m
    ),
  };
}

function markPresence(state: AppState, iso: string): AppState {
  return {
    ...state,
    members: state.members.map((m) =>
      m.isMe && !m.presence.includes(iso) ? { ...m, presence: [...m.presence, iso] } : m
    ),
  };
}

/** Aplica uma mudança nos logs de uma sessão, preservando o resto do estado. */
function patchLogs(
  state: AppState,
  sessionId: string,
  fn: (logs: ExerciseLog[]) => ExerciseLog[]
): AppState {
  return {
    ...state,
    sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, logs: fn(s.logs) } : s)),
  };
}

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
      // treino já concluído não reescreve finishedAt: reabrir pra corrigir uma
      // carga não pode mudar a duração nem a ordem da rotação
      if (session.finishedAt) return state;
      return markPresence(
        {
          ...state,
          activeSessionId: null,
          sessions: state.sessions.map((s) =>
            s.id === action.sessionId ? { ...s, finishedAt: Date.now() } : s
          ),
        },
        session.date
      );
    }
    case "DELETE_SESSION": {
      const session = state.sessions.find((s) => s.id === action.sessionId);
      if (!session) return state;
      const next: AppState = {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== action.sessionId),
        activeSessionId:
          state.activeSessionId === action.sessionId ? null : state.activeSessionId,
      };
      // treino em andamento nunca marcou presença; concluído pode ter marcado
      return session.finishedAt ? forgetPresence(next, session.date) : next;
    }
    case "SET_SESSION_DATE": {
      const session = state.sessions.find((s) => s.id === action.sessionId);
      if (!session || session.date === action.date) return state;
      // meio-dia do dia novo: mantém a ordem certa na rotação e na progressão
      const when = fromISO(action.date).getTime() + 12 * 3600 * 1000;
      const moved: AppState = {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? { ...s, date: action.date, startedAt: when, finishedAt: s.finishedAt ? when : null }
            : s
        ),
      };
      if (!session.finishedAt) return moved;
      // a presença acompanha: entra no dia novo, sai do antigo se ficou vazio
      return forgetPresence(markPresence(moved, action.date), session.date);
    }
    case "ADD_SESSION_EXERCISE": {
      return patchLogs(state, action.sessionId, (logs) =>
        logs.some((l) => l.exerciseId === action.exerciseId)
          ? logs
          : [
              ...logs,
              {
                exerciseId: action.exerciseId,
                extra: true,
                sets: Array.from({ length: action.sets }, () => ({
                  load: action.load,
                  reps: action.reps,
                  done: false,
                })),
              },
            ]
      );
    }
    case "REPLACE_SESSION_EXERCISE": {
      return patchLogs(state, action.sessionId, (logs) =>
        logs.some((l) => l.exerciseId === action.toExerciseId)
          ? logs
          : logs.map((l) => {
              if (l.exerciseId !== action.fromExerciseId) return l;
              // série já marcada não é reescrita — a carga do antigo viraria
              // recorde do novo. A tela só oferece trocar enquanto está zerado.
              if (l.sets.some((x) => x.done)) return l;
              return {
                exerciseId: action.toExerciseId,
                // continua ocupando a vaga do plano: não é extra nem pulado
                replacedId: l.replacedId ?? action.fromExerciseId,
                sets: l.sets.map(() => ({ load: action.load, reps: action.reps, done: false })),
              };
            })
      );
    }
    case "REMOVE_SESSION_EXERCISE": {
      return patchLogs(state, action.sessionId, (logs) =>
        logs.filter((l) => l.exerciseId !== action.exerciseId)
      );
    }
    case "ADD_SESSION_SET":
    case "REMOVE_SESSION_SET": {
      return patchLogs(state, action.sessionId, (logs) =>
        logs.map((l) => {
          if (l.exerciseId !== action.exerciseId) return l;
          if (action.type === "REMOVE_SESSION_SET") {
            return l.sets.length <= 1 ? l : { ...l, sets: l.sets.slice(0, -1) };
          }
          if (l.sets.length >= 12) return l;
          const last = l.sets[l.sets.length - 1] ?? { load: 0, reps: 10, done: false };
          return { ...l, sets: [...l.sets, { load: last.load, reps: last.reps, done: false }] };
        })
      );
    }
    case "UPDATE_WORKOUT": {
      return {
        ...state,
        workouts: state.workouts.map((w) => (w.id === action.workout.id ? action.workout : w)),
      };
    }
    case "ADD_WORKOUT": {
      if (state.workouts.some((w) => w.id === action.workout.id)) return state;
      return { ...state, workouts: [...state.workouts, action.workout] };
    }
    case "DELETE_WORKOUT": {
      // sempre resta ao menos um treino — a rotação e a agenda dependem disso
      if (state.workouts.length <= 1) return state;
      const schedule = (state.schedule ?? defaultSchedule(state.workouts)).map((d) =>
        d === action.id ? "rest" : d
      );
      // sessão ativa desse treino vira órfã (não tem mais plano) → encerra
      const activeWorkout = state.sessions.find(
        (s) => s.id === state.activeSessionId
      )?.workoutId;
      return {
        ...state,
        workouts: state.workouts.filter((w) => w.id !== action.id),
        schedule,
        activeSessionId: activeWorkout === action.id ? null : state.activeSessionId,
      };
    }
    case "SET_SCHEDULE_DAY": {
      const schedule = [...(state.schedule ?? defaultSchedule(state.workouts))];
      schedule[action.day] = action.value;
      return { ...state, schedule };
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
    case "SET_NOTIFY": {
      return { ...state, notify: { ...getNotify(state), ...action.patch } };
    }
    case "SET_NAME": {
      const clean = action.name.trim() || state.userName;
      return {
        ...state,
        userName: clean,
        members: state.members.map((m) =>
          m.isMe ? { ...m, name: clean, initials: initialsOf(clean) } : m
        ),
      };
    }
    case "LOG_MEALS": {
      const ids = new Set(state.meals.map((m) => m.id));
      return {
        ...state,
        meals: [...state.meals, ...action.entries.filter((e) => !ids.has(e.id))],
      };
    }
    case "UPDATE_MEAL": {
      return {
        ...state,
        meals: state.meals.map((m) => (m.id === action.entry.id ? action.entry : m)),
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
      // o limite deixou de ser só da tela: agora duas telas escrevem peso
      const kg = Math.min(300, Math.max(30, +action.kg.toFixed(1)));
      const others = state.weights.filter((w) => w.date !== action.date);
      return { ...state, weights: [...others, { date: action.date, kg }] };
    }
    case "REMOVE_WEIGHT": {
      return { ...state, weights: state.weights.filter((w) => w.date !== action.date) };
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
      // estado gravado por uma versão mais nova do app (outro aparelho já
      // atualizou): preserva. Cair no seed aqui apagaria dados de verdade.
      if (parsed.version >= 3) return parsed;
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
