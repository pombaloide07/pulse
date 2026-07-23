// Pulse — Web Push (app fechado). Uma função, dois modos:
//  { kind: "checkin", checkin_id }  → disparado pelo trigger; avisa grupo+amigos
//  { kind: "reminders" }            → disparado pelo cron (15/15min): lembrete de
//                                      treino (por fuso), desafio acabando, te passaram
//
// Auth: header x-push-secret comparado em tempo constante com push_config.hook_secret
// (deploy com verify_jwt=false). VAPID e o secret vivem em public.push_config
// (RLS deny-all → só service_role/definer leem). Lib: jsr:@negrel/webpush (Web Crypto).
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { decodeBase64Url, encodeBase64Url } from "jsr:@std/encoding@1/base64url";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { timingSafeEqual } from "node:crypto";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// ——— config (VAPID + hook secret) no cold-start ———
const { data: cfg, error: cfgErr } = await db.from("push_config").select("*").single();
if (cfgErr || !cfg) throw new Error("push_config indisponível: " + (cfgErr?.message ?? "vazio"));

function toJwk(pubB64: string, privB64: string): webpush.ExportedVapidKeys {
  const pub = decodeBase64Url(pubB64);
  if (pub.length !== 65 || pub[0] !== 0x04) throw new Error("VAPID public inválida (esperado 65 bytes 0x04||X||Y)");
  const x = encodeBase64Url(pub.slice(1, 33));
  const y = encodeBase64Url(pub.slice(33, 65));
  return {
    publicKey: { kty: "EC", crv: "P-256", x, y, ext: true },
    privateKey: { kty: "EC", crv: "P-256", x, y, d: privB64 },
  };
}

const vapidKeys = await webpush.importVapidKeys(toJwk(cfg.vapid_public, cfg.vapid_private), {
  extractable: false,
});
const appServer = await webpush.ApplicationServer.new({
  contactInformation: cfg.vapid_subject,
  vapidKeys,
});

const HOOK_SECRET = cfg.hook_secret as string;

interface Sub { endpoint: string; p256dh: string; auth: string }
interface Payload { title: string; body: string; url?: string; tag?: string }

const gone: string[] = [];

async function sendOne(s: Sub, payload: Payload): Promise<boolean> {
  const subscriber = appServer.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } });
  try {
    await subscriber.pushTextMessage(JSON.stringify(payload), {});
    return true;
  } catch (err) {
    if (err instanceof webpush.PushMessageError) {
      if (err.isGone() || err.response.status === 404) gone.push(s.endpoint);
    }
    return false;
  }
}

/** manda um payload por-usuário (cada um com sua própria mensagem/tag). */
async function sendToUsers(
  subsByUser: Map<string, Sub[]>,
  perUser: Map<string, Payload>
): Promise<number> {
  const jobs: Promise<boolean>[] = [];
  for (const [uid, payload] of perUser) {
    for (const s of subsByUser.get(uid) ?? []) jobs.push(sendOne(s, payload));
  }
  const res = await Promise.all(jobs);
  return res.filter(Boolean).length;
}

async function subsFor(userIds: string[]): Promise<Map<string, Sub[]>> {
  const map = new Map<string, Sub[]>();
  if (!userIds.length) return map;
  const { data } = await db
    .from("push_subscriptions")
    .select("user_id,endpoint,p256dh,auth")
    .in("user_id", userIds);
  for (const r of data ?? []) {
    const list = map.get(r.user_id) ?? [];
    list.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
    map.set(r.user_id, list);
  }
  return map;
}

/** notify prefs por usuário (do states.state.notify). */
async function notifyPrefsFor(userIds: string[]): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (!userIds.length) return map;
  const { data } = await db.from("states").select("user_id,state").in("user_id", userIds);
  for (const r of data ?? []) {
    const n = (r.state?.notify ?? {}) as Record<string, unknown>;
    map.set(r.user_id, n);
  }
  return map;
}

async function alreadySent(userId: string, key: string): Promise<boolean> {
  const { data } = await db
    .from("push_sent")
    .select("key")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();
  return !!data;
}
async function markSent(userId: string, key: string) {
  await db.from("push_sent").insert({ user_id: userId, key }).select().maybeSingle();
}

