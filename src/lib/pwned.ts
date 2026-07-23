/**
 * Proteção contra senha vazada — k-anonymity da HaveIBeenPwned (mesmo dataset
 * do "leaked password protection" do Supabase, mas no cliente).
 * Só os 5 primeiros hex do SHA-1 saem do aparelho; o resto é comparado local.
 * Fail-open: se a rede/API falhar, NÃO trava o cadastro (retorna false).
 */

export async function pwnedCount(password: string): Promise<number> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-1", data);
  const hashHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const prefix = hashHex.slice(0, 5); // vai à rede
  const suffix = hashHex.slice(5); // 35 chars, comparado local

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  if (!res.ok) throw new Error(`HIBP range HTTP ${res.status}`);

  const body = await res.text();
  for (const line of body.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    if (line.slice(0, idx).trim().toUpperCase() === suffix) {
      return parseInt(line.slice(idx + 1).trim(), 10) || 0; // 0 = padding
    }
  }
  return 0;
}

export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    return (await pwnedCount(password)) > 0;
  } catch (err) {
    console.warn("[pwned] indisponível, liberando cadastro:", err);
    return false; // fail-open — não trava se a API cair
  }
}
