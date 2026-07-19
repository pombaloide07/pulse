import type { AppState, Challenge, Member, Session, Workout } from "./types";
import { EXERCISE_BY_ID } from "./exercises";
import { currentWeekISO, diffDays, fromISO, mondayOf, toISO, todayISO } from "./dates";

/* ————— rotação do plano ————— */

/** Próximo treino: continua a rotação a partir da última sessão concluída. */
export function nextWorkout(state: AppState): Workout {
  const done = state.sessions
    .filter((s) => s.finishedAt)
    .sort((a, b) => a.startedAt - b.startedAt);
  const last = done[done.length - 1];
  if (!last) return state.workouts[0];
  const idx = state.workouts.findIndex((w) => w.id === last.workoutId);
  return state.workouts[(idx + 1) % state.workouts.length] ?? state.workouts[0];
}

/* ————— coerência plano × realidade ————— */

export interface CoherenceItem {
  exerciseId: string;
  name: string;
  plannedSets: number;
  doneSets: number;
  targetLoad: number;
  topLoad: number;
  /** kg acima (+) ou abaixo (−) do alvo; null se pulado */
  loadDelta: number | null;
  skipped: boolean;
  isRecord: boolean;
}

export interface CoherenceReading {
  items: CoherenceItem[];
  doneExercises: number;
  plannedExercises: number;
  /** 0–1, proporção de séries feitas */
  ratio: number;
  loadUps: CoherenceItem[];
  records: CoherenceItem[];
  skips: CoherenceItem[];
}

export function readCoherence(state: AppState, session: Session): CoherenceReading {
  const workout = state.workouts.find((w) => w.id === session.workoutId);
  const items: CoherenceItem[] = [];
  let plannedSetsTotal = 0;
  let doneSetsTotal = 0;

  for (const item of workout?.items ?? []) {
    const log = session.logs.find((l) => l.exerciseId === item.exerciseId);
    const doneSets = log ? log.sets.filter((s) => s.done).length : 0;
    const topLoad = log ? Math.max(0, ...log.sets.filter((s) => s.done).map((s) => s.load)) : 0;
    const skipped = doneSets === 0;
    plannedSetsTotal += item.sets;
    doneSetsTotal += Math.min(doneSets, item.sets);
    const prevBest = bestLoadBefore(state, item.exerciseId, session.id);
    items.push({
      exerciseId: item.exerciseId,
      name: EXERCISE_BY_ID[item.exerciseId]?.name ?? item.exerciseId,
      plannedSets: item.sets,
      doneSets,
      targetLoad: item.targetLoad,
      topLoad,
      loadDelta: skipped ? null : topLoad - item.targetLoad,
      skipped,
      isRecord: !skipped && topLoad > 0 && topLoad > prevBest,
    });
  }

  const doneExercises = items.filter((i) => !i.skipped).length;
  return {
    items,
    doneExercises,
    plannedExercises: items.length,
    ratio: plannedSetsTotal ? doneSetsTotal / plannedSetsTotal : 0,
    loadUps: items.filter((i) => (i.loadDelta ?? 0) > 0),
    records: items.filter((i) => i.isRecord),
    skips: items.filter((i) => i.skipped),
  };
}

function bestLoadBefore(state: AppState, exerciseId: string, excludeSessionId: string): number {
  let best = 0;
  for (const s of state.sessions) {
    if (s.id === excludeSessionId || !s.finishedAt) continue;
    const log = s.logs.find((l) => l.exerciseId === exerciseId);
    if (!log) continue;
    for (const set of log.sets) if (set.done && set.load > best) best = set.load;
  }
  return best;
}

/* ————— progressão ————— */

export interface ProgressPoint {
  date: string;
  topLoad: number;
  volume: number;
}

export function progression(state: AppState, exerciseId: string): ProgressPoint[] {
  const pts: ProgressPoint[] = [];
  const sorted = [...state.sessions]
    .filter((s) => s.finishedAt)
    .sort((a, b) => a.startedAt - b.startedAt);
  for (const s of sorted) {
    const log = s.logs.find((l) => l.exerciseId === exerciseId);
    if (!log) continue;
    const done = log.sets.filter((x) => x.done);
    if (!done.length) continue;
    pts.push({
      date: s.date,
      topLoad: Math.max(...done.map((x) => x.load)),
      volume: done.reduce((acc, x) => acc + x.load * x.reps, 0),
    });
  }
  return pts;
}

/** Exercícios que aparecem no histórico, ordenados por frequência. */
export function trackedExercises(state: AppState): string[] {
  const count = new Map<string, number>();
  for (const s of state.sessions) {
    if (!s.finishedAt) continue;
    for (const l of s.logs) {
      if (l.sets.some((x) => x.done)) count.set(l.exerciseId, (count.get(l.exerciseId) ?? 0) + 1);
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export interface PlateauInfo {
  weeks: number;
  load: number;
}

/** Carga máxima estável há ≥4 semanas = sinal de platô (informa, não julga). */
export function plateau(points: ProgressPoint[]): PlateauInfo | null {
  if (points.length < 4) return null;
  const last = points[points.length - 1];
  let firstAtLoad = last.date;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].topLoad === last.topLoad) firstAtLoad = points[i].date;
    else break;
  }
  const weeks = Math.floor(diffDays(last.date, firstAtLoad) / 7);
  return weeks >= 4 ? { weeks, load: last.topLoad } : null;
}

