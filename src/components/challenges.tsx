import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useSync, type CheckinInfo } from "../lib/sync";
import type { Challenge, Member } from "../lib/types";
import { currentChallenge, readChallenge } from "../lib/logic";
import { WEEKDAY_SHORT, addDays, diffDays, formatShort, fromISO, toISO, todayISO } from "../lib/dates";
import { ConnectionCard } from "./account";
import { Avatar, BigButton, Chip, Sheet } from "./ui";
import { IconCheck, IconMedal, IconPlus } from "./icons";
import "./challenges.css";

/* ————————————————————————————————————————————————
   Desafios com check-in por FOTO (grupo real):
   vários desafios ao mesmo tempo, foto do dia valendo pros desafios que
   você escolher, e o feed de fotos de cada dia.
   No modo demo (deslogado), fica a versão por presença — foto pede conta.
   ———————————————————————————————————————————————— */

export function DesafiosSection({ members }: { members: Member[] }) {
  const sync = useSync();
  const real = !!sync.session && !!sync.group;
  if (real) return <RealDesafios members={members} />;
  // sem turma o desafio não existe de verdade: mostra a porta de entrada
  // (conta/grupo) e deixa a demo abaixo, rotulada como demonstração
  return (
    <>
      <ConnectionCard where="desafios" />
      <DemoDesafio members={members} />
    </>
  );
}

/* ————— desafios reais (foto) ————— */

interface PhotoStanding {
  member: Member;
  checkins: number;
  rank: number;
}

function photoStandings(
  ch: Challenge,
  members: Member[],
  checkins: CheckinInfo[]
): PhotoStanding[] {
  const today = todayISO();
  const cursor = today > ch.endsOn ? ch.endsOn : today;
  const byUser = new Map<string, Set<string>>();
  for (const c of checkins) {
    if (!c.challengeIds.includes(ch.id)) continue;
    if (c.date < ch.startsOn || c.date > cursor) continue;
    const set = byUser.get(c.userId) ?? new Set<string>();
    set.add(c.date);
    byUser.set(c.userId, set);
  }
  const rows = members.map((m) => ({ member: m, checkins: byUser.get(m.id)?.size ?? 0 }));
  rows.sort((a, b) => b.checkins - a.checkins || a.member.name.localeCompare(b.member.name));
  let last = 1;
  return rows.map((r, i) => {
    if (i > 0 && rows[i - 1].checkins !== r.checkins) last = i + 1;
    return { ...r, rank: last };
  });
}

