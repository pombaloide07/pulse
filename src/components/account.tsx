import { useState } from "react";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { Avatar, BigButton, Sheet } from "./ui";
import { IconCheck } from "./icons";
import "./account.css";

/* ————— entrar por e-mail (magic link) ————— */

export function LoginSheet({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const err = await sync.sendLink(email.trim());
    setBusy(false);
    if (err) setError(err);
    else setSent(true);
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const err = await sync.verifyCode(email.trim(), code);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Sheet title="Entrar" onClose={onClose}>
          {!sent ? (
            <>
              <p className="conn-note">
                Te mando um link mágico por e-mail. Abre ele neste mesmo navegador e pronto.
              </p>
              <input
                className="food-search"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              {error && <p className="conn-error">{error}</p>}
              <BigButton onClick={send} tone="pulse" disabled={busy || !email.includes("@")}>
                {busy ? "Enviando…" : "Enviar link"}
              </BigButton>
            </>
          ) : (
            <>
              <p className="conn-note">
                Enviado pra <b>{email}</b>. Clica no link do e-mail (neste navegador) — ou, se
                vier um código, digita aqui:
              </p>
              <input
                className="food-search conn-code-input"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {error && <p className="conn-error">{error}</p>}
              <BigButton onClick={verify} tone="pulse" disabled={busy || code.trim().length < 6}>
                {busy ? "Conferindo…" : "Confirmar código"}
              </BigButton>
              <BigButton onClick={onClose} tone="ghost">
                Vou clicar no link
              </BigButton>
            </>
          )}
    </Sheet>
  );
}

/* ————— criar / entrar num grupo ————— */

export function GroupSheet({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Sheet title="Seu grupo" onClose={onClose}>
          <p className="conn-note">Crie o grupo da academia…</p>
          <input
            className="food-search"
            placeholder="Academia do Barão"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <BigButton
            onClick={() => run(() => sync.createGroup(name))}
            tone="pulse"
            disabled={busy || name.trim().length < 2}
          >
            Criar grupo
          </BigButton>
          <p className="conn-note conn-note-mid">…ou entre com o código de convite:</p>
          <input
            className="food-search conn-code-input"
            placeholder="A1B2C3D4E5"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          {error && <p className="conn-error">{error}</p>}
          <BigButton
            onClick={() => run(() => sync.joinGroup(code))}
            tone="ink"
            disabled={busy || code.trim().length < 4}
          >
            Entrar no grupo
          </BigButton>
    </Sheet>
  );
}

/* ————— sua conta (logado) / modo demo (deslogado) ————— */

function AccountSheet({ onClose }: { onClose: () => void }) {
  const { state } = useStore();
  const sync = useSync();
  const me = state.members.find((m) => m.isMe);
  const [sub, setSub] = useState<"login" | "grupo" | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [copied, setCopied] = useState(false);

  const logout = async () => {
    if (!confirmOut) {
      setConfirmOut(true);
      window.setTimeout(() => setConfirmOut(false), 3000);
      return;
    }
    await sync.signOut();
    onClose();
  };

  const copyCode = async () => {
    if (!sync.group) return;
    try {
      await navigator.clipboard.writeText(sync.group.invite_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível — o código está visível de qualquer forma */
    }
  };

  return (
    <>
      {/* esconde o sheet de conta enquanto um sub-sheet (login/grupo) está aberto,
          pra não empilhar dois backdrops full-screen no mesmo portal-root */}
      {sub === null && (
      <Sheet title={sync.session ? "Sua conta" : "Modo demonstração"} onClose={onClose}>
            {sync.session ? (
              <>
                <div className="acc-identity">
                  <Avatar initials={me?.initials ?? "??"} color={me?.color ?? "#e4573d"} size={56} />
                  <div className="acc-id-info">
                    <b>{state.userName || "Você"}</b>
                    <small>{sync.session.user.email ?? "conta conectada"}</small>
                  </div>
                </div>

                {sync.group ? (
                  <div className="acc-group">
                    <p className="eyebrow">Grupo</p>
                    <b>{sync.group.name}</b>
                    <div className="acc-code-row">
                      <span>
                        código de convite: <b className="conn-code">{sync.group.invite_code}</b>
                      </span>
                      <button className="acc-copy" onClick={copyCode}>
                        {copied ? (
                          <>
                            <IconCheck size={13} stroke={3} /> copiado
                          </>
                        ) : (
                          "copiar"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <BigButton onClick={() => setSub("grupo")} tone="ghost">
                    Entrar num grupo
                  </BigButton>
                )}

                <BigButton onClick={logout} tone="ink">
                  {confirmOut ? "Tocar de novo pra sair" : "Sair da conta"}
                </BigButton>
                <p className="acc-note">
                  Seus dados ficam salvos na nuvem e voltam em qualquer aparelho.
                </p>
              </>
            ) : (
              <>
                <p className="conn-note">
                  Você está vendo dados de exemplo, salvos só neste aparelho. Entre pra ter sua
                  conta de verdade e sincronizar com o grupo.
                </p>
                <BigButton onClick={() => setSub("login")} tone="pulse">
                  Entrar com e-mail
                </BigButton>
              </>
            )}
      </Sheet>
      )}

      {/* sub-sheets atados à sessão: se ela cair por baixo, desmontam junto */}
      {!sync.session && sub === "login" && <LoginSheet onClose={() => setSub(null)} />}
      {sync.session && sub === "grupo" && <GroupSheet onClose={() => setSub(null)} />}
    </>
  );
}

/* ————— botão de conta no header (Hoje) ————— */

export function HeaderAccount() {
  const { state } = useStore();
  const sync = useSync();
  const me = state.members.find((m) => m.isMe);
  const [open, setOpen] = useState(false);

  return (
    <>
      {sync.session ? (
        <button
          className="hoje-account"
          onClick={() => setOpen(true)}
          aria-label="Sua conta"
        >
          <Avatar initials={me?.initials ?? "??"} color={me?.color ?? "#e4573d"} size={44} />
          <span className="hoje-account-dot" />
        </button>
      ) : (
        <button
          className="hoje-account demo"
          onClick={() => setOpen(true)}
          aria-label="Modo demonstração — entrar"
        >
          <span className="hoje-demo-dot" />
          Modo demo
        </button>
      )}
      {open && <AccountSheet onClose={() => setOpen(false)} />}
    </>
  );
}
