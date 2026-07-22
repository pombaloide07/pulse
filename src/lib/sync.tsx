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
import { volumeTrendPct } from "./logic";
import { initialsOf } from "./format";
import { buildFreshState } from "./seed";

export interface GroupInfo {
  id: string;
  name: string;
  invite_code: string;
}

interface SyncValue {
  session: Session | null;
  /** sessão inicial já resolvida — evita piscar a landing pra quem está logado */
  ready: boolean;
  group: GroupInfo | null;
  /** membros remotos do grupo, sem você; null = ainda carregando/offline */
  friends: Member[] | null;
  /** desafios do grupo real; null = carregando/offline */
  challenges: Challenge[] | null;
  /** logado com conta nova (sem estado na nuvem) — precisa escolher o nome */
  needsOnboarding: boolean;
  onboard: (name: string) => Promise<void>;
  sendLink: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  createGroup: (name: string) => Promise<string | null>;
  joinGroup: (code: string) => Promise<string | null>;
  createChallenge: (name: string, days: number) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const SyncCtx = createContext<SyncValue | null>(null);

/** localStorage: o visitante escolheu explorar sem conta (some no logout) */
export const DEMO_FLAG = "pulse-demo-optin";

/* onboarding concluído neste aparelho, por conta — se o upsert inicial do
   estado falhar, o bootstrap não pode mandar a pessoa onboardar de novo
   (o ONBOARD reconstruiria o estado do zero, apagando o que ela já fez) */
const onboardedKey = (uid: string) => `pulse-onboarded-${uid}`;
function wasOnboarded(uid: string): boolean {
  try {
    return localStorage.getItem(onboardedKey(uid)) === "1";
  } catch {
    return false;
  }
}
function markOnboarded(uid: string) {
  try {
    localStorage.setItem(onboardedKey(uid), "1");
  } catch {
    /* sem localStorage: o pior caso é re-onboardar */
  }
}

interface ChallengeRow {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  created_by: string | null;
}

function rowToChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdBy: row.created_by ?? undefined,
  };
}

