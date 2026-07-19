import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { EXERCISE_BY_ID } from "../lib/exercises";
import { IconCheck, IconMinus, IconPlus, IconX } from "../components/icons";
import { BigButton } from "../components/ui";
import "./sessao.css";

function loadStep(load: number): number {
  return load >= 80 ? 5 : 2;
}

export function Sessao() {
  const { sessionId } = useParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const session = state.sessions.find((s) => s.id === sessionId);
  const workout = session ? state.workouts.find((w) => w.id === session.workoutId) : null;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!session) return;
    const tick = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 60000));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [session?.startedAt]);

  const totals = useMemo(() => {
    if (!session) return { done: 0, all: 0 };
    let done = 0;
    let all = 0;
    for (const l of session.logs) {
      all += l.sets.length;
      done += l.sets.filter((s) => s.done).length;
    }
    return { done, all };
  }, [session]);

  if (!session || !workout) {
    return (
      <main className="screen">
        <p>Treino não encontrado.</p>
      </main>
    );
  }

  const update = (exerciseId: string, setIndex: number, load: number, reps: number) =>
    dispatch({
      type: "SET_LOG",
      sessionId: session.id,
      exerciseId,
      setIndex,
      load: Math.max(0, load),
      reps: Math.max(0, reps),
    });

  const toggle = (exerciseId: string, setIndex: number) =>
    dispatch({ type: "TOGGLE_SET", sessionId: session.id, exerciseId, setIndex });

  const finish = () => {
    dispatch({ type: "FINISH_SESSION", sessionId: session.id });
    navigate(`/resumo/${session.id}`, { replace: true });
  };

  const discard = () => {
    dispatch({ type: "DISCARD_SESSION", sessionId: session.id });
    navigate("/", { replace: true });
  };

  return (
    <main className="screen sessao">
      <header className="sessao-head">
        <button
          className="sessao-close"
          aria-label="Descartar treino"
          onClick={() => setConfirmDiscard(true)}
        >
          <IconX />
        </button>
        <div>
          <p className="eyebrow">
            Treino {workout.letter} · {elapsed} min
          </p>
          <h1>{workout.name}</h1>
        </div>
        <span className="sessao-count serif-num">
          {totals.done}
          <small>/{totals.all}</small>
        </span>
      </header>

      <div className="sessao-progress" aria-hidden>
        <span style={{ width: `${totals.all ? (totals.done / totals.all) * 100 : 0}%` }} />
      </div>

      <div className="sessao-list">
        {workout.items.map((item) => {
          const log = session.logs.find((l) => l.exerciseId === item.exerciseId);
          if (!log) return null;
          const ex = EXERCISE_BY_ID[item.exerciseId];
          const allDone = log.sets.every((s) => s.done);
          return (
            <section key={item.exerciseId} className={`card ex-card ${allDone ? "ex-done" : ""}`}>
              <header className="ex-head">
                <div>
                  <h2>{ex?.name}</h2>
                  <p>
                    Plano: {item.sets}×{item.targetReps}
                    {item.targetLoad > 0 && <> · {item.targetLoad}kg</>}
                  </p>
                </div>
                {allDone && (
                  <span className="ex-check">
                    <IconCheck size={16} stroke={3} />
                  </span>
                )}
              </header>
              <div className="sets">
                {log.sets.map((set, i) => (
                  <div key={i} className={`set-row ${set.done ? "set-done" : ""}`}>
                    <span className="set-n serif-num">{i + 1}</span>

                    <div className="stepper">
                      <button
                        aria-label="Menos carga"
                        onClick={() => update(item.exerciseId, i, set.load - loadStep(set.load), set.reps)}
                      >
                        <IconMinus size={17} />
                      </button>
                      <span>
                        <b className="serif-num">{set.load}</b>
                        <small>kg</small>
                      </span>
                      <button
                        aria-label="Mais carga"
                        onClick={() => update(item.exerciseId, i, set.load + loadStep(set.load), set.reps)}
                      >
                        <IconPlus size={17} stroke={2} />
                      </button>
                    </div>

                    <div className="stepper stepper-reps">
                      <button
                        aria-label="Menos repetições"
                        onClick={() => update(item.exerciseId, i, set.load, set.reps - 1)}
                      >
                        <IconMinus size={17} />
                      </button>
                      <span>
                        <b className="serif-num">{set.reps}</b>
                        <small>rep</small>
                      </span>
                      <button
                        aria-label="Mais repetições"
                        onClick={() => update(item.exerciseId, i, set.load, set.reps + 1)}
                      >
                        <IconPlus size={17} stroke={2} />
                      </button>
                    </div>

                    <button
                      className="set-toggle"
                      aria-label={set.done ? "Desmarcar série" : "Concluir série"}
                      aria-pressed={set.done}
                      onClick={() => toggle(item.exerciseId, i)}
                    >
                      <IconCheck size={20} stroke={2.8} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="sessao-footer">
        <BigButton onClick={finish} tone="ink" disabled={totals.done === 0}>
          Concluir treino
        </BigButton>
        <p className="sessao-hint">
          {totals.done === 0
            ? "Marque as séries conforme for fazendo."
            : "Não precisa fazer tudo. Fez, valeu."}
        </p>
      </footer>

      {confirmDiscard && (
        <div className="sheet-backdrop" onClick={() => setConfirmDiscard(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Sair sem salvar?</h2>
            <p>Esse registro de hoje será descartado. O plano continua intacto.</p>
            <BigButton onClick={discard} tone="pulse">
              Descartar treino
            </BigButton>
            <BigButton onClick={() => setConfirmDiscard(false)} tone="ghost">
              Voltar pro treino
            </BigButton>
          </div>
        </div>
      )}
    </main>
  );
}
