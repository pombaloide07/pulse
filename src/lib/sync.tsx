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
import { buildSharedBlob, type SharedBlob } from "./share";
import { compressImage } from "./image";

export interface GroupInfo {
  id: string;
  name: string;
  invite_code: string;
}

/** Check-in por foto (meu, do grupo ou de amigos) — já com URL pública. */
export interface CheckinInfo {
  id: string;
  userId: string;
  /** ISO yyyy-mm-dd */
  date: string;
  photoUrl: string;
  /** desafios pros quais este check-in vale */
  challengeIds: string[];
  createdAt: string;
}

/** Amigo (ou pedido de amizade) na lista. */
export interface FriendInfo {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatarUrl: string | null;
  status: "pending" | "accepted";
  /** true = fui eu que pedi (aguardando o outro lado) */
  requestedByMe: boolean;
  /** o que EU mostro pra esse amigo */
  myShare: Record<string, boolean>;
}

/** A visão de um amigo: só os blocos que ele liberou pra mim vêm não-nulos. */
export interface FriendDetail {
  name: string;
  initials: string;
  color: string;
  avatarUrl: string | null;
  allowed: Record<string, boolean>;
  updatedAt: string | null;
  presence: { dates: string[] } | null;
  treino: SharedBlob["treino"] | null;
  metas: SharedBlob["metas"] | null;
  dieta: SharedBlob["dieta"] | null;
  peso: SharedBlob["peso"] | null;
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
  /** quem entrou em cada desafio (challengeId → userIds); null = carregando */
  participants: Record<string, string[]> | null;
  /** todas as turmas que participo — alimenta o seletor de turma ativa */
  myGroups: GroupInfo[] | null;
  setActiveGroup: (groupId: string) => Promise<string | null>;
  /** renomear a turma ativa (qualquer membro pode) */
  renameGroup: (name: string) => Promise<string | null>;
  /** logado com conta nova (sem estado na nuvem) — precisa escolher o nome */
  needsOnboarding: boolean;
  /** veio de um link de recuperação de senha — precisa definir a nova */
  needsNewPassword: boolean;
  onboard: (name: string) => Promise<void>;
  /* auth por e-mail + senha (cadastro entra direto; recuperação por e-mail) */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  updateName: (name: string) => Promise<void>;
  createGroup: (name: string) => Promise<string | null>;
  joinGroup: (code: string) => Promise<string | null>;
  createChallenge: (name: string, days: number) => Promise<string | null>;
  /** participar é opt-in: entra/sai do desafio explicitamente */
  joinChallenge: (challengeId: string) => Promise<string | null>;
  leaveChallenge: (challengeId: string) => Promise<string | null>;
  /** editar nome/prazo do desafio (só quem criou passa na RLS) */
  updateChallenge: (id: string, patch: { name?: string; endsOn?: string }) => Promise<string | null>;
  /** entrar num desafio pelo código (mesmo sendo de outra turma) */
  joinChallengeByCode: (code: string) => Promise<string | null>;
  /** trazer alguém da turma ou um amigo pro desafio */
  addParticipant: (challengeId: string, userId: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /* perfil: foto e código de amizade */
  myAvatarUrl: string | null;
  myFriendCode: string | null;
  uploadAvatar: (file: File | Blob) => Promise<string | null>;
  /* check-ins por foto */
  checkins: CheckinInfo[] | null;
  checkIn: (file: File | Blob, challengeIds: string[]) => Promise<string | null>;
  /* amizades */
  friendList: FriendInfo[] | null;
  addFriend: (code: string) => Promise<string | null>;
  respondFriend: (friendId: string, accept: boolean) => Promise<string | null>;
  removeFriend: (friendId: string) => Promise<string | null>;
  setFriendShare: (friendId: string, share: Record<string, boolean>) => Promise<string | null>;
  friendView: (friendId: string) => Promise<FriendDetail | string>;
}

const SyncCtx = createContext<SyncValue | null>(null);

/** localStorage: o visitante escolheu explorar sem conta (some no logout) */
export const DEMO_FLAG = "pulse-demo-optin";

/** localStorage: esta pessoa já entrou com conta neste aparelho alguma vez.
    Persiste de propósito (não some no logout) — é o que faz o deslogado dela
    cair na tela de login direta em vez da landing de boas-vindas. */
export const RETURNING_FLAG = "pulse-returning";

/** URL pública de um objeto num bucket público (caminho é imprevisível). */
export function publicPhotoUrl(bucket: "avatars" | "checkins", path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

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
  invite_code?: string | null;
  group_id?: string | null;
}

function rowToChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdBy: row.created_by ?? undefined,
    inviteCode: row.invite_code ?? undefined,
    groupId: row.group_id ?? undefined,
  };
}

