import type { AppState, NotifyPrefs, ScheduleDay } from "./types";
import { REST_DAY } from "./types";
import { getSchedule } from "./logic";

/** Prefs padrão: dias de treino lembram às 18h, dias de descanso não. */
export function defaultNotify(schedule: ScheduleDay[]): NotifyPrefs {
  return {
    enabled: false,
    train: true,
    checkins: true,
    macros: true,
    streak: true,
    challenge: true,
    trainTimes: schedule.map((d) => (d === REST_DAY ? "" : "18:00")),
  };
}

/** Prefs do estado com fallback (contas antigas e demo). */
export function getNotify(state: AppState): NotifyPrefs {
  const base = defaultNotify(getSchedule(state));
  if (!state.notify) return base;
  const t = state.notify.trainTimes;
  return {
    ...base,
    ...state.notify,
    trainTimes: Array.isArray(t) && t.length === 7 ? t : base.trainTimes,
  };
}
