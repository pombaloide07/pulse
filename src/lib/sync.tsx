import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { useStore } from "./store";
import type { AppState, Challenge, Member } from "./types";
import { addDays, toISO, todayISO } from "./dates";
import { weeklyVolume } from "./logic";

export interface GroupInfo {
  id: string;
  name: string;
  invite_code: string;
}

interface SyncValue {
  session: Session | null;
  group: GroupInfo | null;
  /** membros remotos do grupo, sem você; null = ainda carregando/offline */
  friends: Member[] | null;
  /** desafios do grupo real; null = carregando/offline */
  challenges: Challenge[] | null;
  sendLink: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  createGroup: (name: string) => Promise<string | null>;
  joinGroup: (code: string) => Promise<string | null>;
  createChallenge: (name: string, days: number) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SyncCtx = createContext<SyncValue | null>(null);

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

const FRIEND_COLORS = ["#2f6b52", "#d9950f", "#4f7fa3", "#a05fa3", "#c2402a"];

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [friends, setFriends] = useState<Member[] | null>(null);
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const skipPushRef = useRef(false);
  const pushTimerRef = useRef<number>();
  const lastStatsRef = useRef<number | null>(null);

  /* sessão */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* bootstrap pós-login: perfil, grupo e estado remoto */
  useEffect(() => {
    if (!session) {
      setGroup(null);
      setFriends(null);
      setChallenges(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const uid = session.user.id;
      const name = stateRef.current.userName || "Atleta";
      await supabase.from("profiles").upsert(
        { id: uid, name, initials: initialsOf(name) },
        { onConflict: "id" }
      );

      // cadeia do grupo e estado remoto são independentes — em paralelo
      const [groupInfo, remote] = await Promise.all([
        (async () => {
          const { data: prof } = await supabase
            .from("profiles")
            .select("group_id")
            .eq("id", uid)
            .maybeSingle();
          if (!prof?.group_id) return null;
          const { data: g } = await supabase
            .from("groups")
            .select("id,name,invite_code")
            .eq("id", prof.group_id)
            .maybeSingle();
          return (g as GroupInfo) ?? null;
        })(),
        supabase.from("states").select("state").eq("user_id", uid).maybeSingle(),
      ]);
      if (cancelled) return;
      if (groupInfo) setGroup(groupInfo);
      if (remote.data?.state) {
        skipPushRef.current = true;
        dispatch({ type: "HYDRATE", state: remote.data.state as AppState });
      } else {
        await supabase.from("states").insert({ user_id: uid, state: stateRef.current });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, dispatch]);

  /* membros do grupo + desafios + realtime */
  const loadFriends = useCallback(async () => {
    if (!session || !group) return;
    const uid = session.user.id;
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,name,initials,color,stats")
      .eq("group_id", group.id);
    if (!profs) return;
    const since = toISO(addDays(new Date(), -70));
    const { data: pres } = await supabase
      .from("presence")
      .select("user_id,date")
      .in("user_id", profs.map((p) => p.id))
      .gte("date", since);
    const byUser = new Map<string, string[]>();
    (pres ?? []).forEach((p) => {
      const list = byUser.get(p.user_id) ?? [];
      list.push(p.date);
      byUser.set(p.user_id, list);
    });
    setFriends(
      profs
        .filter((p) => p.id !== uid)
        .map((p, i) => ({
          id: p.id,
          name: p.name || "Alguém",
          initials: p.initials || initialsOf(p.name || "?"),
          color: p.color || FRIEND_COLORS[i % FRIEND_COLORS.length],
          isMe: false,
          presence: byUser.get(p.id) ?? [],
          stats:
            typeof p.stats?.volume_pct === "number"
              ? { volumePct: p.stats.volume_pct }
              : undefined,
        }))
    );
  }, [session, group]);

  const loadChallenges = useCallback(async () => {
    if (!session || !group) return;
    const { data } = await supabase
      .from("challenges")
      .select("id,name,starts_on,ends_on,created_by")
      .eq("group_id", group.id)
      .order("starts_on", { ascending: false });
    if (data) {
      setChallenges(
        data.map((c) => ({
          id: c.id,
          name: c.name,
          startsOn: c.starts_on,
          endsOn: c.ends_on,
          createdBy: c.created_by ?? undefined,
        }))
      );
    }
  }, [session, group]);

  useEffect(() => {
    if (!session || !group) return;
    loadFriends();
    loadChallenges();
    const channel = supabase
      .channel("grupo-live")
      // presence: a RLS já entrega só as linhas do grupo; filtrar por membro
      // aqui congelaria a lista quando alguém novo entrasse
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presence" },
        () => loadFriends()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenges",
          filter: `group_id=eq.${group.id}`,
        },
        () => loadChallenges()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, group, loadFriends, loadChallenges]);

  /* presença de hoje sobe quando você aparece */
  const me = state.members.find((m) => m.isMe);
  const trainedToday = !!me?.presence.includes(todayISO());
  useEffect(() => {
    if (!session || !trainedToday) return;
    supabase
      .from("presence")
      .upsert({ user_id: session.user.id, date: todayISO() }, { onConflict: "user_id,date" })
      .then(() => {});
  }, [session, trainedToday]);

  /* estado local → nuvem (debounce; last-write-wins) + stats agregadas */
  useEffect(() => {
    if (!session) return;
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      const uid = session.user.id;
      supabase
        .from("states")
        .upsert(
          { user_id: uid, state, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        )
        .then(() => {});
      // única coisa de treino que o grupo vê além da presença: variação % de carga.
      // Só sessões reais — o histórico de demonstração ("seed-*") nunca vira stat pública.
      const real = { ...state, sessions: state.sessions.filter((s) => !s.id.startsWith("seed-")) };
      const vols = weeklyVolume(real, 8).map((w) => w.volume);
      const last4 = vols.slice(4).reduce((a, b) => a + b, 0);
      const prev4 = vols.slice(0, 4).reduce((a, b) => a + b, 0);
      const volumePct = prev4 > 0 ? Math.round(((last4 - prev4) / prev4) * 100) : null;
      if (volumePct !== null && volumePct !== lastStatsRef.current) {
        lastStatsRef.current = volumePct;
        supabase
          .from("profiles")
          .update({ stats: { volume_pct: volumePct } })
          .eq("id", uid)
          .then(() => {});
      }
    }, 2500);
    return () => window.clearTimeout(pushTimerRef.current);
  }, [state, session]);

  /* ações de auth e grupo */
  const sendLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return error ? error.message : null;
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    return error ? error.message : null;
  }, []);

  const createGroup = useCallback(async (name: string) => {
    const { data, error } = await supabase.rpc("create_group", { group_name: name });
    if (error) return error.message;
    setGroup(data as GroupInfo);
    return null;
  }, []);

  const joinGroup = useCallback(async (code: string) => {
    const { data, error } = await supabase.rpc("join_group", { code });
    if (error) return error.message;
    setGroup(data as GroupInfo);
    return null;
  }, []);

  const createChallenge = useCallback(
    async (name: string, days: number) => {
      if (!session || !group) return "entre num grupo primeiro";
      const { data, error } = await supabase
        .from("challenges")
        .insert({
          group_id: group.id,
          name: name.trim(),
          starts_on: todayISO(),
          ends_on: toISO(addDays(new Date(), days - 1)),
          created_by: session.user.id,
        })
        .select("id,name,starts_on,ends_on,created_by")
        .single();
      if (error) return error.message;
      // adiciona direto; o realtime cuida dos desafios criados pelos outros
      setChallenges((prev) => {
        const c: Challenge = {
          id: data.id,
          name: data.name,
          startsOn: data.starts_on,
          endsOn: data.ends_on,
          createdBy: data.created_by ?? undefined,
        };
        return prev?.some((x) => x.id === c.id) ? prev : [c, ...(prev ?? [])];
      });
      return null;
    },
    [session, group]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setGroup(null);
    setFriends(null);
    setChallenges(null);
  }, []);

  return (
    <SyncCtx.Provider
      value={{
        session,
        group,
        friends,
        challenges,
        sendLink,
        verifyCode,
        createGroup,
        joinGroup,
        createChallenge,
        signOut,
      }}
    >
      {children}
    </SyncCtx.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncCtx);
  if (!ctx) throw new Error("useSync fora do SyncProvider");
  return ctx;
}
