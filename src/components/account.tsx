import { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { Avatar, BigButton, Sheet } from "./ui";
import { IconCheck } from "./icons";
import "./account.css";

/* ————— entrar / criar conta (e-mail + senha) —————
   Login normal é só e-mail e senha. A confirmação por e-mail existe apenas
   na criação da conta (e no "esqueci a senha"). */

type LoginMode = "entrar" | "criar" | "confirmar" | "esqueci" | "esqueci-ok";

export function LoginSheet({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const [mode, setMode] = useState<LoginMode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = email.includes("@") && email.includes(".");
  const passOk = password.length >= 8;

  const run = async (fn: () => Promise<string | null>, then?: () => void) => {
    setBusy(true);
    setError(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
    else then?.();
  };

  const doSignIn = () => run(() => sync.signIn(email.trim(), password), onClose);

  const doSignUp = async () => {
    setBusy(true);
    setError(null);
    const r = await sync.signUp(email.trim(), password);
    setBusy(false);
    if (r.error) setError(r.error);
    else if (r.needsConfirm) setMode("confirmar");
    else onClose(); // projeto sem confirmação: já entrou
  };

  const doConfirm = () => run(() => sync.confirmSignup(email.trim(), code), onClose);

  const doReset = () =>
    run(() => sync.resetPassword(email.trim()), () => setMode("esqueci-ok"));

  const title =
    mode === "criar" ? "Criar conta"
    : mode === "confirmar" ? "Confirme seu e-mail"
    : mode === "esqueci" || mode === "esqueci-ok" ? "Recuperar senha"
    : "Entrar";

  return (
    <Sheet title={title} onClose={onClose}>
      {mode === "entrar" && (
        <>
          <input
            className="food-search"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
          <input
            className="food-search"
            type="password"
            placeholder="sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter" && emailOk && password.length > 0) doSignIn();
            }}
          />
          {error && <p className="conn-error">{error}</p>}
          <BigButton onClick={doSignIn} tone="pulse" disabled={busy || !emailOk || !password}>
            {busy ? "Entrando…" : "Entrar"}
          </BigButton>
          <div className="login-links">
            <button onClick={() => { setError(null); setMode("criar"); }}>
              Criar conta
            </button>
            <span aria-hidden>·</span>
            <button onClick={() => { setError(null); setMode("esqueci"); }}>
              Esqueci a senha
            </button>
          </div>
        </>
      )}

      {mode === "criar" && (
        <>
          <p className="conn-note">
            E-mail e senha — você só confirma o e-mail uma vez, na criação.
          </p>
          <input
            className="food-search"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
          <input
            className="food-search"
            type="password"
            placeholder="senha (mínimo 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {error && <p className="conn-error">{error}</p>}
          <BigButton onClick={doSignUp} tone="pulse" disabled={busy || !emailOk || !passOk}>
            {busy ? "Criando…" : "Criar conta"}
          </BigButton>
          <div className="login-links">
            <button onClick={() => { setError(null); setMode("entrar"); }}>
              Já tenho conta — entrar
            </button>
          </div>
        </>
      )}

      {mode === "confirmar" && (
        <>
          <p className="conn-note">
            Mandei um e-mail pra <b>{email}</b>. Clica no link de confirmação (neste
            navegador) — ou, se vier um código, digita aqui:
          </p>
          <input
            className="food-search conn-code-input"
            inputMode="numeric"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && <p className="conn-error">{error}</p>}
          <BigButton onClick={doConfirm} tone="pulse" disabled={busy || code.trim().length < 6}>
            {busy ? "Conferindo…" : "Confirmar código"}
          </BigButton>
          <BigButton onClick={onClose} tone="ghost">
            Vou clicar no link
          </BigButton>
        </>
      )}

      {mode === "esqueci" && (
        <>
          <p className="conn-note">
            Te mando um link por e-mail pra definir uma senha nova.
          </p>
          <input
            className="food-search"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
          {error && <p className="conn-error">{error}</p>}
          <BigButton onClick={doReset} tone="pulse" disabled={busy || !emailOk}>
            {busy ? "Enviando…" : "Enviar link"}
          </BigButton>
          <div className="login-links">
            <button onClick={() => { setError(null); setMode("entrar"); }}>
              Voltar pro login
            </button>
          </div>
        </>
      )}

      {mode === "esqueci-ok" && (
        <>
          <p className="conn-note">
            Enviado pra <b>{email}</b>. Abre o link neste navegador e o app pede a
            senha nova.
          </p>
          <BigButton onClick={onClose} tone="ink">
            Fechar
          </BigButton>
        </>
      )}
    </Sheet>
  );
}

