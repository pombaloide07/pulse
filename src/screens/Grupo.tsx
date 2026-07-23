import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { presentToday, sessionsThisWeek, weekPresence, weekStreak } from "../lib/logic";
import type { Member } from "../lib/types";
import { Avatar, BigButton, Chip, Sheet } from "../components/ui";
import { IconCheck, IconUp } from "../components/icons";
import { ConnectionCard, GroupSheet } from "../components/account";
import { DesafiosSection } from "../components/challenges";
import { AmigosSection } from "../components/friendsTab";
import { WEEKDAY_LETTERS } from "../lib/dates";
import "./grupo.css";

type Seg = "turma" | "desafios" | "amigos";

export function Grupo() {
  const { state } = useStore();
  const sync = useSync();
  const [params, setParams] = useSearchParams();
  const seg: Seg =
    params.get("seg") === "desafios"
      ? "desafios"
      : params.get("seg") === "amigos"
        ? "amigos"
        : "turma";
  const setSeg = (s: Seg) =>
    setParams(s === "turma" ? {} : { seg: s }, { replace: true });

  const connected = !!sync.session;
  const inGroup = connected && !!sync.group;

  const localMe = state.members.find((m) => m.isMe);
  const me: Member = {
    ...(localMe ?? {
      id: "m-me",
      name: state.userName,
      initials: "??",
      color: "#e4573d",
      isMe: true,
      presence: [],
    }),
    avatarUrl: sync.myAvatarUrl ?? undefined,
  };
  const localFriends = state.members.filter((m) => !m.isMe);
  // grupo real conectado → amigos reais; senão, grupo de demonstração
  const friends = inGroup ? (sync.friends ?? []) : localFriends;
  const members = [me, ...friends];
  const todayCount = members.filter(presentToday).length;

  return (
    <main className="screen grupo">
      <header className="grupo-head rise">
        <p className="eyebrow">{inGroup ? sync.group!.name : "Grupo de demonstração"}</p>
        <h1>O grupo</h1>
        {seg === "turma" && (
          <p className="grupo-sub">
            {todayCount === 0
              ? "Ninguém apareceu ainda hoje. Alguém puxa a fila?"
              : `${todayCount} de ${members.length} apareceram hoje.`}
          </p>
        )}
      </header>

      <div className="th-seg th-seg-3 rise" role="tablist" aria-label="Seção do grupo">
        <button
          role="tab"
          aria-selected={seg === "turma"}
          className={seg === "turma" ? "th-seg-on" : ""}
          onClick={() => setSeg("turma")}
        >
          Turma
        </button>
        <button
          role="tab"
          aria-selected={seg === "desafios"}
          className={seg === "desafios" ? "th-seg-on" : ""}
          onClick={() => setSeg("desafios")}
        >
          Desafios
        </button>
        <button
          role="tab"
          aria-selected={seg === "amigos"}
          className={seg === "amigos" ? "th-seg-on" : ""}
          onClick={() => setSeg("amigos")}
        >
          Amigos
        </button>
      </div>

      {seg === "turma" && <TurmaSection members={members} />}
      {seg === "desafios" && <DesafiosSection members={members} />}
      {seg === "amigos" && <AmigosSection />}
    </main>
  );
}

/* ————— a turma (grupo da academia) ————— */

function TurmaSection({ members }: { members: Member[] }) {
  const sync = useSync();
  const inGroup = !!sync.session && !!sync.group;
  const friends = members.filter((m) => !m.isMe);

  return (
    <>
      <TurmaBar />

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
                  <Avatar initials={m.initials} color={m.color} photoUrl={m.avatarUrl} size={34} />
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
              <Avatar
                initials={m.initials}
                color={m.color}
                photoUrl={m.avatarUrl}
                size={44}
                dimmed={!today}
              />
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
        Aqui o grupo vê presença e constância — nunca peso, medidas ou fotos do corpo
        sem você escolher. Aparecer é o que conta.
      </p>
    </>
  );
}

/* ————— barra da turma: qual é a ativa, trocar, renomear e convidar ————— */

function TurmaBar() {
  const sync = useSync();
  const [editing, setEditing] = useState(false);
  const [outra, setOutra] = useState(false);
  const groups = sync.myGroups ?? [];

  // sem conta ou sem turma, a porta de entrada resolve
  // (ConnectionCard vive em components/account.tsx — a aba Desafios usa o mesmo)
  if (!sync.session || !sync.group) return <ConnectionCard />;

  return (
    <>
      <section className="card turma-bar rise">
        <div className="turma-bar-head">
          <div>
            <p className="eyebrow">Sua turma</p>
            <b>{sync.group.name}</b>
          </div>
          <button className="turma-edit" onClick={() => setEditing(true)}>
            editar
          </button>
        </div>

        {/* participa de mais de uma? troca aqui qual está ativa */}
        {groups.length > 1 && (
          <div className="turma-switch">
            {groups.map((g) => (
              <button
                key={g.id}
                className={`pf ${g.id === sync.group!.id ? "pf-on" : ""}`}
                onClick={() => sync.setActiveGroup(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        <p className="turma-code">
          código de convite: <b className="conn-code">{sync.group.invite_code}</b>
        </p>

        <div className="turma-actions">
          <button className="ch-code-link" onClick={() => setOutra(true)}>
            Entrar em outra turma
          </button>
          <button className="conn-out" onClick={() => sync.signOut()}>
            sair da conta
          </button>
        </div>
      </section>

      {editing && <TurmaEditSheet onClose={() => setEditing(false)} />}
      {outra && <GroupSheet onClose={() => setOutra(false)} />}
    </>
  );
}

function TurmaEditSheet({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const [name, setName] = useState(sync.group?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const err = await sync.renameGroup(name);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Sheet title="Editar turma" onClose={onClose}>
      <p className="conn-note">Qualquer membro pode ajeitar o nome da turma.</p>
      <label className="field-l">
        <span className="field-l-label">Nome da turma</span>
        <span className="field-l-box">
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </span>
      </label>
      {error && <p className="conn-error">{error}</p>}
      <BigButton onClick={save} tone="pulse" disabled={busy || name.trim().length < 2}>
        {busy ? "Salvando…" : "Salvar"}
      </BigButton>
    </Sheet>
  );
}
