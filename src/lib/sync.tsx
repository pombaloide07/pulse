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
import type { AppState, Member } from "./types";
import { addDays, toISO, todayISO } from "./dates";

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
  sendLink: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  createGroup: (name: string) => Promise<string | null>;
  joinGroup: (code: string) => Promise<string | null>;
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

  const stateRef = useRef(state);
  stateRef.current = state;
  const skipPushRef = useRef(false);
  const pushTimerRef = useRef<number>();

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

      const { data: prof } = await supabase
        .from("profiles")
        .select("group_id")
        .eq("id", uid)
        .maybeSingle();
      if (!cancelled && prof?.group_id) {
        const { data: g } = await supabase
          .from("groups")
          .select("id,name,invite_code")
          .eq("id", prof.group_id)
          .maybeSingle();
        if (!cancelled && g) setGroup(g as GroupInfo);
      }

      const { data: remote } = await supabase
        .from("states")
        .select("state")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (remote?.state) {
        skipPushRef.current = true;
        dispatch({ type: "HYDRATE", state: remote.state as AppState });
      } else {
        await supabase.from("states").insert({ user_id: uid, state: stateRef.current });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, dispatch]);

  /* membros do grupo + realtime de presença */
  const loadFriends = useCallback(async () => {
    if (!session || !group) return;
    const uid = session.user.id;
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,name,initials,color")
      .eq("group_id", group.id);
    if (!profs) return;
    const since = toISO(addDays(new Date(), -70));
    const { data: pres } = await supabase
      .from("presence")
      .select("user_id,date")
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
        }))
    );
  }, [session, group]);

  useEffect(() => {
    if (!session || !group) return;
    loadFriends();
    const channel = supabase
      .channel("presence-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presence" },
        () => loadFriends()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, group, loadFriends]);

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

  /* estado local → nuvem (debounce; last-write-wins) */
  useEffect(() => {
    if (!session) return;
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      supabase
        .from("states")
        .upsert(
          { user_id: session.user.id, state, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        )
        .then(() => {});
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setGroup(null);
    setFriends(null);
  }, []);

  return (
    <SyncCtx.Provider
      value={{ session, group, friends, sendLink, verifyCode, createGroup, joinGroup, signOut }}
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