function RealDesafios({ members }: { members: Member[] }) {
  const sync = useSync();
  const uid = sync.session!.user.id;
  const today = todayISO();

  // pro ranking/feed, "eu" preciso aparecer com o id REAL da conta (os
  // check-ins são por auth uid, não pelo id local "m-me")
  const realMembers = useMemo(
    () =>
      members.map((m) =>
        m.isMe ? { ...m, id: uid, avatarUrl: sync.myAvatarUrl ?? undefined } : m
      ),
    [members, uid, sync.myAvatarUrl]
  );

  const challenges = sync.challenges ?? [];
  const participants = sync.participants ?? {};
  const active = challenges.filter((c) => c.startsOn <= today && today <= c.endsOn);
  const [selId, setSelId] = useState<string | null>(null);
  const sel = challenges.find((c) => c.id === selId) ?? active[0] ?? challenges[0] ?? null;

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkins = sync.checkins ?? [];

  // desafios ativos em que EU ainda não fiz check-in hoje
  const checkedTodayIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of checkins) {
      if (c.userId !== uid || c.date !== today) continue;
      c.challengeIds.forEach((id) => set.add(id));
    }
    return set;
  }, [checkins, uid, today]);

  // o check-in só vale pros desafios ativos em que EU entrei
  const myActive = useMemo(
    () => active.filter((c) => (participants[c.id] ?? []).includes(uid)),
    [active, participants, uid]
  );

  if (!challenges.length) {
    return (
      <>
        <section className="card ch-empty rise">
          <p className="eyebrow">Desafios da turma</p>
          <h2>Nenhum desafio rolando</h2>
          <p>
            Prazo + turma + check-in com foto — o empurrão que funciona. Crie o
            primeiro e chame a galera pra entrar.
          </p>
          <BigButton onClick={() => setCreating(true)} tone="pulse">
            <IconPlus size={18} />
            Criar desafio
          </BigButton>
          <button className="ch-code-link" onClick={() => setJoining(true)}>
            Tenho um código de desafio
          </button>
        </section>
        {creating && (
          <DesafioSheet onClose={() => setCreating(false)} onCreate={sync.createChallenge} />
        )}
        {joining && <JoinByCodeSheet onClose={() => setJoining(false)} />}
      </>
    );
  }

  return (
    <div className="desafios">
      {/* diz de quem é o desafio e a regra do opt-in — era a dúvida principal */}
      <p className="ch-scope rise">
        Desafios da turma <b>{sync.group!.name}</b> — cada um escolhe se entra.
      </p>

      {/* trilha de desafios: transite entre eles num toque */}
      <div className="ch-tabs rise">
        {challenges.map((c) => {
          const isActive = c.startsOn <= today && today <= c.endsOn;
          return (
            <button
              key={c.id}
              className={`ch-tab ${sel?.id === c.id ? "ch-tab-on" : ""} ${isActive ? "" : "ch-tab-past"}`}
              onClick={() => setSelId(c.id)}
            >
              {isActive && <span className="ch-live" />}
              {c.name}
            </button>
          );
        })}
        <button className="ch-tab ch-tab-new" onClick={() => setCreating(true)} aria-label="Novo desafio">
          <IconPlus size={15} stroke={2.4} />
        </button>
      </div>

      {sel && (
        <SelectedChallenge
          challenge={sel}
          members={realMembers}
          checkins={checkins}
          participantIds={participants[sel.id] ?? []}
          meId={uid}
          myCheckedToday={checkedTodayIds.has(sel.id)}
          onCheckin={() => setChecking(true)}
          onJoin={() => sync.joinChallenge(sel.id)}
          onLeave={() => sync.leaveChallenge(sel.id)}
        />
      )}

      {/* criar desafio é ação de primeira classe — não só o "+" da trilha */}
      <BigButton onClick={() => setCreating(true)} tone="ghost">
        <IconPlus size={18} />
        Criar outro desafio
      </BigButton>
      <button className="ch-code-link" onClick={() => setJoining(true)}>
        Tenho um código de desafio
      </button>

      {creating && (
        <DesafioSheet onClose={() => setCreating(false)} onCreate={sync.createChallenge} />
      )}
      {joining && <JoinByCodeSheet onClose={() => setJoining(false)} />}
      {checking && (
        <CheckinSheet
          activeChallenges={myActive}
          checkedTodayIds={checkedTodayIds}
          preferredId={sel?.id ?? null}
          onClose={() => setChecking(false)}
        />
      )}
    </div>
  );
}