/* ————— senha nova (chegou pelo link de recuperação) ————— */

export function NewPasswordSheet() {
  const sync = useSync();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const err = await sync.updatePassword(password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <Sheet title="Nova senha" onClose={() => {}}>
      <p className="conn-note">Você chegou pelo link de recuperação. Define a senha nova:</p>
      <input
        className="food-search"
        type="password"
        placeholder="nova senha (mínimo 8 caracteres)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        autoFocus
      />
      {error && <p className="conn-error">{error}</p>}
      <BigButton onClick={save} tone="pulse" disabled={busy || password.length < 8}>
        {busy ? "Salvando…" : "Salvar senha"}
      </BigButton>
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
  const [copied, setCopied] = useState<"grupo" | "amigo" | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const logout = async () => {
    if (!confirmOut) {
      setConfirmOut(true);
      window.setTimeout(() => setConfirmOut(false), 3000);
      return;
    }
    await sync.signOut();
    onClose();
  };

  const copy = async (text: string, which: "grupo" | "amigo") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard indisponível — o código está visível de qualquer forma */
    }
  };

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true);
    setAvatarErr(null);
    const err = await sync.uploadAvatar(file);
    setAvatarBusy(false);
    if (err) setAvatarErr(err);
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
                  <button
                    className="acc-avatar-btn"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Trocar foto de perfil"
                    disabled={avatarBusy}
                  >
                    <Avatar
                      initials={me?.initials ?? "??"}
                      color={me?.color ?? "#e4573d"}
                      photoUrl={sync.myAvatarUrl}
                      size={56}
                    />
                    <span className="acc-avatar-edit">{avatarBusy ? "…" : "foto"}</span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      pickAvatar(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <div className="acc-id-info">
                    <b>{state.userName || "Você"}</b>
                    <small>{sync.session.user.email ?? "conta conectada"}</small>
                  </div>
                </div>
                {avatarErr && <p className="conn-error">{avatarErr}</p>}

                {sync.myFriendCode && (
                  <div className="acc-group">
                    <p className="eyebrow">Amizades</p>
                    <div className="acc-code-row">
                      <span>
                        seu código de amigo: <b className="conn-code">{sync.myFriendCode}</b>
                      </span>
                      <button className="acc-copy" onClick={() => copy(sync.myFriendCode!, "amigo")}>
                        {copied === "amigo" ? (
                          <>
                            <IconCheck size={13} stroke={3} /> copiado
                          </>
                        ) : (
                          "copiar"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {sync.group ? (
                  <div className="acc-group">
                    <p className="eyebrow">Grupo</p>
                    <b>{sync.group.name}</b>
                    <div className="acc-code-row">
                      <span>
                        código de convite: <b className="conn-code">{sync.group.invite_code}</b>
                      </span>
                      <button
                        className="acc-copy"
                        onClick={() => copy(sync.group!.invite_code, "grupo")}
                      >
                        {copied === "grupo" ? (
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
                  Entrar ou criar conta
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
          <Avatar
            initials={me?.initials ?? "??"}
            color={me?.color ?? "#e4573d"}
            photoUrl={sync.myAvatarUrl}
            size={44}
          />
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
