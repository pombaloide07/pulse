import { supabase } from "./supabase";
import { VAPID_PUBLIC_KEY } from "./supabaseConfig";

/**
 * Web Push do lado cliente: registra o service worker, assina o pushManager
 * com a VAPID public key e guarda a subscription no Supabase (push_subscriptions).
 * O envio (com o app fechado) é feito por edge functions do Supabase.
 */

export function pushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** VAPID public key base64url → Uint8Array (exigido por applicationServerKey). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
}

/** Guarda/atualiza a subscription no banco (endpoint é a PK). */
async function storeSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      timezone: localTimezone(),
    },
    { onConflict: "endpoint" }
  );
  if (error) console.warn("push subscription store:", error.message);
}

/**
 * Liga o Web Push: registra o SW, garante permissão e assina. Deve ser chamado
 * a partir de um gesto do usuário (o toggle de notificações). Retorna true se
 * a subscription foi criada/renovada e guardada.
 */
export async function enableWebPush(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await ensureRegistration();
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return false;
    }
    const appKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      // se a VAPID key mudou, a subscription antiga quebra — reassina
      const cur = sub.options?.applicationServerKey;
      const same =
        cur &&
        new Uint8Array(cur as ArrayBuffer).length === appKey.length &&
        new Uint8Array(cur as ArrayBuffer).every((b, i) => b === appKey[i]);
      if (!same) {
        await sub.unsubscribe();
        sub = null;
      }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // cast: DOM types querem ArrayBuffer estrito; a Uint8Array serve
        applicationServerKey: appKey as BufferSource,
      });
    }
    await storeSubscription(sub);
    return true;
  } catch (err) {
    console.warn("enableWebPush:", err);
    return false;
  }
}

/**
 * Reconcilia no boot: se há permissão e uma subscription ativa, garante que
 * ela está no banco (endpoints podem ter sido renovados pelo browser/SW).
 */
export async function syncWebPush(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await ensureRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) await storeSubscription(sub);
  } catch {
    /* silencioso */
  }
}

/** Desliga: cancela a assinatura e remove do banco. */
export async function disableWebPush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
  } catch {
    /* silencioso */
  }
}