function localParts(tz: string): { date: string; minutes: number; dow: number } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  const minutes = (Number(p.hour) % 24) * 60 + Number(p.minute);
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = ((wd[p.weekday] ?? 1) + 6) % 7; // 0 = segunda
  return { date, minutes, dow };
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
}

/* ————— modo checkin: avisa grupo + amigos ————— */
async function handleCheckin(checkinId: string): Promise<Response> {
  // re-consulta o check-in (não confia no body — defesa em profundidade)
  const { data: ci } = await db
    .from("checkins")
    .select("user_id,date")
    .eq("id", checkinId)
    .maybeSingle();
  if (!ci) return Response.json({ ok: true, skipped: "checkin não encontrado" });
  const author = ci.user_id as string;

  const { data: prof } = await db
    .from("profiles")
    .select("name,group_id")
    .eq("id", author)
    .maybeSingle();
  const name = prof?.name || "Alguém do grupo";

  // destinatários = colegas de grupo + amigos aceitos (menos o autor)
  const recipients = new Set<string>();
  if (prof?.group_id) {
    const { data: g } = await db.from("profiles").select("id").eq("group_id", prof.group_id);
    for (const r of g ?? []) if (r.id !== author) recipients.add(r.id);
  }
  const { data: fr } = await db
    .from("friendships")
    .select("a,b")
    .eq("status", "accepted")
    .or(`a.eq.${author},b.eq.${author}`);
  for (const f of fr ?? []) {
    const other = f.a === author ? f.b : f.a;
    if (other !== author) recipients.add(other);
  }
  if (!recipients.size) return Response.json({ ok: true, recipients: 0 });

  const ids = [...recipients];
  const prefs = await notifyPrefsFor(ids);
  const subs = await subsFor(ids);
  const perUser = new Map<string, Payload>();
  for (const uid of ids) {
    const n = prefs.get(uid) ?? {};
    if (n.enabled === false || n.checkins === false) continue; // respeita as prefs
    perUser.set(uid, {
      title: "Check-in novo 📸",
      body: `${name} acabou de fazer check-in. Não fica pra trás.`,
      url: "/#/grupo?seg=desafios",
      tag: `checkin-${checkinId}`,
    });
  }
  const sent = await sendToUsers(subs, perUser);
  await cleanupGone();
  return Response.json({ ok: true, recipients: ids.length, sent });
}

