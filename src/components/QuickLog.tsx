import { useState } from "react";
import { useStore } from "../lib/store";
import { WEEKDAY_SHORT, addDays, fromISO, toISO, todayISO } from "../lib/dates";
import { nextWorkout } from "../lib/logic";
import { BigButton, Sheet } from "./ui";
import { IconCheck } from "./icons";
import "./quicklog.css";

/**
 * Lançamento rápido: registra um treino do plano como feito — hoje ou num dos
 * últimos 7 dias — em dois toques. Pra quem treinou e esqueceu de abrir o app:
 * a presença conta, a rotação anda, e ninguém precisa "refazer" o treino ao vivo.
 */
export function QuickLogSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const me = state.members.find((m) => m.isMe);
  const [date, setDate] = useState(todayISO());
  const [workoutId, setWorkoutId] = useState(nextWorkout(state).id);

  // hoje + 6 dias pra trás — mesma janela retroativa que o servidor aceita
  const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(new Date(), -i)));

  const labelOf = (iso: string, i: number) => {
    if (i === 0) return "hoje";
    if (i === 1) return "ontem";
    const d = fromISO(iso);
    return `${WEEKDAY_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()}`;
  };

  const save = () => {
    dispatch({ type: "QUICK_LOG", workoutId, sessionId: `q-${Date.now()}`, date });
    onClose();
  };

  return (
    <Sheet title="Lançar treino" onClose={onClose}>
      <p className="conn-note">
        Treinou e não registrou? Marca o dia e o treino — entra como feito, do jeito
        que está no plano.
      </p>

      <p className="eyebrow ql-label">Que dia foi?</p>
      <div className="ql-days">
        {days.map((iso, i) => {
          const trained = me?.presence.includes(iso);
          return (
            <button
              key={iso}
              className={`pf ${date === iso ? "pf-on" : ""}`}
              onClick={() => setDate(iso)}
            >
              {labelOf(iso, i)}
              {trained && (
                <span className="ql-trained" title="já tem treino nesse dia">
                  <IconCheck size={11} stroke={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="eyebrow ql-label">Qual treino?</p>
      <div className="ql-workouts">
        {state.workouts.map((w) => (
          <button
            key={w.id}
            className={`ql-workout ${workoutId === w.id ? "ql-workout-on" : ""}`}
            onClick={() => setWorkoutId(w.id)}
          >
            <span className="ql-letter serif-num">{w.letter}</span>
            <span className="ql-w-info">
              <b>{w.name}</b>
              <small>{w.items.length} exercícios</small>
            </span>
          </button>
        ))}
      </div>

      <BigButton onClick={save} tone="pulse">
        <IconCheck size={19} stroke={2.6} />
        Registrar como feito
      </BigButton>
      <p className="ql-hint">
        Cargas e repetições entram pelo alvo do plano. Pra registrar série a série,
        use o "Começar treino" da tela Hoje.
      </p>
    </Sheet>
  );
}
