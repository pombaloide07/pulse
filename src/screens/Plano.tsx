import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { EXERCISE_BY_ID } from "../lib/exercises";
import { Chip } from "../components/ui";
import { IconChevronRight } from "../components/icons";
import "./plano.css";

/** Seção "Plano" do hub Treino. */
export function PlanoSection() {
  const { state } = useStore();
  const navigate = useNavigate();

  return (
    <div className="plano">
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
                {w.items.length} exercícios ·{" "}
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
    </div>
  );
}
