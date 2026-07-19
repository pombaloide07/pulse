import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { readCoherence } from "../lib/logic";
import { BigButton, Chip } from "../components/ui";
import { IconCheck, IconMedal, IconUp } from "../components/icons";
import "./resumo.css";

export function Resumo() {
  const { sessionId } = useParams();
  const { state } = useStore();
  const navigate = useNavigate();

  const session = state.sessions.find((s) => s.id === sessionId);
  const workout = session ? state.workouts.find((w) => w.id === session.workoutId) : null;
  if (!session || !workout) {
    return (
      <main className="screen">
        <p>Resumo não encontrado.</p>
      </main>
    );
  }

  const c = readCoherence(state, session);
  const minutes = session.finishedAt
    ? Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000))
    : null;

  return (
    <main className="screen resumo">
      <div className="resumo-glow" aria-hidden />

      <header className="resumo-hero rise">
        <span className="resumo-badge">
          <IconCheck size={26} stroke={2.6} />
        </span>
        <h1>
          Você
          <br />
          <em>apareceu.</em>
        </h1>
        <p>
          Treino {workout.letter} · {workout.name}
          {minutes && <> · {minutes} min</>}
        </p>
      </header>

      <section className="card resumo-reading rise">
        <p className="eyebrow">A leitura de hoje</p>

        <div className="reading-line">
          <span className="reading-num serif-num">
            {c.doneExercises}
            <small> de {c.plannedExercises}</small>
          </span>
          <p>exercícios do plano · {Math.round(c.ratio * 100)}% das séries</p>
        </div>

        <ul className="reading-list">
          {c.records.map((i) => (
            <li key={i.exerciseId} className="reading-item">
              <span className="ri-icon ri-record">
                <IconMedal size={16} />
              </span>
              <p>
                <b>{i.name}</b> — novo recorde: <b>{i.topLoad}kg</b>
              </p>
            </li>
          ))}
          {c.loadUps
            .filter((i) => !i.isRecord)
            .map((i) => (
              <li key={i.exerciseId} className="reading-item">
                <span className="ri-icon ri-up">
                  <IconUp size={15} />
                </span>
                <p>
                  <b>{i.name}</b> subiu pra <b>{i.topLoad}kg</b> (era {i.targetLoad})
                </p>
              </li>
            ))}
          {c.skips.map((i) => (
            <li key={i.exerciseId} className="reading-item">
              <span className="ri-icon ri-skip">·</span>
              <p>
                Pulou {i.name.toLowerCase()} — acontece.
              </p>
            </li>
          ))}
          {c.records.length === 0 && c.loadUps.length === 0 && c.skips.length === 0 && (
            <li className="reading-item">
              <span className="ri-icon ri-up">
                <IconCheck size={15} stroke={2.6} />
              </span>
              <p>Plano cumprido do jeito que estava escrito. Consistência pura.</p>
            </li>
          )}
        </ul>

        {c.ratio >= 1 ? (
          <Chip tone="mata">plano completo</Chip>
        ) : (
          <p className="reading-foot">
            O que conta é ter vindo. O resto é ajuste.
          </p>
        )}
      </section>

      <div className="resumo-actions rise">
        <BigButton onClick={() => navigate("/", { replace: true })} tone="ink">
          Fechar
        </BigButton>
        <BigButton onClick={() => navigate("/treino?seg=progressao", { replace: true })} tone="ghost">
          Ver progressão
        </BigButton>
      </div>
    </main>
  );
}
