import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { EXERCISES, EXERCISE_BY_ID, MUSCLE_GROUPS } from "../lib/exercises";
import type { PlanItem } from "../lib/types";
import { IconBack, IconMinus, IconPlus, IconTrash, IconX } from "../components/icons";
import { BigButton } from "../components/ui";
import { Portal } from "../components/Portal";
import "./planoeditor.css";

export function PlanoEditor() {
  const { workoutId } = useParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState<string>("");

  const workout = state.workouts.find((w) => w.id === workoutId);
  const inPlan = useMemo(() => new Set(workout?.items.map((i) => i.exerciseId)), [workout]);

  if (!workout) {
    return (
      <main className="screen">
        <p>Treino não encontrado.</p>
      </main>
    );
  }

  const patch = (item: PlanItem, changes: Partial<PlanItem>) => {
    dispatch({
      type: "UPDATE_WORKOUT",
      workout: {
        ...workout,
        items: workout.items.map((i) =>
          i.exerciseId === item.exerciseId ? { ...i, ...changes } : i
        ),
      },
    });
  };

  const clampSets = (n: number) => Math.min(8, Math.max(1, n));
  const loadStep = (l: number) => (l >= 80 ? 5 : 2);

  const candidates = EXERCISES.filter(
    (e) => !inPlan.has(e.id) && (!filter || e.muscle === filter)
  );

  return (
    <main className="screen editor">
      <header className="editor-head">
        <button className="editor-back" onClick={() => navigate("/plano")} aria-label="Voltar">
          <IconBack />
        </button>
        <div>
          <p className="eyebrow">Treino {workout.letter}</p>
          <input
            className="editor-name"
            value={workout.name}
            onChange={(e) => dispatch({ type: "UPDATE_WORKOUT", workout: { ...workout, name: e.target.value } })}
            aria-label="Nome do treino"
          />
        </div>
      </header>

      <div className="editor-list">
        {workout.items.map((item) => {
          const ex = EXERCISE_BY_ID[item.exerciseId];
          return (
            <section key={item.exerciseId} className="card editor-item">
              <header>
                <div>
                  <h2>{ex?.name}</h2>
                  <p>
                    {ex?.muscle} · {ex?.equipment}
                  </p>
                </div>
                <button
                  className="editor-remove"
                  aria-label={`Remover ${ex?.name}`}
                  onClick={() =>
                    dispatch({
                      type: "REMOVE_PLAN_ITEM",
                      workoutId: workout.id,
                      exerciseId: item.exerciseId,
                    })
                  }
                >
                  <IconTrash size={18} />
                </button>
              </header>
              <div className="editor-fields">
                <Field
                  label="séries"
                  value={item.sets}
                  onDec={() => patch(item, { sets: clampSets(item.sets - 1) })}
                  onInc={() => patch(item, { sets: clampSets(item.sets + 1) })}
                />
                <Field
                  label="reps"
                  value={item.targetReps}
                  onDec={() => patch(item, { targetReps: Math.max(1, item.targetReps - 1) })}
                  onInc={() => patch(item, { targetReps: item.targetReps + 1 })}
                />
                <Field
                  label="kg alvo"
                  value={item.targetLoad}
                  onDec={() => patch(item, { targetLoad: Math.max(0, item.targetLoad - loadStep(item.targetLoad)) })}
                  onInc={() => patch(item, { targetLoad: item.targetLoad + loadStep(item.targetLoad) })}
                />
              </div>
            </section>
          );
        })}
      </div>

      <BigButton onClick={() => setPicking(true)} tone="ink">
        <IconPlus size={19} />
        Adicionar exercício
      </BigButton>

      {picking && (
        <Portal>
        <div className="sheet-backdrop" onClick={() => setPicking(false)}>
          <div className="sheet picker" onClick={(e) => e.stopPropagation()}>
            <header className="picker-head">
              <h2>Adicionar exercício</h2>
              <button onClick={() => setPicking(false)} aria-label="Fechar">
                <IconX />
              </button>
            </header>
            <div className="picker-filters">
              <button
                className={`pf ${filter === "" ? "pf-on" : ""}`}
                onClick={() => setFilter("")}
              >
                Todos
              </button>
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  className={`pf ${filter === m ? "pf-on" : ""}`}
                  onClick={() => setFilter(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <ul className="picker-list">
              {candidates.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => {
                      dispatch({
                        type: "ADD_PLAN_ITEM",
                        workoutId: workout.id,
                        item: { exerciseId: e.id, sets: 3, targetReps: 10, targetLoad: 10 },
                      });
                      setPicking(false);
                    }}
                  >
                    <span>
                      <b>{e.name}</b>
                      <small>
                        {e.muscle} · {e.equipment}
                      </small>
                    </span>
                    <IconPlus size={18} />
                  </button>
                </li>
              ))}
              {candidates.length === 0 && <li className="picker-empty">Tudo desse grupo já está no treino.</li>}
            </ul>
          </div>
        </div>
        </Portal>
      )}
    </main>
  );
}

export function Field({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: number | string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="field-ctrl">
        <button onClick={onDec} aria-label={`Menos ${label}`}>
          <IconMinus size={16} />
        </button>
        <b className="serif-num">{value}</b>
        <button onClick={onInc} aria-label={`Mais ${label}`}>
          <IconPlus size={16} stroke={2} />
        </button>
      </div>
    </div>
  );
}
