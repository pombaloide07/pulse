import type { AppState, FoodMacros, Goal } from "./types";
import { addDays, toISO, todayISO } from "./dates";
import { personalRecords, volumeTrendPct, weeklyVolume } from "./logic";
import { latestWeight, periodAvg, sortedWeights } from "./nutrition";

/**
 * Blocos que um usuário pode liberar pra cada amigo (friend_view filtra no
 * servidor pelo share daquela direção). O app publica o blob COMPLETO em
 * profiles.shared — quem corta o que cada amigo vê é o banco, nunca o cliente
 * do amigo.
 */
export interface SharedBlob {
  updatedAt: string;
  presence: { dates: string[] };
  treino: {
    volumePct: number | null;
    /** volume (kg) das últimas 8 semanas, da mais antiga pra atual */
    weekVolumes: number[];
    prs: { name: string; load: number }[];
  };
  metas: { goal: Goal; targets: FoodMacros; hideNumbers: boolean };
  dieta: { protAvg7: number; protAvg28: number; kcalAvg28: number };
  peso: { current: number | null; delta4w: number | null };
}

export type ShareKey = "presence" | "treino" | "metas" | "dieta" | "peso";

export const SHARE_KEYS: { key: ShareKey; label: string; desc: string; default: boolean }[] = [
  { key: "presence", label: "Presença", desc: "dias treinados e constância", default: true },
  { key: "treino", label: "Progressão de carga", desc: "volume semanal, recordes e variação %", default: true },
  { key: "metas", label: "Metas", desc: "objetivo e metas de kcal/proteína", default: false },
  { key: "dieta", label: "Dieta (médias)", desc: "média de proteína e calorias", default: false },
  { key: "peso", label: "Peso", desc: "peso atual e variação de 4 semanas", default: false },
];

/** Monta o blob compartilhável a partir do estado local (sem dados de demo). */
export function buildSharedBlob(state: AppState): SharedBlob {
  const me = state.members.find((m) => m.isMe);
  const since = toISO(addDays(new Date(), -63));
  const today = todayISO();
  const real = { ...state, sessions: state.sessions.filter((s) => !s.id.startsWith("seed-")) };

  const avg7 = periodAvg(state, 7);
  const avg28 = periodAvg(state, 28);

  const weights = sortedWeights(state);
  const cutoff = toISO(addDays(new Date(), -28));
  const current = latestWeight(state);
  const before = weights.filter((w) => w.date <= cutoff);
  const start = before.length ? before[before.length - 1] : null;
  const delta4w =
    current !== null && start ? +(current - start.kg).toFixed(1) : null;

  return {
    updatedAt: new Date().toISOString(),
    presence: {
      dates: (me?.presence ?? []).filter((d) => d >= since && d <= today).sort(),
    },
    treino: {
      volumePct: volumeTrendPct(state, { excludeSeeds: true }),
      weekVolumes: weeklyVolume(real, 8).map((w) => Math.round(w.volume)),
      prs: personalRecords(real)
        .slice(0, 5)
        .map((p) => ({ name: p.name, load: p.load })),
    },
    metas: {
      goal: state.profile.goal,
      targets: state.profile.targets,
      hideNumbers: state.profile.hideNumbers,
    },
    dieta: {
      protAvg7: avg7.prot,
      protAvg28: avg28.prot,
      kcalAvg28: avg28.kcal,
    },
    peso: { current, delta4w },
  };
}
