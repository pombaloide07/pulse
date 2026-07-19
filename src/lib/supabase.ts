import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./supabaseConfig";

/**
 * Cliente único do app. PKCE: o magic link volta com ?code=... na query,
 * o que convive em paz com o HashRouter (#/rota).
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true,
    persistSession: true,
  },
});
