import { useEffect, useState } from "react";
import { useSync, type FriendDetail, type FriendInfo } from "../lib/sync";
import { SHARE_KEYS } from "../lib/share";
import { currentWeekISO, todayISO, toISO, addDays } from "../lib/dates";
import { fmtDec1, fmtInt } from "../lib/format";
import { Avatar, BigButton, Chip, Sheet, WeekStrip } from "./ui";
import { IconCheck, IconChevronRight, IconUp, IconX } from "./icons";
import { LoginSheet } from "./account";
import "./friends.css";

const GOAL_LABEL: Record<string, string> = {
  bulk: "Bulking",
  cut: "Cutting",
  maint: "Manutenção",
};

/* ————————————————————————————————————————————————
   Amigos: rede própria, independente do grupo. Você adiciona pelo código,
   o outro aceita, e cada um escolhe o que o outro pode ver.
   ———————————————————————————————————————————————— */

export function AmigosSection() {
  const sync = useSync();
  const [login, setLogin] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewing, setViewing] = useState<FriendInfo | null>(null);

  if (!sync.session) {
    return (
      <>
        <button className="card conn-card rise" onClick={() => setLogin(true)}>
          <span className="conn-dot" />
          <div>
            <b>Amigos pedem conta</b>
            <small>adicione amigos de qualquer academia e acompanhe o progresso deles</small>
          </div>
        </button>
        {login && <LoginSheet onClose={() => setLogin(false)} />}
      </>
    );
  }

  const list = sync.friendList;
  const accepted = (list ?? []).filter((f) => f.status === "accepted");
  const received = (list ?? []).filter((f) => f.status === "pending" && !f.requestedByMe);
  const sent = (list ?? []).filter((f) => f.status === "pending" && f.requestedByMe);

  const add = async () => {
    setBusy(true);
    setMsg(null);
    const err = await sync.addFriend(code.trim());
    setBusy(false);
    if (err) setMsg({ ok: false, text: err });
    else {
      setMsg({ ok: true, text: "Pedido enviado — agora é com o outro lado." });
      setCode("");
    }
  };

  const copyMine = async () => {
    if (!sync.myFriendCode) return;
    try {
      await navigator.clipboard.writeText(sync.myFriendCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* código visível de qualquer forma */
    }
  };

  return (
    <div className="amigos">
      <section className="card fr-add rise">
        <p className="eyebrow">Adicionar amigo</p>
        {sync.myFriendCode && (
          <div className="fr-mycode">
            <span>
              seu código: <b className="conn-code">{sync.myFriendCode}</b>
            </span>
            <button className="acc-copy" onClick={copyMine}>
              {copied ? (
                <>
                  <IconCheck size={13} stroke={3} /> copiado
                </>
              ) : (
                "copiar"
              )}
            </button>
          </div>
        )}
        <div className="fr-add-row">
          <input
            className="food-search conn-code-input"
            placeholder="código do amigo"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button
            className="fr-add-btn"
            onClick={add}
            disabled={busy || code.trim().length < 4}
          >
            {busy ? "…" : "Adicionar"}
          </button>
        </div>
        {msg && <p className={msg.ok ? "fr-ok" : "conn-error"}>{msg.text}</p>}
      </section>

      {received.length > 0 && (
        <section className="rise">
          <p className="eyebrow amigos-label">Pedidos recebidos</p>
          {received.map((f) => (
            <div key={f.id} className="card fr-row">
              <Avatar initials={f.initials} color={f.color} photoUrl={f.avatarUrl} size={40} />
              <b className="fr-name">{f.name}</b>
              <div className="fr-req-actions">
                <button
                  className="fr-accept"
                  onClick={() => sync.respondFriend(f.id, true)}
                  aria-label={`Aceitar ${f.name}`}
                >
                  <IconCheck size={16} stroke={2.8} />
                </button>
                <button
                  className="fr-decline"
                  onClick={() => sync.respondFriend(f.id, false)}
                  aria-label={`Recusar ${f.name}`}
                >
                  <IconX size={16} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rise">
        <p className="eyebrow amigos-label">
          {accepted.length
            ? `Seus amigos · ${accepted.length}`
            : "Seus amigos"}
        </p>
        {list === null && <p className="fr-empty">Carregando…</p>}
        {list !== null && accepted.length === 0 && (
          <p className="fr-empty">
            Ninguém ainda. Troca de código com os amigos — de qualquer academia — e
            acompanhem o progresso um do outro.
          </p>
        )}
        {accepted.map((f) => (
          <button key={f.id} className="card fr-row fr-row-btn" onClick={() => setViewing(f)}>
            <Avatar initials={f.initials} color={f.color} photoUrl={f.avatarUrl} size={40} />
            <b className="fr-name">{f.name}</b>
            <span className="fr-see">ver progresso</span>
            <IconChevronRight size={17} />
          </button>
        ))}
      </section>

      {sent.length > 0 && (
        <section className="rise">
          <p className="eyebrow amigos-label">Aguardando aceite</p>
          {sent.map((f) => (
            <div key={f.id} className="card fr-row fr-row-dim">
              <Avatar initials={f.initials} color={f.color} photoUrl={f.avatarUrl} size={40} />
              <b className="fr-name">{f.name}</b>
              <span className="fr-wait">pendente</span>
            </div>
          ))}
        </section>
      )}

      {viewing && <FriendSheet friend={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/* ————— o perfil do amigo: o que ele liberou + o que ele vê de você ————— */

function FriendSheet({ friend, onClose }: { friend: FriendInfo; onClose: () => void }) {
  const sync = useSync();
  const [detail, setDetail] = useState<FriendDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<Record<string, boolean>>(friend.myShare);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let alive = true;
    sync.friendView(friend.id).then((r) => {
      if (!alive) return;
      if (typeof r === "string") setError(r);
      else setDetail(r);
    });
    return () => {
      alive = false;
    };
  }, [friend.id, sync]);

  const toggleShare = (key: string) => {
    const next = { ...share, [key]: !share[key] };
    setShare(next);
    sync.setFriendShare(friend.id, next);
  };

  const removeIt = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      window.setTimeout(() => setConfirmRemove(false), 3000);
      return;
    }
    await sync.removeFriend(friend.id);
    onClose();
  };

  const week = currentWeekISO();
  const last28 = toISO(addDays(new Date(), -27));
  const p = detail?.presence;
  const trained28 = p ? p.dates.filter((d) => d >= last28 && d <= todayISO()).length : 0;

  const lockedKeys = detail
    ? SHARE_KEYS.filter((k) => !detail.allowed?.[k.key]).map((k) => k.label)
    : [];

  return (
    <Sheet title={friend.name} onClose={onClose} className="picker">
      <div className="fs-head">
        <Avatar initials={friend.initials} color={friend.color} photoUrl={friend.avatarUrl} size={52} />
        <p className="fs-sub">
          {detail?.updatedAt
            ? "progresso compartilhado com você"
            : "carregando o que ele compartilha…"}
        </p>
      </div>

      {error && <p className="conn-error">{error}</p>}

      {detail && (
        <div className="fs-blocks">
          {detail.presence && (
            <section className="fs-block">
              <p className="eyebrow">Presença</p>
              <WeekStrip presence={week.map((d) => detail.presence!.dates.includes(d))} size={30} />
              <p className="fs-line">
                <b>{trained28}</b> {trained28 === 1 ? "treino" : "treinos"} nas últimas 4 semanas
              </p>
            </section>
          )}

          {detail.treino && (
            <section className="fs-block">
              <p className="eyebrow">Progressão de carga</p>
              {detail.treino.volumePct !== null && (
                <Chip tone={detail.treino.volumePct >= 0 ? "mata" : "neutral"}>
                  <IconUp size={12} /> carga {detail.treino.volumePct >= 0 ? "+" : ""}
                  {detail.treino.volumePct}%
                </Chip>
              )}
              {detail.treino.prs.length > 0 ? (
                <ul className="fs-prs">
                  {detail.treino.prs.map((pr) => (
                    <li key={pr.name}>
                      <span>{pr.name}</span>
                      <b className="serif-num">{pr.load}kg</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fs-line">Sem recordes registrados ainda.</p>
              )}
            </section>
          )}

          {detail.metas && (
            <section className="fs-block">
              <p className="eyebrow">Metas</p>
              <p className="fs-line">
                <b>{GOAL_LABEL[detail.metas.goal] ?? detail.metas.goal}</b>
                {" · "}
                {fmtInt(detail.metas.targets.prot)}g de proteína
                {!detail.metas.hideNumbers && ` · ${fmtInt(detail.metas.targets.kcal)} kcal`}
              </p>
            </section>
          )}

          {detail.dieta && (
            <section className="fs-block">
              <p className="eyebrow">Dieta · médias</p>
              <p className="fs-line">
                {fmtInt(detail.dieta.protAvg7)}g prot (7d) · {fmtInt(detail.dieta.protAvg28)}g prot
                (4 sem)
                {!detail.metas?.hideNumbers &&
                  detail.dieta.kcalAvg28 > 0 &&
                  ` · ${fmtInt(detail.dieta.kcalAvg28)} kcal`}
              </p>
            </section>
          )}

          {detail.peso && (
            <section className="fs-block">
              <p className="eyebrow">Peso</p>
              <p className="fs-line">
                {detail.peso.current !== null ? <b>{fmtDec1(detail.peso.current)}kg</b> : "—"}
                {detail.peso.delta4w !== null && (
                  <>
                    {" · "}
                    {detail.peso.delta4w >= 0 ? "+" : "−"}
                    {fmtDec1(Math.abs(detail.peso.delta4w))}kg em 4 semanas
                  </>
                )}
              </p>
            </section>
          )}

          {lockedKeys.length > 0 && (
            <p className="fs-locked">
              {friend.name} não compartilha com você: {lockedKeys.join(", ").toLowerCase()}.
            </p>
          )}
        </div>
      )}

      <section className="fs-share">
        <p className="eyebrow">O que {friend.name} vê de você</p>
        {SHARE_KEYS.map((k) => {
          const on = !!share[k.key];
          return (
            <button key={k.key} className="fs-share-row" onClick={() => toggleShare(k.key)}>
              <span className={`ci-box ${on ? "ci-box-on" : ""}`}>
                {on && <IconCheck size={13} stroke={3.2} />}
              </span>
              <span className="fs-share-info">
                <b>{k.label}</b>
                <small>{k.desc}</small>
              </span>
            </button>
          );
        })}
      </section>

      <BigButton onClick={removeIt} tone="ghost">
        {confirmRemove ? "Tocar de novo pra desfazer" : "Desfazer amizade"}
      </BigButton>
    </Sheet>
  );
}