const CHALLENGE_COLS = "id,name,starts_on,ends_on,created_by,invite_code,group_id";

const FRIEND_COLORS = ["#2f6b52", "#d9950f", "#4f7fa3", "#a05fa3", "#c2402a"];

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [friends, setFriends] = useState<Member[] | null>(null);
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [participants, setParticipants] = useState<Record<string, string[]> | null>(null);
  const [myGroups, setMyGroups] = useState<GroupInfo[] | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [myFriendCode, setMyFriendCode] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<CheckinInfo[] | null>(null);
  const [friendList, setFriendList] = useState<FriendInfo[] | null>(null);
  // incrementa quando a rede volta, pra re-rodar o bootstrap (offline → online)
  const [reconnectTick, setReconnectTick] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;
  const skipPushRef = useRef(false);
  const pushTimerRef = useRef<number>();
  const lastStatsRef = useRef<number | null>(null);
  const lastSharedRef = useRef<string | null>(null);
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
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      // clique no link de "esqueci a senha" cai aqui já logado — o app
      // pede a senha nova antes de qualquer outra coisa
      if (evt === "PASSWORD_RECOVERY") setNeedsNewPassword(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* entrou com conta neste aparelho → marca pra sempre: o deslogado dela vira
     tela de login direta, não a landing (que fica só pra quem nunca entrou) */
  useEffect(() => {
    if (!session) return;
    try {
      localStorage.setItem(RETURNING_FLAG, "1");
    } catch {
      /* sem localStorage: cai na landing, sem drama */
    }
  }, [session]);

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
      setParticipants(null);
      setMyGroups(null);
      setNeedsOnboarding(false);
      setMyAvatarUrl(null);
      setMyFriendCode(null);
      setCheckins(null);
      setFriendList(null);
      canPushRef.current = false;
      hydratedUidRef.current = null;
      unsyncedEditsRef.current = false;
      lastSharedRef.current = null;
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
            .select("group_id,avatar_path")
            .eq("id", uid)
            .maybeSingle();
          if (!cancelled && prof) setMyAvatarUrl(publicPhotoUrl("avatars", prof.avatar_path));
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

      // código de amizade é meu, via RPC (a coluna não é legível nem pro grupo)
      supabase.rpc("my_friend_code").then(({ data, error }) => {
        if (!cancelled && !error && typeof data === "string") setMyFriendCode(data);
      });

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
      .select("id,name,initials,color,stats,avatar_path")
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
          avatarUrl: publicPhotoUrl("avatars", p.avatar_path) ?? undefined,
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
    // sem filtro de turma: a RLS já entrega os desafios das minhas turmas
    // MAIS os que eu entrei por código (que podem ser de outra turma)
    const { data } = await supabase
      .from("challenges")
      .select(CHALLENGE_COLS)
      .order("starts_on", { ascending: false });
    if (data) setChallenges(data.map(rowToChallenge));
  }, [session, group]);

  /* quem entrou em cada desafio — a RLS já limita aos desafios do meu grupo */
  const loadParticipants = useCallback(async () => {
    if (!session || !group) return;
    const { data, error } = await supabase
      .from("challenge_participants")
      .select("challenge_id,user_id");
    if (error) {
      console.warn("participants fetch:", error.message);
      return;
    }
    const byChallenge: Record<string, string[]> = {};
    for (const r of data ?? []) {
      (byChallenge[r.challenge_id] ??= []).push(r.user_id);
    }
    setParticipants(byChallenge);
  }, [session, group]);

  /* todas as turmas que participo — a RLS entrega as minhas (memberships) */
  const loadMyGroups = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("groups")
      .select("id,name,invite_code")
      .order("created_at");
    if (error) {
      console.warn("groups fetch:", error.message);
      return;
    }
    setMyGroups(data ?? []);
  }, [session]);

  /* check-ins visíveis (meus + grupo + amigos) — a RLS já filtra */
  const loadCheckins = useCallback(async () => {
    if (!session) return;
    const since = toISO(addDays(new Date(), -60));
    const { data, error } = await supabase
      .from("checkins")
      .select("id,user_id,date,photo_path,created_at,checkin_challenges(challenge_id)")
      .gte("date", since)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("checkins fetch:", error.message);
      return;
    }
    setCheckins(
      (data ?? []).map((c) => ({
        id: c.id,
        userId: c.user_id,
        date: c.date,
        photoUrl: publicPhotoUrl("checkins", c.photo_path) ?? "",
        challengeIds: (c.checkin_challenges ?? []).map(
          (x: { challenge_id: string }) => x.challenge_id
        ),
        createdAt: c.created_at,
      }))
    );
  }, [session]);

  /* amigos e pedidos */
  const loadFriendList = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase.rpc("list_friends");
    if (error) {
      console.warn("friends fetch:", error.message);
      return;
    }
    setFriendList(
      (data ?? []).map(
        (r: {
          friend_id: string;
          name: string;
          initials: string;
          color: string;
          avatar_path: string | null;
          status: "pending" | "accepted";
          requested_by_me: boolean;
          my_share: Record<string, boolean> | null;
        }) => ({
          id: r.friend_id,
          name: r.name || "Alguém",
          initials: r.initials || initialsOf(r.name || "?"),
          color: r.color || FRIEND_COLORS[0],
          avatarUrl: publicPhotoUrl("avatars", r.avatar_path),
          status: r.status,
          requestedByMe: r.requested_by_me,
          myShare: r.my_share ?? {},
        })
      )
    );
  }, [session]);

  useEffect(() => {
    if (!session || !group) return;
    loadFriends();
    loadChallenges();
    loadParticipants();
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
      // entrar/sair de um desafio reflete pro grupo sem refresh
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_participants" },
        () => loadParticipants()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, group, loadFriends, loadChallenges, loadParticipants]);

  /* minhas turmas: alimenta o seletor; recarrega ao trocar a ativa ou entrar
     numa turma nova (o grupo ativo muda e o efeito re-roda) */
  useEffect(() => {
    if (!session) return;
    loadMyGroups();
  }, [session, group, loadMyGroups]);

  /* check-ins + amizades: valem mesmo sem grupo (amigos são outra rede) */
  useEffect(() => {
    if (!session) return;
    loadCheckins();
    loadFriendList();
    const channel = supabase
      .channel("checkins-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins" },
        () => loadCheckins()
      )
      // pedido/aceite de amizade aparece sem recarregar o app
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => loadFriendList()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, loadCheckins, loadFriendList]);

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

  /* estado local → nuvem (debounce; last-write-wins) + stats + blocos de amigo */
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
      // blocos que amigos podem ver (filtrados POR AMIGO no servidor via
      // friend_view — aqui sobe o blob completo, o corte é do banco)
      const blob = buildSharedBlob(state);
      const key = JSON.stringify({ ...blob, updatedAt: "" });
      if (key !== lastSharedRef.current) {
        lastSharedRef.current = key;
        supabase
          .from("profiles")
          .update({ shared: blob })
          .eq("id", uid)
          .then(({ error }) => {
            if (error) console.warn("shared push:", error.message);
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

  /* ————— auth: e-mail + senha (confirmação só no cadastro) ————— */

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (data.session) return null; // já logado (autoconfirm no projeto)
    // sem sessão: o trigger auto_confirm_email já confirmou o e-mail — entra
    // direto por senha, sem etapa de confirmação
    const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
    return siErr ? siErr.message : null;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error ? error.message : null;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;
    setNeedsNewPassword(false);
    return null;
  }, []);

  /* editar o nome que o grupo/amigos veem (perfil + estado local) */
  const updateName = useCallback(
    async (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      dispatch({ type: "SET_NAME", name: clean });
      if (!session) return;
      const { error } = await supabase
        .from("profiles")
        .update({ name: clean, initials: initialsOf(clean) })
        .eq("id", session.user.id);
      if (error) console.warn("name update:", error.message);
    },
    [session, dispatch]
  );

  /* ————— grupo e desafios ————— */

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
        .select(CHALLENGE_COLS)
        .single();
      if (error) return error.message;
      // adiciona direto; o realtime cuida dos desafios criados pelos outros
      setChallenges((prev) => {
        const c = rowToChallenge(data);
        return prev?.some((x) => x.id === c.id) ? prev : [c, ...(prev ?? [])];
      });
      // quem cria já entra — senão criaria um desafio do qual não participa
      const uid = session.user.id;
      await supabase
        .from("challenge_participants")
        .insert({ challenge_id: data.id, user_id: uid });
      setParticipants((prev) => ({ ...(prev ?? {}), [data.id]: [uid] }));
      return null;
    },
    [session, group]
  );

  /* participar é opt-in: quem não entrou não conta no ranking do desafio */

  const joinChallenge = useCallback(
    async (challengeId: string) => {
      if (!session) return "entre primeiro";
      const uid = session.user.id;
      const { error } = await supabase
        .from("challenge_participants")
        .insert({ challenge_id: challengeId, user_id: uid });
      // 23505 = já participava; pra quem clicou é sucesso, não erro
      if (error && error.code !== "23505") return error.message;
      setParticipants((prev) => {
        const cur = prev?.[challengeId] ?? [];
        if (cur.includes(uid)) return prev;
        return { ...(prev ?? {}), [challengeId]: [...cur, uid] };
      });
      return null;
    },
    [session]
  );

  const leaveChallenge = useCallback(
    async (challengeId: string) => {
      if (!session) return "entre primeiro";
      const uid = session.user.id;
      const { error } = await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", challengeId)
        .eq("user_id", uid);
      if (error) return error.message;
      setParticipants((prev) =>
        prev
          ? { ...prev, [challengeId]: (prev[challengeId] ?? []).filter((u) => u !== uid) }
          : prev
      );
      return null;
    },
    [session]
  );

  /* trazer alguém pro desafio (a RLS exige turma em comum ou amizade) */
  const addParticipant = useCallback(
    async (challengeId: string, userId: string) => {
      if (!session) return "entre primeiro";
      const { error } = await supabase
        .from("challenge_participants")
        .insert({ challenge_id: challengeId, user_id: userId });
      if (error && error.code !== "23505") return error.message;
      setParticipants((prev) => {
        const cur = prev?.[challengeId] ?? [];
        if (cur.includes(userId)) return prev;
        return { ...(prev ?? {}), [challengeId]: [...cur, userId] };
      });
      return null;
    },
    [session]
  );

  /* entrar por código: serve pra desafio de turma que não é a minha */
  const joinChallengeByCode = useCallback(
    async (code: string) => {
      if (!session) return "entre primeiro";
      const { error } = await supabase.rpc("join_challenge", { code: code.trim() });
      if (error) return error.message;
      await Promise.all([loadChallenges(), loadParticipants()]);
      return null;
    },
    [session, loadChallenges, loadParticipants]
  );

  /* editar o desafio — a RLS só deixa quem criou */
  const updateChallenge = useCallback(
    async (id: string, patch: { name?: string; endsOn?: string }) => {
      if (!session) return "entre primeiro";
      const row: Record<string, string> = {};
      if (patch.name !== undefined) row.name = patch.name.trim();
      if (patch.endsOn !== undefined) row.ends_on = patch.endsOn;
      if (!Object.keys(row).length) return null;
      const { error } = await supabase.from("challenges").update(row).eq("id", id);
      if (error) return error.message;
      setChallenges((prev) =>
        prev?.map((c) =>
          c.id === id
            ? {
                ...c,
                ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
                ...(patch.endsOn !== undefined ? { endsOn: patch.endsOn } : {}),
              }
            : c
        ) ?? prev
      );
      return null;
    },
    [session]
  );

  /* ————— turmas: trocar a ativa e renomear ————— */

  const setActiveGroup = useCallback(
    async (groupId: string) => {
      if (!session) return "entre primeiro";
      const { error } = await supabase.rpc("set_active_group", { g: groupId });
      if (error) return error.message;
      const g = (myGroups ?? []).find((x) => x.id === groupId);
      // trocar o grupo ativo re-dispara os loaders (amigos/desafios/participantes)
      if (g) setGroup(g);
      return null;
    },
    [session, myGroups]
  );

  const renameGroup = useCallback(
    async (name: string) => {
      if (!session || !group) return "entre numa turma primeiro";
      const clean = name.trim();
      if (clean.length < 2) return "nome muito curto";
      const { error } = await supabase.from("groups").update({ name: clean }).eq("id", group.id);
      if (error) return error.message;
      setGroup({ ...group, name: clean });
      setMyGroups((prev) => prev?.map((g) => (g.id === group.id ? { ...g, name: clean } : g)) ?? prev);
      return null;
    },
    [session, group]
  );

  /* ————— foto de perfil ————— */

  const uploadAvatar = useCallback(
    async (file: File | Blob) => {
      if (!session) return "entre primeiro";
      try {
        const uid = session.user.id;
        const blob = await compressImage(file, 512, 0.85);
        // nome novo a cada troca: quebra o cache da URL pública antiga
        const path = `${uid}/avatar-${Date.now()}.jpg`;
        const up = await supabase.storage
          .from("avatars")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) return up.error.message;
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_path: path })
          .eq("id", uid);
        if (error) return error.message;
        setMyAvatarUrl(publicPhotoUrl("avatars", path));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "não deu pra ler essa imagem";
      }
    },
    [session]
  );

  /* ————— check-in por foto ————— */

  const checkIn = useCallback(
    async (file: File | Blob, challengeIds: string[]) => {
      if (!session) return "entre primeiro";
      try {
        const uid = session.user.id;
        const blob = await compressImage(file, 1080, 0.82);
        const path = `${uid}/${todayISO()}-${Date.now()}.jpg`;
        const up = await supabase.storage
          .from("checkins")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) return up.error.message;
        const ins = await supabase
          .from("checkins")
          .insert({ user_id: uid, date: todayISO(), photo_path: path })
          .select("id")
          .single();
        if (ins.error) return ins.error.message;
        if (challengeIds.length) {
          const { error } = await supabase
            .from("checkin_challenges")
            .insert(challengeIds.map((challenge_id) => ({ checkin_id: ins.data.id, challenge_id })));
          if (error) return error.message;
        }
        loadCheckins();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "não deu pra ler essa foto";
      }
    },
    [session, loadCheckins]
  );

  /* ————— amizades ————— */

  const addFriend = useCallback(
    async (code: string) => {
      const { error } = await supabase.rpc("add_friend", { code });
      if (error) return error.message;
      loadFriendList();
      return null;
    },
    [loadFriendList]
  );

  const respondFriend = useCallback(
    async (friendId: string, accept: boolean) => {
      const { error } = await supabase.rpc("respond_friend", { friend: friendId, accept });
      if (error) return error.message;
      loadFriendList();
      return null;
    },
    [loadFriendList]
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      const { error } = await supabase.rpc("remove_friend", { friend: friendId });
      if (error) return error.message;
      loadFriendList();
      return null;
    },
    [loadFriendList]
  );

  const setFriendShare = useCallback(
    async (friendId: string, share: Record<string, boolean>) => {
      const { error } = await supabase.rpc("set_friend_share", { friend: friendId, share });
      if (error) return error.message;
      loadFriendList();
      return null;
    },
    [loadFriendList]
  );

  const friendView = useCallback(async (friendId: string): Promise<FriendDetail | string> => {
    const { data, error } = await supabase.rpc("friend_view", { friend: friendId });
    if (error) return error.message;
    const v = data as {
      name: string;
      initials: string;
      color: string;
      avatar_path: string | null;
      allowed: Record<string, boolean> | null;
      updated_at: string | null;
      presence: { dates: string[] } | null;
      treino: FriendDetail["treino"];
      metas: FriendDetail["metas"];
      dieta: FriendDetail["dieta"];
      peso: FriendDetail["peso"];
    };
    return {
      name: v.name || "Alguém",
      initials: v.initials || initialsOf(v.name || "?"),
      color: v.color || FRIEND_COLORS[0],
      avatarUrl: publicPhotoUrl("avatars", v.avatar_path),
      allowed: v.allowed ?? {},
      updatedAt: v.updated_at,
      presence: v.presence ?? null,
      treino: v.treino ?? null,
      metas: v.metas ?? null,
      dieta: v.dieta ?? null,
      peso: v.peso ?? null,
    };
  }, []);

  const signOut = useCallback(async () => {
    // zera os refs de sync antes de sair: evita push residual com token morto
    canPushRef.current = false;
    skipPushRef.current = false;
    lastStatsRef.current = null;
    lastSharedRef.current = null;
    hydratedUidRef.current = null;
    pushedPresenceRef.current = new Set();
    window.clearTimeout(pushTimerRef.current);
    // saiu da conta → cai na tela de login (RETURNING_FLAG persiste; a landing
    // é só pra quem nunca entrou). O modo demo continua uma escolha explícita.
    try {
      localStorage.removeItem(DEMO_FLAG);
    } catch {
      /* sem localStorage, sem flag */
    }
    await supabase.auth.signOut();
    setGroup(null);
    setFriends(null);
    setChallenges(null);
    setParticipants(null);
    setMyGroups(null);
    setNeedsOnboarding(false);
    setNeedsNewPassword(false);
    setMyAvatarUrl(null);
    setMyFriendCode(null);
    setCheckins(null);
    setFriendList(null);
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
        participants,
        myGroups,
        setActiveGroup,
        renameGroup,
        needsOnboarding,
        needsNewPassword,
        onboard,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        updateName,
        createGroup,
        joinGroup,
        createChallenge,
        joinChallenge,
        leaveChallenge,
        updateChallenge,
        joinChallengeByCode,
        addParticipant,
        signOut,
        myAvatarUrl,
        myFriendCode,
        uploadAvatar,
        checkins,
        checkIn,
        friendList,
        addFriend,
        respondFriend,
        removeFriend,
        setFriendShare,
        friendView,
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
