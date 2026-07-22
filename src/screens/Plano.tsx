import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { EXERCISE_BY_ID } from "../lib/exercises";
import { getSchedule, nextWorkoutLetter } from "../lib/logic";
import { WEEKDAY_SHORT } from "../lib/dates";
import { REST_DAY, type ScheduleDay } from "../lib/types";
import { BigButton, Chip } from "../components/ui";
import { IconChevronRight, IconPlus } from "../components/icons";
import "./plano.css";

/** Seção "Plano" do hub Treino. */
export function PlanoSection() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const schedule = getSchedule(state);

  // toque num dia cicla pelos treinos e cai em "descanso" antes de voltar ao A
  const cycleDay = (day: number) => {
    const seq: ScheduleDay[] = [...state.workouts.map((w) => w.id), REST_DAY];
    const idx = seq.indexOf(schedule[day]);
    dispatch({ type: "SET_SCHEDULE_DAY", day, value: seq[(idx + 1) % seq.length] });
  };

  const addWorkout = () => {
    const id = `w-${Date.now()}`;
    dispatch({
      type: "ADD_WORKOUT",
      workout: { id, letter: nextWorkoutLetter(state.workouts), name: "Novo treino", items: [] },
    });
    navigate(`/plano/${id}`);
  };

  return (
    <div className="plano">
      <section className="card week-plan rise">
        <p className="eyebrow">Sua semana — toque num dia pra trocar</p>
        <div className="wp-days">
          {WEEKDAY_SHORT.map((label, i) => {
            const entry = schedule[i];
            const w = entry === REST_DAY ? null : state.workouts.find((x) => x.id === entry);
            return (
              <button
                key={i}
                className={`wp-day ${w ? "" : "wp-rest"}`}
                onClick={() => cycleDay(i)}
                aria-label={`${label}: ${w ? w.name : "descanso"} — toque pra trocar`}
              >
                <span className="wp-dow">{label}</span>
                <span className="wp-mark serif-num">{w ? w.letter : "·"}</span>
              </button>
            );
          })}
        </div>
        <p className="wp-legend">
          Dias com letra são treino; ponto é descanso. Ajuste do seu jeito.
        </p>
      </section>

      <p className="plano-sub rise">
        Plano vivo: mexa quando quiser. Ele é o contrato que o treino do dia compara.
      </p>

      {state.workouts.map((w) => {
        const muscles = [...new Set(w.items.map((i) => EXERCISE_BY_ID[i.exerciseId]?.muscle))].filter(
          Boolean
        );
        return (
          <button
            key={w.id}
            className="card plano-card rise"
            onClick={() => navigate(`/plano/${w.id}`)}
          >
            <span className="plano-letter serif-num">{w.letter}</span>
            <div className="plano-info">
              <h2>{w.name}</h2>
              <p>
                {w.items.length} {w.items.length === 1 ? "exercício" : "exercícios"} ·{" "}
                {w.items.reduce((acc, i) => acc + i.sets, 0)} séries
              </p>
              <div className="plano-chips">
                {muscles.slice(0, 3).map((m) => (
                  <Chip key={m}>{m}</Chip>
                ))}
              </div>
            </div>
            <IconChevronRight />
          </button>
        );
      })}

      <BigButton onClick={addWorkout} tone="ink">
        <IconPlus size={19} />
        Novo treino
      </BigButton>
    </div>
  );
}
