import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "./store";
import { useSync } from "./sync";
import { getNotify } from "./notify";
import { getSchedule } from "./logic";
import { dayTotals } from "./nutrition";
import { diffDays, todayISO } from "./dates";

export type NotifType = "train" | "checkins" | "macros" | "streak" | "challenge";

export interface Notif {
  id: string;
  type: NotifType;
  emoji: string;
  title: string;
  body: string;
  /** epoch ms */
  ts: number;
  read: boolean;
  /** dedupe: um mesmo evento (por dia/limiar) só entra uma vez */
  key: string;
}

interface NotifValue {
  notifs: Notif[];
  unread: number;
  permission: NotificationPermission;
  enable: () => Promise<boolean>;
  markAllRead: () => void;
  clear: () => void;
}

const NotifCtx = createContext<NotifValue | null>(null);

const STORE_KEY = "pulse-notifs";
const SEEN_CHECKINS = "pulse-notif-checkins";
const RANK_SNAP = "pulse-notif-rank";
// flags "já fiz o baseline": distinguem o 1º load (silencioso) do 1º evento
// real (que notifica), mesmo quando o conjunto começa vazio
const BASE_CHECKINS = "pulse-notif-base-ci";
const BASE_RANK = "pulse-notif-base-rank";
const MAX = 60;

function flagSet(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ok */
  }
}

function loadNotifs(): Notif[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Notif[];
  } catch {
    /* vazio */
  }
  return [];
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* vazio */
  }
  return new Set();
}

function saveSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set].slice(-200)));
  } catch {
    /* ok */
  }
}

