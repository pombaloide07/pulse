import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { isPasswordPwned } from "../lib/pwned";
import { Avatar, BigButton, Sheet } from "./ui";
import { IconBack, IconPulse } from "./icons";
import "./account.css";

const PWNED_MSG = "Essa senha apareceu em vazamentos de dados públicos. Escolha outra.";

/* ————— entrar / criar conta (e-mail + senha) —————
   Um só formulário, dois invólucros: tela dedicada (LoginScreen) e bottom
   sheet (LoginSheet). Login e cadastro são só e-mail e senha, sem etapa de
   confirmação; o e-mail só entra em cena no "esqueci a senha". */

type LoginMode = "entrar" | "criar" | "esqueci" | "esqueci-ok";

function LoginForm({
  variant,
  onClose,
  initialMode = "entrar",
}: {
  variant: "sheet" | "screen";
  onClose: () => void;
  initialMode?: LoginMode;
}) {
  const sync = useSync();
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
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

  // ————— fluxo de recuperação de senha —————
  if (mode === "esqueci" || mode === "esqueci-ok") {
    return (
      <div className="login-form">
        {variant === "screen" && (
          <h1 className="login-title">
            Recuperar <em>senha.</em>
          </h1>
        )}
        {mode === "esqueci" ? (
          <>
            <p className="conn-note">Te mando um link por e-mail pra definir uma senha nova.</p>
            <label className="field-l">
              <span className="field-l-label">E-mail</span>
              <span className="field-l-box">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </span>
            </label>
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
        ) : (
          <>
            <p className="conn-note">
              Enviado pra <b>{email}</b>. Abre o link neste navegador e o app pede a
              senha nova.
            </p>
            <BigButton onClick={variant === "screen" ? () => setMode("entrar") : onClose} tone="ink">
              {variant === "screen" ? "Voltar pro login" : "Fechar"}
            </BigButton>
          </>
        )}
      </div>
    );
  }

  // ————— entrar / criar conta —————
  const isCreate = mode === "criar";

  const onFieldEnter = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (isCreate) {
      if (emailOk && passOk) doSignUp();
    } else if (emailOk && password) {
      doSignIn();
    }
  };

  return (
    <div className="login-form">
      {variant === "screen" && (
        <>
          <h1 className="login-title">
            {isCreate ? (
              <>
                Comece a <em>aparecer.</em>
              </>
            ) : (
              <>
                Bom te ver<br />de <em>volta.</em>
              </>
            )}
          </h1>
          <p className="login-sub">
            {isCreate
              ? "Crie sua conta com e-mail e senha — sem etapa de confirmação, você já entra."
              : "Entre pra sincronizar seus treinos e ver quem da turma já apareceu hoje."}
          </p>
        </>
      )}

      <div className="th-seg login-seg" role="tablist" aria-label="Entrar ou criar conta">
        <button
          role="tab"
          aria-selected={!isCreate}
          className={!isCreate ? "th-seg-on" : ""}
          onClick={() => { setError(null); setMode("entrar"); }}
        >
          Entrar
        </button>
        <button
          role="tab"
          aria-selected={isCreate}
          className={isCreate ? "th-seg-on" : ""}
          onClick={() => { setError(null); setMode("criar"); }}
        >
          Criar conta
        </button>
      </div>

      <div className="login-fields">
        <label className="field-l">
          <span className="field-l-label">E-mail</span>
          <span className="field-l-box">
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              onKeyDown={onFieldEnter}
            />
          </span>
        </label>
        <label className="field-l">
          <span className="field-l-label">Senha</span>
          <span className="field-l-box">
            <input
              type={showPass ? "text" : "password"}
              placeholder={isCreate ? "mínimo 8 caracteres" : "sua senha"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isCreate ? "new-password" : "current-password"}
              onKeyDown={onFieldEnter}
            />
            {password.length > 0 && (
              <button type="button" className="field-l-show" onClick={() => setShowPass((s) => !s)}>
                {showPass ? "ocultar" : "mostrar"}
              </button>
            )}
          </span>
        </label>
        {!isCreate && (
          <button className="login-forgot" onClick={() => { setError(null); setMode("esqueci"); }}>
            Esqueci a senha
          </button>
        )}
      </div>

      {error && <p className="conn-error">{error}</p>}

      <BigButton
        onClick={isCreate ? doSignUp : doSignIn}
        tone="pulse"
        disabled={busy || !emailOk || (isCreate ? !passOk : !password)}
      >
        {busy
          ? isCreate ? "Criando…" : "Entrando…"
          : isCreate ? "Criar conta e entrar" : "Entrar"}
      </BigButton>

      {variant === "sheet" && isCreate && (
        <p className="conn-note conn-note-mid">Sem etapa de confirmação — você já entra.</p>
      )}
    </div>
  );
}

/** Bottom sheet de login: usado em contexto (aba Grupo "entrar no grupo", modo
    demo). Mesmo formulário da tela dedicada, num invólucro de sheet. */
export function LoginSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Sua conta" onClose={onClose}>
      <LoginForm variant="sheet" onClose={onClose} />
    </Sheet>
  );
}

/** Tela cheia de login: quem já entrou neste aparelho vê isto ao ser deslogado
    (ex.: reabriu o app depois de fechar), e para onde os CTAs da Landing levam.
    O atalho de demo evita prender quem quer só espiar sem a conta. */
export function LoginScreen({
  onExplore,
  onBack,
  initialMode = "entrar",
}: {
  onExplore: () => void;
  onBack?: () => void;
  initialMode?: LoginMode;
}) {
  return (
    <main className="login-screen">
      <div className="aurora" aria-hidden />
      <div className="login-screen-inner rise">
        {onBack && (
          <button className="login-back" onClick={onBack} aria-label="Voltar">
            <IconBack size={22} />
          </button>
        )}
        <span className="login-brand-tile">
          <IconPulse size={30} stroke={2.4} />
        </span>
        <LoginForm variant="screen" onClose={() => {}} initialMode={initialMode} />
        <div className="login-divider" aria-hidden>
          <span />
          ou
          <span />
        </div>
        <button className="login-explore-btn" onClick={onExplore}>
          Explorar sem conta
        </button>
        <p className="login-note">Cadastro sem etapa de confirmação — você já entra.</p>
      </div>
    </main>
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
