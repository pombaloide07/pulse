import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { readCoherence } from "../lib/logic";
import { formatShort } from "../lib/dates";
import { BigButton, Chip, ConfirmSheet } from "../components/ui";
import { IconCheck, IconMedal, IconPlus, IconUp } from "../components/icons";
import "./resumo.css";

export function Resumo() {
  const { sessionId } = useParams();
  const { state } = useStore();
  const sync = useSync();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const session = state.sessions.find((s) => s.id === sessionId);
  const workout = session ? state.workouts.find((w) => w.id === session.workoutId) : null;
  if (!session || !workout) {
    return (
      <main className="screen">
        <p>Resumo não encontrado.</p>
        <BigButton onClick={() => navigate("/", { replace: true })} tone="ink">
          Voltar pro início
        </BigButton>
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
          {c.items
            .filter((i) => i.replacedName && !i.skipped)
            .map((i) => (
              <li key={`sw-${i.exerciseId}`} className="reading-item">
                <span className="ri-icon ri-up">
                  <IconCheck size={14} stroke={2.6} />
                </span>
                <p>
                  <b>{i.name}</b> no lugar de {i.replacedName?.toLowerCase()} — vale igual.
                </p>
              </li>
            ))}
          {c.extras.map((i) => (
            <li key={`ex-${i.exerciseId}`} className="reading-item">
              <span className="ri-icon ri-extra">
                <IconPlus size={14} stroke={2.6} />
              </span>
              <p>
                <b>{i.name}</b> — {i.doneSets}{" "}
                {i.doneSets === 1 ? "série a mais" : "séries a mais"}, fora do plano.
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
          {c.records.length === 0 &&
            c.loadUps.length === 0 &&
            c.skips.length === 0 &&
            c.extras.length === 0 && (
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
        <BigButton
          onClick={() => navigate("/grupo?seg=desafios", { replace: true })}
          tone="ghost"
        >
          📸 Check-in do desafio
        </BigButton>
        <BigButton onClick={() => navigate(`/treino/${session.id}`)} tone="ghost">
          Corrigir esse treino
        </BigButton>
        <BigButton onClick={() => navigate("/treino?seg=progressao", { replace: true })} tone="ghost">
          Ver progressão
        </BigButton>
        <button className="resumo-delete" onClick={() => setConfirmDelete(true)}>
          Apagar esse treino
        </button>
      </div>

      {confirmDelete && (
        <ConfirmSheet
          title={`Apagar o treino de ${formatShort(session.date)}?`}
          text="Sai do histórico, da progressão e da presença desse dia. Se você fez outro treino no mesmo dia, a presença continua. O plano não muda."
          confirmLabel="Apagar treino"
          onConfirm={async () => {
            await sync.deleteSession(session.id);
            navigate("/treino?seg=progressao", { replace: true });
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </main>
  );
}