const hasNotificationApi = typeof window !== "undefined" && "Notification" in window;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const sync = useSync();
  const prefs = getNotify(state);

  const [notifs, setNotifs] = useState<Notif[]>(loadNotifs);
  const [permission, setPermission] = useState<NotificationPermission>(
    hasNotificationApi ? Notification.permission : "denied"
  );

  // persiste o inbox
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(notifs.slice(0, MAX)));
    } catch {
      /* ok */
    }
  }, [notifs]);

  // keys já vistas nesta sessão — decide dedupe + disparo do SO de forma
  // SÍNCRONA. Ler um flag logo após setNotifs não é confiável em rajada
  // (eager state do React só computa o 1º update; os seguintes ficam pendentes),
  // então o popup do 2º/3º evento sumiria. Inicia com as keys já persistidas
  // pra não re-disparar popup do que já estava no inbox ao recarregar.
  const knownKeysRef = useRef<Set<string> | null>(null);
  if (knownKeysRef.current === null) {
    knownKeysRef.current = new Set(notifs.map((n) => n.key));
  }

  /** adiciona ao inbox (dedupe por key) + dispara notificação do SO se puder */
  const push = useCallback(
    (n: Omit<Notif, "id" | "ts" | "read">, osToo = true) => {
      const known = knownKeysRef.current!;
      if (known.has(n.key)) return; // já vista nesta sessão
      known.add(n.key);
      setNotifs((prev) =>
        prev.some((x) => x.key === n.key)
          ? prev
          : [{ ...n, id: n.key, ts: Date.now(), read: false }, ...prev].slice(0, MAX)
      );
      // só dispara o popup do SO com permissão concedida
      if (osToo && hasNotificationApi && Notification.permission === "granted") {
        try {
          new Notification(`${n.emoji} ${n.title}`, { body: n.body, tag: n.key });
        } catch {
          /* alguns browsers exigem SW pra notificar; o inbox cobre */
        }
      }
    },
    []
  );

  const enable = useCallback(async () => {
    if (!hasNotificationApi) return false;
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    setPermission(perm);
    return perm === "granted";
  }, []);

  const markAllRead = useCallback(() => {
    setNotifs((prev) => (prev.some((n) => !n.read) ? prev.map((n) => ({ ...n, read: true })) : prev));
  }, []);

  const clear = useCallback(() => setNotifs([]), []);

  // logout num aparelho compartilhado: zera o inbox e os baselines pra não
  // vazar "fulano fez check-in" pra próxima conta. Só no logout de verdade
  // (tinha sessão e perdeu) — não no null transitório de cada reload.
  const prevSessionRef = useRef(sync.session);
  useEffect(() => {
    const had = prevSessionRef.current;
    prevSessionRef.current = sync.session;
    if (had && !sync.session) {
      setNotifs([]);
      knownKeysRef.current = new Set(); // esquece as keys da conta que saiu
      try {
        localStorage.removeItem(SEEN_CHECKINS);
        localStorage.removeItem(RANK_SNAP);
        // limpa também os flags de baseline — a próxima conta re-baseia do
        // zero (senão os check-ins dela virariam spam de notificação)
        localStorage.removeItem(BASE_CHECKINS);
        localStorage.removeItem(BASE_RANK);
      } catch {
        /* ok */
      }
    }
  }, [sync.session]);

  const active = prefs.enabled && !!sync.session;

  /* ————— detector: lembrete de treino (checa a cada minuto) ————— */
  const trainedToday = useMemo(() => {
    const me = state.members.find((m) => m.isMe);
    return !!me?.presence.includes(todayISO());
  }, [state.members]);

  useEffect(() => {
    if (!active || !prefs.train) return;
    const check = () => {
      if (trainedToday) return;
      const now = new Date();
      const dow = (now.getDay() + 6) % 7;
      const t = prefs.trainTimes[dow];
      if (!t) return;
      const [h, m] = t.split(":").map(Number);
      const mins = now.getHours() * 60 + now.getMinutes();
      if (mins < h * 60 + m) return; // ainda não deu a hora
      const workout = getSchedule(state);
      const label = workout[dow];
      push({
        type: "train",
        emoji: "🏋️",
        title: "Hora de treinar",
        body:
          label && label !== "rest"
            ? "Seu treino de hoje ainda está te esperando. Bora aparecer."
            : "Você ainda não treinou hoje. Que tal agora?",
        key: `train-${todayISO()}`,
      });
    };
    check();
    const id = window.setInterval(check, 60000);
    return () => window.clearInterval(id);
  }, [active, prefs.train, prefs.trainTimes, trainedToday, state, push]);

  /* ————— detector: macros perto do limite ————— */
  const targets = state.profile.targets;
  useEffect(() => {
    if (!active || !prefs.macros) return;
    const today = todayISO();
    const totals = dayTotals(state, today);
    const macros: { k: "kcal" | "carb" | "fat"; label: string; emoji: string }[] = [
      { k: "kcal", label: "calorias", emoji: "🔥" },
      { k: "carb", label: "carboidrato", emoji: "🍚" },
      { k: "fat", label: "gordura", emoji: "🥑" },
    ];
    for (const mm of macros) {
      const target = targets[mm.k];
      if (!target || target <= 0) continue;
      const pct = totals[mm.k] / target;
      // avisa entre 90% e 115% (perto do limite; passou muito não adianta avisar)
      if (pct >= 0.9 && pct <= 1.15) {
        const over = pct >= 1;
        push({
          type: "macros",
          emoji: mm.emoji,
          title: over ? `Você bateu a meta de ${mm.label}` : `Perto do limite de ${mm.label}`,
          body: `Hoje: ${Math.round(totals[mm.k])} de ${Math.round(target)}${mm.k === "kcal" ? " kcal" : "g"} (${Math.round(pct * 100)}%).`,
          key: `macro-${mm.k}-${today}`,
        });
      }
    }
  }, [active, prefs.macros, state, targets, push]);

  /* ————— detector: 7 dias seguindo o cronograma ————— */
  useEffect(() => {
    if (!active || !prefs.streak) return;
    const me = state.members.find((m) => m.isMe);
    if (!me) return;
    const sched = getSchedule(state);
    const presence = new Set(me.presence);
    // conta dias seguidos (a partir de hoje) em que o cronograma foi seguido:
    // dia de descanso passa; dia de treino precisa de presença
    let streak = 0;
    const cur = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(cur);
      d.setDate(cur.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dow = (d.getDay() + 6) % 7;
      const isRest = sched[dow] === "rest";
      if (isRest || presence.has(iso)) streak++;
      else break;
    }
    if (streak >= 7) {
      const milestone = Math.floor(streak / 7) * 7;
      push({
        type: "streak",
        emoji: "🎉",
        title: `${milestone} dias no ritmo!`,
        body:
          milestone === 7
            ? "Uma semana inteira seguindo o cronograma. É isso que constrói — orgulho!"
            : `${milestone} dias seguidos fiel ao plano. Você tá voando.`,
        key: `streak-${milestone}`,
      });
    }
  }, [active, prefs.streak, state, push]);

  /* ————— detector: check-in novo de alguém ————— */
  useEffect(() => {
    if (!active || !prefs.checkins || !sync.session) return;
    const checkins = sync.checkins;
    if (!checkins) return;
    const uid = sync.session.user.id;
    const seen = loadSet(SEEN_CHECKINS);
    const nameOf = (id: string) =>
      sync.friends?.find((f) => f.id === id)?.name ??
      sync.friendList?.find((f) => f.id === id)?.name ??
      "Alguém do grupo";
    // primeira carga: registra tudo sem notificar (evita spam ao abrir o app).
    // Flag persistente, não tamanho do conjunto — senão o 1º check-in real
    // (quando o conjunto ainda está vazio) seria engolido.
    const firstLoad = localStorage.getItem(BASE_CHECKINS) !== "1";
    let changed = false;
    for (const c of checkins) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      changed = true;
      if (firstLoad || c.userId === uid || c.date !== todayISO()) continue;
      push({
        type: "checkins",
        emoji: "📸",
        title: "Check-in novo",
        body: `${nameOf(c.userId)} acabou de fazer check-in. Não fica pra trás.`,
        key: `checkin-${c.id}`,
      });
    }
    if (changed) saveSet(SEEN_CHECKINS, seen);
    if (firstLoad) flagSet(BASE_CHECKINS);
  }, [active, prefs.checkins, sync.checkins, sync.session, sync.friends, sync.friendList, push]);

  /* ————— detector: te passaram / desafio acabando ————— */
  useEffect(() => {
    if (!active || !prefs.challenge || !sync.session) return;
    const challenges = sync.challenges;
    const checkins = sync.checkins;
    if (!challenges || !checkins) return;
    const uid = sync.session.user.id;
    const today = todayISO();
    const nameOf = (id: string) =>
      sync.friends?.find((f) => f.id === id)?.name ?? "Um concorrente";

    const snap = loadSet(RANK_SNAP);
    const firstLoad = localStorage.getItem(BASE_RANK) !== "1";
    let changed = false;

    for (const ch of challenges) {
      const activeCh = ch.startsOn <= today && today <= ch.endsOn;
      if (!activeCh) continue;

      // desafio acabando: 3, 1 e 0 dias
      const left = diffDays(ch.endsOn, today);
      if (left === 3 || left === 1 || left === 0) {
        push({
          type: "challenge",
          emoji: "⏳",
          title: left === 0 ? "Último dia de desafio" : "Desafio acabando",
          body:
            left === 0
              ? `Hoje é o último dia de "${ch.name}". Garanta seu check-in!`
              : `Faltam ${left} ${left === 1 ? "dia" : "dias"} pra acabar "${ch.name}".`,
          key: `chend-${ch.id}-${left}`,
        });
      }

      // te passaram: contagem de check-ins por pessoa neste desafio
      const count = new Map<string, number>();
      for (const c of checkins) {
        if (!c.challengeIds.includes(ch.id)) continue;
        if (c.date < ch.startsOn || c.date > today) continue;
        count.set(c.userId, (count.get(c.userId) ?? 0) + 1);
      }
      const mine = count.get(uid) ?? 0;
      for (const [otherId, n] of count) {
        if (otherId === uid) continue;
        const aheadKey = `ahead-${ch.id}-${otherId}`;
        const isAhead = n > mine;
        const wasAhead = snap.has(aheadKey);
        if (isAhead && !wasAhead) {
          snap.add(aheadKey);
          changed = true;
          if (!firstLoad && mine > 0) {
            push({
              type: "challenge",
              emoji: "⚡",
              title: "Te passaram!",
              body: `${nameOf(otherId)} passou você em "${ch.name}". Revida com um check-in.`,
              key: `passed-${ch.id}-${otherId}-${today}`,
            });
          }
        } else if (!isAhead && wasAhead) {
          snap.delete(aheadKey);
          changed = true;
        }
      }
    }
    if (changed) saveSet(RANK_SNAP, snap);
    if (firstLoad) flagSet(BASE_RANK);
  }, [active, prefs.challenge, sync.challenges, sync.checkins, sync.session, sync.friends, push]);

  const value = useMemo(
    () => ({
      notifs,
      unread: notifs.filter((n) => !n.read).length,
      permission,
      enable,
      markAllRead,
      clear,
    }),
    [notifs, permission, enable, markAllRead, clear]
  );

  return <NotifCtx.Provider value={value}>{children}</NotifCtx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotifCtx);
  if (!ctx) throw new Error("useNotifications fora do provider");
  return ctx;
}
