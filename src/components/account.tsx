import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { isPasswordPwned } from "../lib/pwned";
import { Avatar, BigButton, Sheet } from "./ui";
import "./account.css";

const PWNED_MSG = "Essa senha apareceu em vazamentos de dados públicos. Escolha outra.";

/* ————— entrar / criar conta (e-mail + senha) —————
   Login e cadastro são só e-mail e senha, sem etapa de confirmação. O e-mail
   só entra em cena no "esqueci a senha". */

type LoginMode = "entrar" | "criar" | "esqueci" | "esqueci-ok";

export function LoginSheet({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const [mode, setMode] = useState<LoginMode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  // cadastro sem confirmação: entra direto. Bloqueia senha vazada (HIBP).
  const doSignUp = () =>
    run(async () => {
      if (await isPasswordPwned(password)) return PWNED_MSG;
      return sync.signUp(email.trim(), password);
    }, onClose);

  const doReset = () =>
    run(() => sync.resetPassword(email.trim()), () => setMode("esqueci-ok"));

  const title =
    mode === "criar" ? "Criar conta"
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
            E-mail e senha e pronto — sem etapa de confirmação, você já entra.
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
            {busy ? "Criando…" : "Criar conta e entrar"}
          </BigButton>
          <div className="login-links">
            <button onClick={() => { setError(null); setMode("entrar"); }}>
              Já tenho conta — entrar
            </button>
          </div>
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
    if (await isPasswordPwned(password)) {
      setBusy(false);
      setError(PWNED_MSG);
      return;
    }
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

/* ————— modo demo (deslogado): entrar ou criar conta ————— */

function DemoSheet({ onClose }: { onClose: () => void }) {
  const [login, setLogin] = useState(false);

  if (login) return <LoginSheet onClose={onClose} />;
  return (
    <Sheet title="Modo demonstração" onClose={onClose}>
      <p className="conn-note">
        Você está vendo dados de exemplo, salvos só neste aparelho. Entre pra ter sua
        conta de verdade e sincronizar com o grupo.
      </p>
      <BigButton onClick={() => setLogin(true)} tone="pulse">
        Entrar ou criar conta
      </BigButton>
    </Sheet>
  );
}

/* ————— botão de conta no header (Hoje) ————— */

export function HeaderAccount() {
  const { state } = useStore();
  const sync = useSync();
  const navigate = useNavigate();
  const me = state.members.find((m) => m.isMe);
  const [open, setOpen] = useState(false);

  return (
    <>
      {sync.session ? (
        // logado: vai direto pra tela de Ajustes (perfil, notificações, sair)
        <button
          className="hoje-account"
          onClick={() => navigate("/ajustes")}
          aria-label="Sua conta e ajustes"
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
      {open && !sync.session && <DemoSheet onClose={() => setOpen(false)} />}
    </>
  );
}