function SelectedChallenge({
  challenge,
  members,
  checkins,
  participantIds,
  meId,
  myCheckedToday,
  onCheckin,
  onJoin,
  onLeave,
}: {
  challenge: Challenge;
  members: Member[];
  checkins: CheckinInfo[];
  /** quem entrou neste desafio — participar é opt-in */
  participantIds: string[];
  meId: string;
  myCheckedToday: boolean;
  onCheckin: () => void;
  onJoin: () => Promise<string | null>;
  onLeave: () => Promise<string | null>;
}) {
  const today = todayISO();
  const ended = today > challenge.endsOn;
  const cursor = ended ? challenge.endsOn : today;
  const totalDays = diffDays(challenge.endsOn, challenge.startsOn) + 1;
  const dayNumber = Math.min(totalDays, Math.max(1, diffDays(cursor, challenge.startsOn) + 1));

  const sync = useSync();
  const iAmIn = participantIds.includes(meId);
  const iCreated = challenge.createdBy === meId;
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggleJoin = async () => {
    setBusy(true);
    await (iAmIn ? onLeave() : onJoin());
    setBusy(false);
  };

  // o ranking é só de quem entrou — quem não entrou não aparece
  const roster = useMemo(
    () => members.filter((m) => participantIds.includes(m.id)),
    [members, participantIds]
  );
  const standings = useMemo(
    () => photoStandings(challenge, roster, checkins),
    [challenge, roster, checkins]
  );
  const leader = standings[0]?.checkins ?? 0;
  const champions = ended && leader > 0 ? standings.filter((s) => s.checkins === leader) : [];

  // dias do desafio até o cursor, mais recentes primeiro (máx. 14 na régua)
  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = cursor; d >= challenge.startsOn && out.length < 14; d = toISO(addDays(fromISO(d), -1))) {
      out.push(d);
    }
    return out;
  }, [cursor, challenge.startsOn]);
  const [selDay, setSelDay] = useState(cursor);
  useEffect(() => setSelDay(cursor), [challenge.id, cursor]);

  const dayCheckins = useMemo(
    () =>
      checkins
        .filter((c) => c.challengeIds.includes(challenge.id) && c.date === selDay)
        .map((c) => ({ ...c, member: members.find((m) => m.id === c.userId) })),
    [checkins, challenge.id, selDay, members]
  );

  const dayLabel = (iso: string) =>
    iso === today ? "hoje" : `${WEEKDAY_SHORT[(fromISO(iso).getDay() + 6) % 7]} ${fromISO(iso).getDate()}`;

  return (
    <section className="card desafio-card rise">
      <header className="desafio-head">
        <div>
          <p className="eyebrow">
            {ended ? "Desafio encerrado" : `Desafio · dia ${dayNumber} de ${totalDays}`}
          </p>
          <h2>{challenge.name}</h2>
        </div>
        <div className="ch-head-actions">
          {champions.length > 0 && (
            <Chip tone="ambar">
              <IconMedal size={13} />
              {champions.map((c) => c.member.name).join(" e ")}
            </Chip>
          )}
          {/* só quem criou edita — a RLS confirma do lado do banco */}
          {iCreated && (
            <button className="ch-edit" onClick={() => setEditing(true)}>
              editar
            </button>
          )}
        </div>
      </header>

      {!ended && (
        <div className="desafio-bar" aria-hidden>
          <span style={{ width: `${(dayNumber / totalDays) * 100}%` }} />
        </div>
      )}

      <p className="ch-part">
        {participantIds.length === 0
          ? "Ninguém entrou ainda — seja o primeiro."
          : `${participantIds.length} ${
              participantIds.length === 1 ? "pessoa entrou" : "pessoas entraram"
            }${iAmIn ? " · você está dentro" : ""}`}
      </p>

      {!ended && !iAmIn && (
        <div className="ch-join">
          <p>
            Você não está neste desafio. Entre pra aparecer no ranking e poder fazer
            check-in.
          </p>
          <BigButton onClick={toggleJoin} tone="pulse" disabled={busy}>
            {busy ? "Entrando…" : "Entrar no desafio"}
          </BigButton>
        </div>
      )}

      {!ended && iAmIn && (
        <>
          <BigButton onClick={onCheckin} tone={myCheckedToday ? "ink" : "pulse"}>
            {myCheckedToday ? (
              <>
                <IconCheck size={18} stroke={2.8} /> Check-in de hoje feito
              </>
            ) : (
              <>📸 Fazer check-in de hoje</>
            )}
          </BigButton>
          <button className="ch-add-people" onClick={() => setAdding(true)}>
            <IconPlus size={16} stroke={2.4} />
            Adicionar pessoas
          </button>
          <button className="ch-leave" onClick={toggleJoin} disabled={busy}>
            {busy ? "Saindo…" : "Sair do desafio"}
          </button>
        </>
      )}

      {standings.length === 0 && (
        <p className="ch-feed-empty">Ninguém entrou neste desafio ainda.</p>
      )}

      <ol className="desafio-rank">
        {standings.map((s) => (
          <li key={s.member.id} className={s.member.isMe ? "dr-me" : ""}>
            <span className="dr-pos serif-num">{s.rank}</span>
            <Avatar
              initials={s.member.initials}
              color={s.member.color}
              photoUrl={s.member.avatarUrl}
              size={32}
            />
            <span className="dr-name">
              {s.member.name}
              {s.member.isMe && <small> (você)</small>}
            </span>
            <span className="dr-bar">
              <em
                style={{
                  width: `${leader ? (s.checkins / leader) * 100 : 0}%`,
                  background: s.member.color,
                }}
              />
            </span>
            <b className="dr-count serif-num">{s.checkins}</b>
          </li>
        ))}
      </ol>

      {/* feed do dia: as fotos de quem fez check-in */}
      <div className="ch-days">
        {days.map((d) => (
          <button
            key={d}
            className={`pf ${selDay === d ? "pf-on" : ""}`}
            onClick={() => setSelDay(d)}
          >
            {dayLabel(d)}
          </button>
        ))}
      </div>

      {dayCheckins.length === 0 ? (
        <p className="ch-feed-empty">
          {selDay === today
            ? "Ninguém fez check-in hoje ainda. A primeira foto puxa as outras."
            : `Sem check-ins em ${formatShort(selDay)}.`}
        </p>
      ) : (
        <div className="ch-feed">
          {dayCheckins.map((c) => (
            <figure key={c.id} className="ch-photo">
              <img src={c.photoUrl} alt={`Check-in de ${c.member?.name ?? "alguém"}`} loading="lazy" />
              <figcaption>
                <Avatar
                  initials={c.member?.initials ?? "?"}
                  color={c.member?.color ?? "#8a7d69"}
                  photoUrl={c.member?.avatarUrl}
                  size={22}
                />
                <span>{c.member?.isMe ? "você" : (c.member?.name ?? "alguém")}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <p className="desafio-foot">
        {ended
          ? "Quem apareceu, ganhou — e todo mundo que apareceu também."
          : "1 check-in por dia, com foto. A mesma foto pode valer pra mais de um desafio — você escolhe."}
      </p>

      {editing && (
        <EditChallengeSheet challenge={challenge} onClose={() => setEditing(false)} />
      )}
      {adding && (
        <AddPeopleSheet
          challenge={challenge}
          members={members}
          participantIds={participantIds}
          onAdd={(userId) => sync.addParticipant(challenge.id, userId)}
          onClose={() => setAdding(false)}
        />
      )}
    </section>
  );
}

/* ————— editar desafio (só quem criou passa na RLS) ————— */

function EditChallengeSheet({
  challenge,
  onClose,
}: {
  challenge: Challenge;
  onClose: () => void;
}) {
  const sync = useSync();
  const [name, setName] = useState(challenge.name);
  const [endsOn, setEndsOn] = useState(challenge.endsOn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const err = await sync.updateChallenge(challenge.id, { name, endsOn });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Sheet title="Editar desafio" onClose={onClose}>
      <label className="field-l">
        <span className="field-l-label">Nome</span>
        <span className="field-l-box">
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </span>
      </label>
      <label className="field-l">
        <span className="field-l-label">Termina em</span>
        <span className="field-l-box">
          <input
            type="date"
            value={endsOn}
            min={challenge.startsOn}
            onChange={(e) => setEndsOn(e.target.value)}
          />
        </span>
      </label>
      {error && <p className="conn-error">{error}</p>}
      <BigButton onClick={save} tone="pulse" disabled={busy || name.trim().length < 2}>
        {busy ? "Salvando…" : "Salvar"}
      </BigButton>
    </Sheet>
  );
}

/* ————— adicionar pessoas: código, turma ou amigo ————— */

function AddPeopleSheet({
  challenge,
  members,
  participantIds,
  onAdd,
  onClose,
}: {
  challenge: Challenge;
  members: Member[];
  participantIds: string[];
  onAdd: (userId: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const sync = useSync();
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const foraDaTurma = members.filter((m) => !m.isMe && !participantIds.includes(m.id));
  const amigosFora = (sync.friendList ?? []).filter(
    (f) =>
      f.status === "accepted" &&
      !participantIds.includes(f.id) &&
      !members.some((m) => m.id === f.id)
  );

  const add = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    const err = await onAdd(userId);
    setBusyId(null);
    if (err) setError(err);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(challenge.inviteCode ?? "");
      setCopied(true);
    } catch {
      /* sem clipboard: o código está na tela pra copiar na mão */
    }
  };

  return (
    <Sheet title="Adicionar pessoas" onClose={onClose}>
      <p className="conn-note">
        Três jeitos: mandar o código, chamar alguém da turma ou um amigo.
      </p>

      <div className="ap-code">
        <div>
          <span className="field-l-label">Código do desafio</span>
          <b className="conn-code">{challenge.inviteCode ?? "—"}</b>
        </div>
        <button className="acc-copy" onClick={copy}>
          {copied ? "copiado" : "copiar"}
        </button>
      </div>

      {error && <p className="conn-error">{error}</p>}

      <p className="eyebrow">Da sua turma</p>
      {foraDaTurma.length === 0 ? (
        <p className="ch-feed-empty">Todo mundo da turma já está no desafio.</p>
      ) : (
        <ul className="ap-list">
          {foraDaTurma.map((m) => (
            <li key={m.id}>
              <Avatar initials={m.initials} color={m.color} photoUrl={m.avatarUrl} size={32} />
              <span>{m.name}</span>
              <button className="ap-add" onClick={() => add(m.id)} disabled={busyId === m.id}>
                {busyId === m.id ? "…" : "adicionar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="eyebrow">Amigos</p>
      {amigosFora.length === 0 ? (
        <p className="ch-feed-empty">Nenhum amigo de fora da turma pra adicionar.</p>
      ) : (
        <ul className="ap-list">
          {amigosFora.map((f) => (
            <li key={f.id}>
              <Avatar
                initials={f.initials}
                color={f.color}
                photoUrl={f.avatarUrl ?? undefined}
                size={32}
              />
              <span>{f.name}</span>
              <button className="ap-add" onClick={() => add(f.id)} disabled={busyId === f.id}>
                {busyId === f.id ? "…" : "adicionar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/* ————— entrar num desafio pelo código ————— */

function JoinByCodeSheet({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    const err = await sync.joinChallengeByCode(code);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Sheet title="Entrar com código" onClose={onClose}>
      <p className="conn-note">
        Cole o código que te mandaram — funciona até pra desafio de outra turma.
      </p>
      <label className="field-l">
        <span className="field-l-label">Código do desafio</span>
        <span className="field-l-box">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="A1B2C3D4"
            autoFocus
          />
        </span>
      </label>
      {error && <p className="conn-error">{error}</p>}
      <BigButton onClick={go} tone="pulse" disabled={busy || code.trim().length < 4}>
        {busy ? "Entrando…" : "Entrar no desafio"}
      </BigButton>
    </Sheet>
  );
}

/* ————— check-in com foto ————— */

function CheckinSheet({
  activeChallenges,
  checkedTodayIds,
  preferredId,
  onClose,
}: {
  activeChallenges: Challenge[];
  checkedTodayIds: Set<string>;
  /** desafio aberto na tela — entra selecionado se ainda não foi hoje */
  preferredId: string | null;
  onClose: () => void;
}) {
  const sync = useSync();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => {
    // pré-seleciona os desafios ativos que ainda não têm check-in hoje
    const pend = activeChallenges.filter((c) => !checkedTodayIds.has(c.id)).map((c) => c.id);
    if (pend.length) return new Set(pend);
    return new Set(preferredId ? [preferredId] : []);
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!file || selected.size === 0) return;
    setBusy(true);
    setError(null);
    const err = await sync.checkIn(file, [...selected]);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Sheet title="Check-in de hoje" onClose={onClose}>
      <p className="conn-note">A prova é a foto — do treino, do espelho, do tênis na academia.</p>

      {preview ? (
        <button className="ci-preview" onClick={() => galRef.current?.click()} aria-label="Trocar foto">
          <img src={preview} alt="Foto do check-in" />
          <span>trocar</span>
        </button>
      ) : (
        <div className="ci-pick">
          <button className="ci-pick-btn" onClick={() => camRef.current?.click()}>
            📷 Tirar foto
          </button>
          <button className="ci-pick-btn" onClick={() => galRef.current?.click()}>
            🖼️ Escolher da galeria
          </button>
        </div>
      )}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <p className="eyebrow ci-label">Essa foto vale pra:</p>
      <div className="ci-challenges">
        {activeChallenges.map((c) => {
          const done = checkedTodayIds.has(c.id);
          const on = selected.has(c.id);
          return (
            <button
              key={c.id}
              className={`ci-ch ${on ? "ci-ch-on" : ""}`}
              onClick={() => toggle(c.id)}
            >
              <span className={`ci-box ${on ? "ci-box-on" : ""}`}>
                {on && <IconCheck size={13} stroke={3.2} />}
              </span>
              <span className="ci-ch-name">
                {c.name}
                {done && <small> · já tem check-in hoje</small>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="ci-hint">
        Quer uma foto diferente pra outro desafio? Faz este check-in só com um deles e
        depois faz outro com a nova foto.
      </p>

      {error && <p className="conn-error">{error}</p>}
      <BigButton onClick={submit} tone="pulse" disabled={busy || !file || selected.size === 0}>
        {busy ? "Enviando…" : "Confirmar check-in"}
      </BigButton>
    </Sheet>
  );
}

/* ————— criação de desafio (compartilhado demo/real) ————— */

export function DesafioSheet({
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
    <Sheet title="Novo desafio" onClose={onClose}>
          <p className="conn-note">
            Prazo fechado, grupo fechado, um check-in por dia — com foto. Simples assim.
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
    </Sheet>
  );
}

/* ————— demo (deslogado): desafio por presença, como antes ————— */

function DemoDesafio({ members }: { members: Member[] }) {
  const { state, dispatch } = useStore();
  const [creating, setCreating] = useState(false);
  const challenge = currentChallenge(state.challenges);

  const view = useMemo(
    () => (challenge ? readChallenge(challenge, members) : null),
    [challenge, members]
  );
  const leaderCount = view?.standings[0]?.checkins ?? 0;

  const createLocal = async (name: string, days: number) => {
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
  };

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
            Na demo o check-in é a presença. Com conta, o check-in é por <b>foto</b> — e
            dá pra ter vários desafios ao mesmo tempo.
          </p>

        </section>
      ) : (
        <section className="card ch-empty rise">
          <p className="eyebrow">Desafio de demonstração</p>
          <h2>Nenhum desafio rolando</h2>
          <p>Prazo + turma + check-in — o empurrão que funciona.</p>
        </section>
      )}

      {/* sempre disponível: antes o criar só aparecia com o desafio encerrado,
          o que deixava a demo num beco sem saída */}
      <BigButton onClick={() => setCreating(true)} tone="ghost">
        <IconPlus size={18} />
        Criar desafio de exemplo
      </BigButton>

      {creating && <DesafioSheet onClose={() => setCreating(false)} onCreate={createLocal} />}
    </>
  );
}