/* ————— modo reminders: treino / desafio acabando / te passaram ————— */
async function handleReminders(): Promise<Response> {
  // usuários com push ativo + fuso
  const { data: subRows } = await db.from("push_subscriptions").select("user_id,endpoint,p256dh,auth,timezone");
  if (!subRows?.length) return Response.json({ ok: true, users: 0 });

  const subsByUser = new Map<string, Sub[]>();
  const tzByUser = new Map<string, string>();
  for (const r of subRows) {
    const list = subsByUser.get(r.user_id) ?? [];
    list.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
    subsByUser.set(r.user_id, list);
    if (r.timezone) tzByUser.set(r.user_id, r.timezone);
  }
  const users = [...subsByUser.keys()];
  const prefs = await notifyPrefsFor(users);
  const { data: profs } = await db.from("profiles").select("id,name,group_id").in("id", users);
  const groupByUser = new Map<string, string | null>();
  const nameById = new Map<string, string>();
  for (const p of profs ?? []) {
    groupByUser.set(p.id, p.group_id);
    nameById.set(p.id, p.name || "Alguém");
  }

  // desafios ativos por grupo (para "acabando" e "te passaram")
  const groupIds = [...new Set((profs ?? []).map((p) => p.group_id).filter(Boolean))] as string[];
  const challengesByGroup = new Map<string, { id: string; name: string; starts_on: string; ends_on: string }[]>();
  if (groupIds.length) {
    const { data: chs } = await db
      .from("challenges")
      .select("id,name,starts_on,ends_on,group_id")
      .in("group_id", groupIds);
    for (const c of chs ?? []) {
      const list = challengesByGroup.get(c.group_id) ?? [];
      list.push(c);
      challengesByGroup.set(c.group_id, list);
    }
  }
  // contagem de check-ins por desafio/usuário (para o ranking do "te passaram")
  const countByChallenge = new Map<string, Map<string, number>>();
  const allChallengeIds = [...challengesByGroup.values()].flat().map((c) => c.id);
  if (allChallengeIds.length) {
    const { data: cc } = await db
      .from("checkin_challenges")
      .select("challenge_id,checkins(user_id,date)")
      .in("challenge_id", allChallengeIds);
    for (const row of cc ?? []) {
      const ck = row.checkins as unknown as { user_id: string; date: string } | null;
      if (!ck) continue;
      const m = countByChallenge.get(row.challenge_id) ?? new Map<string, number>();
      // dias distintos com check-in contam 1 cada
      m.set(ck.user_id, (m.get(ck.user_id) ?? 0) + 1);
      countByChallenge.set(row.challenge_id, m);
    }
  }

  let totalSent = 0;

  for (const uid of users) {
    const n = prefs.get(uid) ?? {};
    if (n.enabled === false) continue;
    const tz = tzByUser.get(uid) ?? "America/Sao_Paulo";
    const { date, minutes, dow } = localParts(tz);

    // (1) lembrete de treino
    if (n.train !== false && Array.isArray(n.trainTimes)) {
      const t = (n.trainTimes as string[])[dow];
      if (t) {
        const [h, m] = t.split(":").map(Number);
        if (minutes >= h * 60 + m) {
          const { data: pres } = await db
            .from("presence")
            .select("date")
            .eq("user_id", uid)
            .eq("date", date)
            .maybeSingle();
          const key = `train-${date}`;
          if (!pres && !(await alreadySent(uid, key))) {
            totalSent += await sendToUsers(subsByUser, new Map([[uid, {
              title: "Hora de treinar 🏋️",
              body: "Você ainda não treinou hoje. Bora aparecer.",
              url: "/#/",
              tag: key,
            }]]));
            await markSent(uid, key);
          }
        }
      }
    }

    // desafios do grupo do usuário
    const gid = groupByUser.get(uid);
    const challenges = gid ? challengesByGroup.get(gid) ?? [] : [];

    for (const ch of challenges) {
      const active = ch.starts_on <= date && date <= ch.ends_on;
      if (!active) continue;

      // (2) desafio acabando
      if (n.challenge !== false) {
        const left = diffDays(ch.ends_on, date);
        if (left === 3 || left === 1 || left === 0) {
          const key = `chend-${ch.id}-${left}`;
          if (!(await alreadySent(uid, key))) {
            totalSent += await sendToUsers(subsByUser, new Map([[uid, {
              title: left === 0 ? "Último dia de desafio ⏳" : "Desafio acabando ⏳",
              body: left === 0
                ? `Hoje é o último dia de "${ch.name}". Garanta seu check-in!`
                : `Faltam ${left} ${left === 1 ? "dia" : "dias"} pra acabar "${ch.name}".`,
              url: "/#/grupo?seg=desafios",
              tag: key,
            }]]));
            await markSent(uid, key);
          }
        }
      }

      // (3) te passaram
      if (n.challenge !== false) {
        const counts = countByChallenge.get(ch.id) ?? new Map<string, number>();
        const mine = counts.get(uid) ?? 0;
        if (mine > 0) {
          for (const [other, c] of counts) {
            if (other === uid || c <= mine) continue;
            const key = `passed-${ch.id}-${other}`;
            if (!(await alreadySent(uid, key))) {
              totalSent += await sendToUsers(subsByUser, new Map([[uid, {
                title: "Te passaram! ⚡",
                body: `${nameById.get(other) ?? "Um concorrente"} passou você em "${ch.name}". Revida com um check-in.`,
                url: "/#/grupo?seg=desafios",
                tag: key,
              }]]));
              await markSent(uid, key);
            }
          }
        }
      }
    }
  }

  await cleanupGone();
  return Response.json({ ok: true, users: users.length, sent: totalSent });
}

async function cleanupGone() {
  if (!gone.length) return;
  await db.from("push_subscriptions").delete().in("endpoint", gone);
  gone.length = 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const got = new TextEncoder().encode(req.headers.get("x-push-secret") ?? "");
  const exp = new TextEncoder().encode(HOOK_SECRET);
  if (got.length !== exp.length || !timingSafeEqual(got, exp)) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: { kind?: string; checkin_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  try {
    if (body.kind === "checkin" && body.checkin_id) return await handleCheckin(body.checkin_id);
    if (body.kind === "reminders") return await handleReminders();
    return new Response("unknown kind", { status: 400 });
  } catch (err) {
    console.error("push error:", err);
    return new Response("error: " + String(err), { status: 500 });
  }
});
