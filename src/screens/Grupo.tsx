import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import {
  currentChallenge,
  presentToday,
  readChallenge,
  sessionsThisWeek,
  weekPresence,
  weekStreak,
} from "../lib/logic";
import type { Member } from "../lib/types";
import { Avatar, BigButton, Chip } from "../components/ui";
import { IconCheck, IconMedal, IconPlus, IconUp, IconX } from "../components/icons";
import { LoginSheet, GroupSheet } from "../components/account";
import { Portal } from "../components/Portal";
import { WEEKDAY_LETTERS, addDays, toISO, todayISO } from "../lib/dates";
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

      <DesafioCard members={members} />

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
              <div className="gp-chips">
                {typeof m.stats?.volumePct === "number" && m.stats.volumePct > 0 && (
                  <Chip tone="mata">
                    <IconUp size={12} /> carga +{m.stats.volumePct}%
                  </Chip>
                )}
                {today ? (
                  <span className="gp-today">
                    <IconCheck size={14} stroke={3} /> hoje
                  </span>
                ) : streak > 1 ? (
                  <Chip tone="neutral">{streak} sem. no ritmo</Chip>
                ) : (
                  <Chip tone="neutral">—</Chip>
                )}
              </div>
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

/* ————— desafio (Fase 3): prazo + grupo + check-in ————— */

function DesafioCard({ members }: { members: Member[] }) {
  const { state, dispatch } = useStore();
  const sync = useSync();
  const inGroup = !!sync.session && !!sync.group;
  const challenges = inGroup ? (sync.challenges ?? []) : state.challenges;
  const challenge = currentChallenge(challenges);
  const [creating, setCreating] = useState(false);

  const view = useMemo(
    () => (challenge ? readChallenge(challenge, members) : null),
    [challenge, members]
  );
  const leaderCount = view?.standings[0]?.checkins ?? 0;

  return (
    <>
      {view ? (
        <section className="card desafio-card rise">
          <header className="desafio-head">
            <div>
              <p className="eyebrow">
                {view.ended
                  ? "Desafio encerrado"
                  : `Desafio · dia ${view.dayNumber} de ${view.totalDays}`}
              </p>
              <h2>{view.challenge.name}</h2>
            </div>
            {view.ended && view.champions.length > 0 && (
              <Chip tone="ambar">
                <IconMedal size={13} />
                {view.champions.map((c) => c.name).join(" e ")}
              </Chip>
            )}
          </header>

          {!view.ended && (
            <div className="desafio-bar" aria-hidden>
              <span style={{ width: `${(view.dayNumber / view.totalDays) * 100}%` }} />
            </div>
          )}

          <ol className="desafio-rank">
            {view.standings.map((s) => (
              <li key={s.member.id} className={s.member.isMe ? "dr-me" : ""}>
                <span className="dr-pos serif-num">{s.rank}</span>
                <Avatar initials={s.member.initials} color={s.member.color} size={32} />
                <span className="dr-name">
                  {s.member.name}
                  {s.member.isMe && <small> (você)</small>}
                </span>
                <span className="dr-bar">
                  <em
                    style={{
                      width: `${leaderCount ? (s.checkins / leaderCount) * 100 : 0}%`,
                      background: s.member.color,
                    }}
                  />
                </span>
                <b className="dr-count serif-num">{s.checkins}</b>
              </li>
            ))}
          </ol>

          <p className="desafio-foot">
            {view.ended
              ? "Quem apareceu, ganhou — e todo mundo que apareceu também."
              : "1 check-in por dia: concluiu treino, pontuou."}
          </p>

          {view.ended && (
            <BigButton onClick={() => setCreating(true)} tone="ghost">
              <IconPlus size={18} />
              Novo desafio
            </BigButton>
          )}
        </section>
      ) : (
        <button className="card conn-card rise" onClick={() => setCreating(true)}>
          <span className="conn-dot" />
          <div>
            <b>Nenhum desafio rolando</b>
            <small>prazo + grupo + check-in — o empurrão que funciona</small>
          </div>
        </button>
      )}

      {creating && (
        <DesafioSheet
          onClose={() => setCreating(false)}
          onCreate={async (name, days) => {
            if (inGroup) return sync.createChallenge(name, days);
            dispatch({
              type: "ADD_CHALLENGE",
              challenge: {
                id: `c-${Date.now()}`,
                name: name.trim(),
                startsOn: todayISO(),
                endsOn: toISO(addDays(new Date(), days - 1)),
              },
            });
            return null;
          }}
        />
      )}
    </>
  );
}

function DesafioSheet({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, days: number) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const err = await onCreate(name, days);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Portal>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <header className="picker-head">
            <h2>Novo desafio</h2>
            <button onClick={onClose} aria-label="Fechar">
              <IconX />
            </button>
          </header>
          <p className="conn-note">
            Prazo fechado, grupo fechado, um check-in por dia de treino. Simples assim.
          </p>
          <input
            className="food-search"
            placeholder="Desafio dos 30"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="desafio-days">
            {[15, 30, 45].map((d) => (
              <button
                key={d}
                className={`pf ${days === d ? "pf-on" : ""}`}
                onClick={() => setDays(d)}
              >
                {d} dias
              </button>
            ))}
          </div>
          {error && <p className="conn-error">{error}</p>}
          <BigButton onClick={submit} tone="pulse" disabled={busy || name.trim().length < 2}>
            {busy ? "Criando…" : "Começar desafio"}
          </BigButton>
        </div>
      </div>
    </Portal>
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

