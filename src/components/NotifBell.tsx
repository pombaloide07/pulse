import { useEffect, useRef, useState } from "react";
import { useNotifications, type Notif } from "../lib/notifications";
import { Sheet } from "./ui";
import { IconBell } from "./icons";
import "./notifbell.css";

/** Sino de notificações no header (só logado). Abre o inbox. */
export function NotifBell() {
  const { unread, notifs, markAllRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const readTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(readTimer.current), []);

  const openInbox = () => {
    setOpen(true);
    // marca como lido ao abrir (pequeno atraso pra você ver o que era novo)
    window.clearTimeout(readTimer.current);
    readTimer.current = window.setTimeout(markAllRead, 1200);
  };

  const closeInbox = () => {
    window.clearTimeout(readTimer.current);
    markAllRead();
    setOpen(false);
  };

  return (
    <>
      <button className="notif-bell" onClick={openInbox} aria-label="Notificações">
        <IconBell size={22} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <Sheet title="Notificações" onClose={closeInbox}>
          {notifs.length === 0 ? (
            <p className="notif-empty">
              Nada por aqui ainda. Quando alguém fizer check-in, quando você chegar perto
              das metas ou completar a semana, aparece aqui.
            </p>
          ) : (
            <>
              <ul className="notif-list">
                {notifs.map((n) => (
                  <NotifRow key={n.id} n={n} />
                ))}
              </ul>
              <button className="notif-clear" onClick={clear}>
                Limpar tudo
              </button>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

function NotifRow({ n }: { n: Notif }) {
  return (
    <li className={`notif-row ${n.read ? "" : "notif-unread"}`}>
      <span className="notif-emoji">{n.emoji}</span>
      <div className="notif-text">
        <b>{n.title}</b>
        <small>{n.body}</small>
        <span className="notif-when">{timeAgo(n.ts)}</span>
      </div>
    </li>
  );
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "agora";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}