export interface PR {
  exerciseId: string;
  name: string;
  load: number;
  date: string;
}

export function personalRecords(state: AppState): PR[] {
  const best = new Map<string, { load: number; date: string }>();
  for (const s of state.sessions) {
    if (!s.finishedAt) continue;
    for (const l of s.logs) {
      for (const set of l.sets) {
        if (!set.done || set.load <= 0) continue;
        const cur = best.get(l.exerciseId);
        if (!cur || set.load > cur.load) best.set(l.exerciseId, { load: set.load, date: s.date });
      }
    }
  }
  return [...best.entries()]
    .map(([exerciseId, v]) => ({
      exerciseId,
      name: EXERCISE_BY_ID[exerciseId]?.name ?? exerciseId,
      ...v,
    }))
    .sort((a, b) => b.load - a.load);
}

/** Volume total (kg levantados) por semana, últimas n semanas. */
export function weeklyVolume(state: AppState, nWeeks = 8): { week: string; volume: number }[] {
  const out: { week: string; volume: number }[] = [];
  const thisMonday = mondayOf(new Date());
  for (let i = nWeeks - 1; i >= 0; i--) {
    const mon = new Date(thisMonday);
    mon.setDate(mon.getDate() - i * 7);
    const monIso = toISO(mon);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    const sunIso = toISO(sun);
    let volume = 0;
    for (const s of state.sessions) {
      if (!s.finishedAt || s.date < monIso || s.date > sunIso) continue;
      for (const l of s.logs)
        for (const set of l.sets) if (set.done) volume += set.load * set.reps;
    }
    out.push({ week: monIso, volume });
  }
  return out;
}

/* ————— presença ————— */

export function presentOn(member: Member, iso: string): boolean {
  return member.presence.includes(iso);
}

export function presentToday(member: Member): boolean {
  return presentOn(member, todayISO());
}

/** Presenças na semana corrente (seg→dom). */
export function weekPresence(member: Member): boolean[] {
  return currentWeekISO().map((d) => presentOn(member, d));
}

/** Semanas seguidas (contando esta) com ao menos uma presença. */
export function weekStreak(member: Member): number {
  const set = new Set(member.presence.map((d) => toISO(mondayOf(fromISO(d)))));
  let streak = 0;
  const mon = mondayOf(new Date());
  for (;;) {
    if (set.has(toISO(mon))) {
      streak++;
      mon.setDate(mon.getDate() - 7);
    } else break;
  }
  return streak;
}

export function sessionsThisWeek(member: Member): number {
  return weekPresence(member).filter(Boolean).length;
}

/* ————— desafios (Fase 3) ————— */

export interface ChallengeStanding {
  member: Member;
  /** dias com presença dentro do prazo */
  checkins: number;
  /** 1-based; empates dividem a posição */
  rank: number;
}

export interface ChallengeView {
  challenge: Challenge;
  totalDays: number;
  /** dia corrente do desafio, 1..totalDays */
  dayNumber: number;
  ended: boolean;
  standings: ChallengeStanding[];
  champions: Member[];
}

/**
 * Check-in = presença: concluir treino num dia do prazo pontua aquele dia.
 * Ranking por contagem — presença, nunca corpo (§11).
 */
export function readChallenge(
  challenge: Challenge,
  members: Member[],
  today = todayISO()
): ChallengeView {
  const totalDays = diffDays(challenge.endsOn, challenge.startsOn) + 1;
  const ended = today > challenge.endsOn;
  const cursor = ended ? challenge.endsOn : today;
  const dayNumber = Math.min(
    totalDays,
    Math.max(1, diffDays(cursor, challenge.startsOn) + 1)
  );

  const counted = members.map((member) => ({
    member,
    checkins: new Set(
      member.presence.filter((d) => d >= challenge.startsOn && d <= cursor)
    ).size,
  }));
  counted.sort(
    (a, b) => b.checkins - a.checkins || a.member.name.localeCompare(b.member.name)
  );

  let lastRank = 1;
  const standings: ChallengeStanding[] = counted.map((c, i) => {
    if (i === 0 || counted[i - 1].checkins !== c.checkins) lastRank = i + 1;
    return { ...c, rank: lastRank };
  });

  const top = standings[0]?.checkins ?? 0;
  return {
    challenge,
    totalDays,
    dayNumber,
    ended,
    standings,
    champions: ended && top > 0
      ? standings.filter((s) => s.checkins === top).map((s) => s.member)
      : [],
  };
}

/** O desafio em andamento (ou o mais recente, se todos encerraram). */
export function currentChallenge(challenges: Challenge[]): Challenge | null {
  if (!challenges.length) return null;
  const today = todayISO();
  const active = challenges
    .filter((c) => c.startsOn <= today && today <= c.endsOn)
    .sort((a, b) => (a.startsOn < b.startsOn ? 1 : -1));
  if (active.length) return active[0];
  return [...challenges].sort((a, b) => (a.endsOn < b.endsOn ? 1 : -1))[0];
}
