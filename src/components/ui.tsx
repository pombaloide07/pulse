import type { CSSProperties, ReactNode } from "react";
import { WEEKDAY_LETTERS, currentWeekISO, todayISO } from "../lib/dates";
import "./ui.css";

/* ————— Avatar ————— */

export function Avatar({
  initials,
  color,
  size = 40,
  dimmed = false,
}: {
  initials: string;
  color: string;
  size?: number;
  dimmed?: boolean;
}) {
  return (
    <span
      className="avatar"
      style={
        {
          width: size,
          height: size,
          fontSize: size * 0.34,
          "--av": color,
          opacity: dimmed ? 0.45 : 1,
        } as CSSProperties
      }
    >
      {initials}
    </span>
  );
}

/* ————— Anel de presença (um dia) ————— */

export function PresenceRing({
  filled,
  isToday = false,
  size = 34,
  label,
}: {
  filled: boolean;
  isToday?: boolean;
  size?: number;
  label?: string;
}) {
  const r = (size - 6) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <span className={`ring ${isToday ? "ring-today" : ""}`} style={{ width: size }}>
      <svg width={size} height={size}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth={3} />
        {filled && (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="var(--pulse)"
            strokeWidth={3.4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            className="ring-fill"
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
        {filled && <circle cx={c} cy={c} r={r * 0.42} fill="var(--pulse)" opacity={0.14} />}
      </svg>
      {label && <em>{label}</em>}
    </span>
  );
}

/* ————— Strip da semana (seg→dom) ————— */

export function WeekStrip({ presence, size = 36 }: { presence: boolean[]; size?: number }) {
  const week = currentWeekISO();
  const today = todayISO();
  return (
    <div className="weekstrip" role="img" aria-label="Presença na semana">
      {week.map((iso, i) => (
        <PresenceRing
          key={iso}
          filled={presence[i]}
          isToday={iso === today}
          size={size}
          label={WEEKDAY_LETTERS[i]}
        />
      ))}
    </div>
  );
}

/* ————— Chip ————— */

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "pulse" | "mata" | "ambar";
}) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

/* ————— Botão primário ————— */

export function BigButton({
  children,
  onClick,
  tone = "pulse",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "pulse" | "ink" | "ghost";
  disabled?: boolean;
}) {
  return (
    <button className={`bigbtn bigbtn-${tone}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
