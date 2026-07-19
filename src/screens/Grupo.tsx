import { useState } from "react";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { presentToday, sessionsThisWeek, weekPresence, weekStreak } from "../lib/logic";
import { Avatar, BigButton, Chip } from "../components/ui";
import { IconCheck, IconX } from "../components/icons";
import { WEEKDAY_LETTERS } from "../lib/dates";
import "./grupo.css";

export function Grupo() {
  const { state } = useStore();
  const sync = useSync();
  const connected = !!sync.session;
  const inGroup = connected && !!sync.group;

  const localMe = state.members.find((m) => m.isMe)!;
  const localFriends = state.members.filter((m) => !m.isMe);
  // grupo real conectado → amigos reais; senão, grupo de demonstração
  const friends = inGroup ? (sync.friends ?? []) : localFriends;
  const members = [localMe, ...friends];
  const todayCount = members.filter(presentToday).length;

  return (
    <main className="screen grupo">
      <header className="grupo-head rise">
        <p className="eyebrow">{inGroup ? sync.group!.name : "Grupo de demonstração"}</p>
        <h1>O grupo</h1>
        <p className="grupo-sub">
          {todayCount === 0
            ? "Ninguém apareceu ainda hoje. Alguém puxa a fila?"
            : `${todayCount} de ${members.length} apareceram hoje.`}
        </p>
      </header>

      <ConnectionCard />

      <section className="card grupo-week rise">
        <p className="eyebrow">A semana de cada um</p>
        <div className="gw-grid">
          <div className="gw-row gw-row-head" aria-hidden>
            <span />
            {WEEKDAY_LETTERS.map((l, i) => (
              <em key={i}>{l}</em>
            ))}
          </div>
          {members.map((m) => {
            const week = weekPresence(m);
            return (
              <div key={m.id} className="gw-row">
                <div className="gw-member">
                  <Avatar initials={m.initials} color={m.color} size={34} />
                  <span>
                    {m.name}
                    {m.isMe && <small> (você)</small>}
                  </span>
                </div>
                {week.map((did, i) => (
                  <i
                    key={i}
                    className={`gw-dot ${did ? "gw-dot-on" : ""}`}
                    style={did ? { background: m.color } : undefined}
                  />
                ))}
              </div>
            );
          })}
        </div>
        {inGroup && friends.length === 0 && (
          <p className="grupo-alone">
            Por enquanto é só você. Manda o código <b>{sync.group!.invite_code}</b> pros
            amigos da academia — 3 a 5 já muda tudo.
          </p>
        )}
      </section>

      <section className="grupo-cards">
        {members.map((m, idx) => {
          const streak = weekStreak(m);
          const n = sessionsThisWeek(m);
          const today = presentToday(m);
          return (
            <article
              key={m.id}
              className="card grupo-person rise"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <Avatar initials={m.initials} color={m.color} size={44} dimmed={!today} />
              <div className="gp-info">
                <b>
                  {m.name}
                  {m.isMe && <small> (você)</small>}
                </b>
                <small>
                  {n} {n === 1 ? "treino" : "treinos"} essa semana
                </small>
              </div>
              {today ? (
                <span className="gp-today">
                  <IconCheck size={14} stroke={3} /> hoje
                </span>
              ) : streak > 1 ? (
                <Chip tone="neutral">{streak} sem. no ritmo</Chip>
              ) : (
                <Chip tone="neutral">—</Chip>
              )}
            </article>
          );
        })}
      </section>

      <p className="grupo-privacy rise">
        Aqui o grupo vê presença e constância — nunca peso, medidas ou fotos. Aparecer é o
        que conta.
      </p>
    </main>
  );
}

/* ————— conexão: login por e-mail e grupo real ————— */

function ConnectionCard() {
  const sync = useSync();
  const [sheet, setSheet] = useState<"login" | "grupo" | null>(null);

  if (!sync.session) {
    return (
      <>
        <button className="card conn-card rise" onClick={() => setSheet("login")}>
          <span className="conn-dot" />
          <div>
            <b>Entrar no grupo de verdade</b>
            <small>login por e-mail · seus dados sincronizam na nuvem</small>
          </div>
        </button>
        {sheet === "login" && <LoginSheet onClose={() => setSheet(null)} />}
      </>
    );
  }

  if (!sync.group) {
    return (
      <>
        <button className="card conn-card rise" onClick={() => setSheet("grupo")}>
          <span className="conn-dot conn-dot-on" />
          <div>
            <b>Conectado — falta o grupo</b>
            <small>crie o seu ou entre com o código de um amigo</small>
          </div>
        </button>
        {sheet === "grupo" && <GroupSheet onClose={() => setSheet(null)} />}
      </>
    );
  }

  return (
    <div className="card conn-card conn-card-ok rise">
      <span className="conn-dot conn-dot-on" />
      <div>
        <b>{sync.group.name}</b>
        <small>
          código de convite: <b className="conn-code">{sync.group.invite_code}</b>
        </small>
      </div>
      <button className="conn-out" onClick={() => sync.signOut()}>
        sair
      </button>
    </div>
  );
}

function LoginSheet({ onClose }: { onClose: () => void }) {
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
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="picker-head">
          <h2>Entrar</h2>
          <button onClick={onClose} aria-label="Fechar">
            <IconX />
          </button>
        </header>
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
      </div>
    </div>
  );
}

function GroupSheet({ onClose }: { onClose: () => void }) {
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
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="picker-head">
          <h2>Seu grupo</h2>
          <button onClick={onClose} aria-label="Fechar">
            <IconX />
          </button>
        </header>
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
          placeholder="A1B2C3"
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
      </div>
    </div>
  );
}