const FRIEND_COLORS = ["#2f6b52", "#d9950f", "#4f7fa3", "#a05fa3", "#c2402a"];

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [friends, setFriends] = useState<Member[] | null>(null);
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  // incrementa quando a rede volta, pra re-rodar o bootstrap (offline → online)
  const [reconnectTick, setReconnectTick] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;
  const skipPushRef = useRef(false);
  const pushTimerRef = useRef<number>();
  const lastStatsRef = useRef<number | null>(null);
  // só sincroniza o estado depois que a conta está decidida (hidratada ou onboarded);
  // impede que o estado de demonstração vaze pra nuvem numa conta nova
  const canPushRef = useRef(false);
  // hidrata da nuvem só UMA vez por login; refresh de token não re-hidrata
  // (senão sobrescreveria edições locais recentes com o snapshot do servidor)
  const hydratedUidRef = useRef<string | null>(null);
  // edições feitas logado mas com o sync ainda bloqueado (abriu offline):
  // quando a rede volta, elas vencem o snapshot da nuvem — sem isso o
  // HYDRATE da reconexão apagaria o treino registrado na academia sem sinal
  const unsyncedEditsRef = useRef(false);
  const prevStateRef = useRef(state);
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      if (session && !canPushRef.current) unsyncedEditsRef.current = true;
    }
  }, [state, session]);

  /* sessão */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* rede voltou: re-roda o bootstrap (reativa sync/grupo se abriu offline) */
  useEffect(() => {
    const onOnline = () => setReconnectTick((n) => n + 1);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  /* bootstrap pós-login: perfil, grupo e estado remoto */
  useEffect(() => {
    if (!session) {
      setGroup(null);
      setFriends(null);
      setChallenges(null);
      setNeedsOnboarding(false);
      canPushRef.current = false;
      hydratedUidRef.current = null;
      unsyncedEditsRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const uid = session.user.id;

      // valida o token no servidor: uma sessão órfã (usuário deletado) fica no
      // localStorage e travaria o app. getUser() bate no servidor de verdade.
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (cancelled) return;
      if (uErr) {
        const status = (uErr as { status?: number }).status;
        // 401/403 = token inválido/usuário sumiu → desloga limpo (cai no demo).
        // Sem status = erro de rede/offline → mantém a sessão (app é local-first).
        if (status === 401 || status === 403) {
          await supabase.auth.signOut();
          dispatch({ type: "RESET" }); // apaga dados privados órfãos → volta ao demo
        } else {
          console.warn("getUser:", uErr.message);
        }
        return;
      }
      if (!u?.user) {
        await supabase.auth.signOut();
        dispatch({ type: "RESET" });
        return;
      }

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
      if (remote.error) {
        // erro (rede offline, ou algo pior): mantém o estado local, não força
        // onboarding nem push — o app é local-first e re-hidrata quando voltar
        console.warn("state fetch:", remote.error.message);
        return;
      }
      const pushLocalNow = () =>
        supabase
          .from("states")
          .upsert(
            { user_id: uid, state: stateRef.current, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          )
          .then(({ error }) => {
            if (error) console.warn("state push:", error.message);
          });
      if (remote.data?.state) {
        // conta existente: libera o sync e traz o estado da nuvem UMA vez por login.
        // Em refreshes de token (mesmo uid) não re-hidrata — preserva edições locais.
        canPushRef.current = true;
        if (hydratedUidRef.current !== uid) {
          hydratedUidRef.current = uid;
          if (unsyncedEditsRef.current) {
            // houve edição local enquanto offline: o local é mais novo que o
            // snapshot — empurra em vez de puxar (last-write-wins de verdade)
            unsyncedEditsRef.current = false;
            pushLocalNow();
          } else {
            skipPushRef.current = true;
            dispatch({ type: "HYDRATE", state: remote.data.state as AppState });
          }
        }
        setNeedsOnboarding(false);
      } else if (wasOnboarded(uid)) {
        // sem linha em states, mas esta conta JÁ onboardou neste aparelho —
        // o upsert inicial falhou (rede). Re-onboardar apagaria tudo; trata
        // como conta existente e sobe o estado local de uma vez.
        canPushRef.current = true;
        hydratedUidRef.current = uid;
        unsyncedEditsRef.current = false;
        setNeedsOnboarding(false);
        pushLocalNow();
      } else {
        // conta nova (query ok, sem linha): NÃO empurra o estado demo nem grava
        // o nome do seed — espera o onboarding escolher o nome e criar o limpo
        setNeedsOnboarding(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, dispatch, reconnectTick]);

  /* membros do grupo + desafios + realtime */
  const loadFriends = useCallback(async () => {
    if (!session || !group) return;
    const uid = session.user.id;
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,name,initials,color,stats")
      .eq("group_id", group.id);
    if (!profs) return;
    // 180 dias cobre streaks longas e desafios de até ~6 meses; além disso
    // o corte é aceito (presenças mais velhas não mudam nada visível)
    const since = toISO(addDays(new Date(), -180));
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
    if (data) setChallenges(data.map(rowToChallenge));
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

  /* presença sobe quando você aparece — inclui dias recentes lançados
     retroativamente (registro rápido). Janela de 7 dias casa com o limite
     retroativo aceito pelo banco (migração 0006). */
  const me = state.members.find((m) => m.isMe);
  const pushedPresenceRef = useRef(new Set<string>());
  const presenceWindowStart = toISO(addDays(new Date(), -7));
  const recentPresenceKey = (me?.presence ?? [])
    .filter((d) => d >= presenceWindowStart && d <= todayISO())
    .sort()
    .join(",");
  useEffect(() => {
    // canPushRef: presença do estado demo/pré-onboarding nunca sobe
    if (!session || !canPushRef.current || !recentPresenceKey) return;
    const uid = session.user.id;
    const toPush = recentPresenceKey.split(",").filter((d) => !pushedPresenceRef.current.has(d));
    if (!toPush.length) return;
    supabase
      .from("presence")
      .upsert(
        toPush.map((date) => ({ user_id: uid, date })),
        { onConflict: "user_id,date" }
      )
      .then(({ error }) => {
        if (error) console.warn("presence push:", error.message);
        else toPush.forEach((d) => pushedPresenceRef.current.add(d));
      });
  }, [session, recentPresenceKey]);

  /* estado local → nuvem (debounce; last-write-wins) + stats agregadas */
  useEffect(() => {
    if (!session || !canPushRef.current) return;
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
        .then(({ error }) => {
          if (error) console.warn("state push:", error.message);
        });
      // única coisa de treino que o grupo vê além da presença: variação % de carga.
      // Só sessões reais — o histórico de demonstração ("seed-*") nunca vira stat pública.
      const volumePct = volumeTrendPct(state, { excludeSeeds: true });
      if (volumePct !== null && volumePct !== lastStatsRef.current) {
        lastStatsRef.current = volumePct;
        supabase
          .from("profiles")
          .update({ stats: { volume_pct: volumePct } })
          .eq("id", uid)
          .then(({ error }) => {
            if (error) console.warn("stats push:", error.message);
          });
      }
    }, 2500);
    return () => window.clearTimeout(pushTimerRef.current);
  }, [state, session]);

  /* onboarding: conta nova escolhe o nome e nasce limpa (sem dados de demo) */
  const onboard = useCallback(
    async (name: string) => {
      if (!session) return;
      const clean = name.trim() || "Atleta";
      const fresh = buildFreshState(clean);
      dispatch({ type: "ONBOARD", name: clean });
      const uid = session.user.id;
      canPushRef.current = true;
      // marca como hidratada: o refresh de token (~1h) não pode re-hidratar
      // da nuvem por cima do que a pessoa editou desde o onboarding
      hydratedUidRef.current = uid;
      markOnboarded(uid);
      setNeedsOnboarding(false);
      const [prof, st] = await Promise.all([
        supabase
          .from("profiles")
          .upsert({ id: uid, name: clean, initials: initialsOf(clean) }, { onConflict: "id" }),
        supabase.from("states").upsert(
          { user_id: uid, state: fresh, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        ),
      ]);
      if (prof.error) console.warn("profile upsert:", prof.error.message);
      if (st.error) console.warn("state upsert:", st.error.message);
    },
    [session, dispatch]
  );

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
        const c = rowToChallenge(data);
        return prev?.some((x) => x.id === c.id) ? prev : [c, ...(prev ?? [])];
      });
      return null;
    },
    [session, group]
  );

  const signOut = useCallback(async () => {
    // zera os refs de sync antes de sair: evita push residual com token morto
    canPushRef.current = false;
    skipPushRef.current = false;
    lastStatsRef.current = null;
    hydratedUidRef.current = null;
    pushedPresenceRef.current = new Set();
    window.clearTimeout(pushTimerRef.current);
    // saiu da conta → volta pra landing (o modo demo é uma escolha explícita)
    try {
      localStorage.removeItem(DEMO_FLAG);
    } catch {
      /* sem localStorage, sem flag */
    }
    await supabase.auth.signOut();
    setGroup(null);
    setFriends(null);
    setChallenges(null);
    setNeedsOnboarding(false);
    // volta ao demo e apaga os dados privados do store/localStorage — senão
    // ficariam visíveis (e disponíveis pro próximo) sob o rótulo "Modo demo"
    dispatch({ type: "RESET" });
  }, [dispatch]);

  return (
    <SyncCtx.Provider
      value={{
        session,
        ready,
        group,
        friends,
        challenges,
        needsOnboarding,
        onboard,
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
