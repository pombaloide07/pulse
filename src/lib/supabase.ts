import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./supabaseConfig";

/**
 * Storage da sessão. O token de auth mora no sessionStorage: a sessão morre
 * quando a aba/app fecha (reabrir pede login de novo), mas sobrevive a um F5 e
 * NÃO cai ao trocar de aba — é o próprio navegador que garante esse ciclo, sem
 * depender de eventos frágeis de "beforeunload".
 *
 * Exceção: as chaves do PKCE (`…-code-verifier`) precisam cruzar abas — o link
 * de "esqueci a senha" chega por e-mail e abre numa aba nova, que não herda o
 * sessionStorage da aba onde o pedido foi feito. Essas ficam no localStorage.
 */
const isPkce = (key: string) => key.endsWith("-code-verifier");
const backing = (key: string): Storage => (isPkce(key) ? localStorage : sessionStorage);

const sessionScopedStorage = {
  getItem(key: string): string | null {
    try {
      return backing(key).getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      backing(key).setItem(key, value);
    } catch {
      /* storage indisponível: sessão fica só em memória (some ao fechar) */
    }
  },
  removeItem(key: string): void {
    try {
      backing(key).removeItem(key);
    } catch {
      /* nada a remover */
    }
  },
};

/**
 * Cliente único do app. PKCE: o magic link volta com ?code=... na query,
 * o que convive em paz com o HashRouter (#/rota).
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
    storage: sessionScopedStorage,
  },
});
