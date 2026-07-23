import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { useNotifications } from "../lib/notifications";
import { getNotify } from "../lib/notify";
import { WEEKDAY_SHORT } from "../lib/dates";
import { Avatar, BigButton } from "../components/ui";
import { GroupSheet } from "../components/account";
import { IconBack, IconCheck } from "../components/icons";
import type { NotifyPrefs } from "../lib/types";
import "./ajustes.css";

export function Ajustes() {
  const { state, dispatch } = useStore();
  const sync = useSync();
  const notif = useNotifications();
  const navigate = useNavigate();
  const me = state.members.find((m) => m.isMe);
  const prefs = getNotify(state);

  const [name, setName] = useState(state.userName);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [groupSheet, setGroupSheet] = useState(false);
  const [copied, setCopied] = useState<"amigo" | "grupo" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // deslogado não tem ajustes de conta — volta pra Hoje (ex.: deep link / logout)
  useEffect(() => {
    if (!sync.session) navigate("/", { replace: true });
  }, [sync.session, navigate]);
  if (!sync.session) return null;

  const saveName = () => {
    const clean = name.trim();
    if (clean.length >= 2 && clean !== state.userName) sync.updateName(clean);
  };

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true);
    setAvatarErr(null);
    const err = await sync.uploadAvatar(file);
    setAvatarBusy(false);
    if (err) setAvatarErr(err);
  };

  const setNotify = (patch: Partial<NotifyPrefs>) => dispatch({ type: "SET_NOTIFY", patch });

  const toggleMaster = async () => {
    if (prefs.enabled) {
      setNotify({ enabled: false });
      return;
    }
    const ok = await notif.enable();
    // liga mesmo sem permissão do SO: o inbox interno funciona de qualquer forma
    setNotify({ enabled: true });
    if (!ok) setAvatarErr(null); // (permissão negada só limita o popup do sistema)
  };

  const setTime = (day: number, value: string) => {
    const times = [...prefs.trainTimes];
    times[day] = value;
    setNotify({ trainTimes: times });
  };

  const copy = async (text: string, which: "amigo" | "grupo") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* visível de qualquer forma */
    }
  };

  const logout = async () => {
    if (!confirmOut) {
      setConfirmOut(true);
      window.setTimeout(() => setConfirmOut(false), 3000);
      return;
    }
    await sync.signOut();
    navigate("/", { replace: true });
  };

  const NOTIF_TYPES: { key: keyof NotifyPrefs; label: string; desc: string }[] = [
    { key: "train", label: "Lembrete de treino", desc: "no horário que você definir, se ainda não treinou" },
    { key: "checkins", label: "Check-ins", desc: "quando alguém do grupo ou um amigo faz check-in" },
    { key: "macros", label: "Limite de macros", desc: "quando chega perto da meta de kcal, carbo ou gordura" },
    { key: "streak", label: "Semana completa", desc: "comemoração ao seguir o cronograma 7 dias" },
    { key: "challenge", label: "Desafios", desc: "quando te passam ou o prazo está acabando" },
  ];

  return (
    <main className="screen ajustes">
      <header className="editor-head">
        <button className="editor-back" onClick={() => navigate(-1)} aria-label="Voltar">
          <IconBack />
        </button>
        <div>
          <p className="eyebrow">Sua conta</p>
          <h1 className="ajustes-title">Ajustes</h1>
        </div>
      </header>

      {/* ——— perfil ——— */}
      <section className="card aj-card">
        <p className="eyebrow">Perfil</p>
        <div className="aj-profile">
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
              size={64}
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
          <div className="aj-profile-fields">
            <input
              className="aj-name"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              aria-label="Seu nome"
            />
            <small>{sync.session.user.email}</small>
          </div>
        </div>
        {avatarErr && <p className="conn-error">{avatarErr}</p>}
      </section>

      {/* ——— notificações ——— */}
      <section className="card aj-card">
        <div className="aj-master">
          <div>
            <p className="eyebrow">Notificações</p>
            <small className="aj-master-sub">
              {notif.permission === "denied"
                ? "O navegador bloqueou os avisos do sistema — os avisos aparecem só aqui dentro."
                : "Avisos do sistema + a caixinha do sino no topo."}
            </small>
          </div>
          <Toggle on={prefs.enabled} onClick={toggleMaster} label="Ativar notificações" />
        </div>

        {prefs.enabled && (
          <>
            <div className="aj-types">
              {NOTIF_TYPES.map((t) => (
                <div key={t.key} className="aj-type">
                  <div className="aj-type-info">
                    <b>{t.label}</b>
                    <small>{t.desc}</small>
                  </div>
                  <Toggle
                    on={!!prefs[t.key]}
                    onClick={() => setNotify({ [t.key]: !prefs[t.key] } as Partial<NotifyPrefs>)}
                    label={t.label}
                  />
                </div>
              ))}
            </div>

            {prefs.train && (
              <div className="aj-times">
                <p className="eyebrow aj-times-label">Horário que você costuma treinar</p>
                <div className="aj-days">
                  {WEEKDAY_SHORT.map((label, i) => {
                    const on = !!prefs.trainTimes[i];
                    return (
                      <div key={i} className={`aj-day ${on ? "" : "aj-day-off"}`}>
                        <span className="aj-dow">{label}</span>
                        {on ? (
                          <input
                            type="time"
                            className="aj-time"
                            value={prefs.trainTimes[i]}
                            onChange={(e) => setTime(i, e.target.value)}
                          />
                        ) : (
                          <button className="aj-day-add" onClick={() => setTime(i, "18:00")}>
                            +
                          </button>
                        )}
                        {on && (
                          <button
                            className="aj-day-clear"
                            onClick={() => setTime(i, "")}
                            aria-label={`Sem lembrete em ${label}`}
                          >
                            descanso
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ——— preferências ——— */}
      <section className="card aj-card">
        <p className="eyebrow">Preferências</p>
        <div className="aj-type">
          <div className="aj-type-info">
            <b>Modo só proteína</b>
            <small>esconde calorias e macros — foco só em proteína e presença</small>
          </div>
          <Toggle
            on={state.profile.hideNumbers}
            onClick={() =>
              dispatch({ type: "SET_PROFILE", patch: { hideNumbers: !state.profile.hideNumbers } })
            }
            label="Modo só proteína"
          />
        </div>
      </section>

      {/* ——— amizades ——— */}
      {sync.myFriendCode && (
        <section className="card aj-card">
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
        </section>
      )}

      {/* ——— grupo ——— */}
      <section className="card aj-card">
        <p className="eyebrow">Grupo</p>
        {sync.group ? (
          <>
            <b className="aj-group-name">{sync.group.name}</b>
            <div className="acc-code-row">
              <span>
                código de convite: <b className="conn-code">{sync.group.invite_code}</b>
              </span>
              <button className="acc-copy" onClick={() => copy(sync.group!.invite_code, "grupo")}>
                {copied === "grupo" ? (
                  <>
                    <IconCheck size={13} stroke={3} /> copiado
                  </>
                ) : (
                  "copiar"
                )}
              </button>
            </div>
          </>
        ) : (
          <BigButton onClick={() => setGroupSheet(true)} tone="ghost">
            Entrar num grupo
          </BigButton>
        )}
      </section>

      {/* ——— sair ——— */}
      <BigButton onClick={logout} tone="ink">
        {confirmOut ? "Tocar de novo pra sair" : "Sair da conta"}
      </BigButton>
      <p className="aj-foot">Seus dados ficam salvos na nuvem e voltam em qualquer aparelho.</p>

      {groupSheet && <GroupSheet onClose={() => setGroupSheet(false)} />}
    </main>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`aj-toggle ${on ? "aj-toggle-on" : ""}`}
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span className="aj-knob" />
    </button>
  );
}
