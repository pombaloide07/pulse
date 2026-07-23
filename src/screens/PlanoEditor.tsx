import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { EXERCISE_BY_ID } from "../lib/exercises";
import { loadStep } from "../lib/logic";
import type { PlanItem } from "../lib/types";
import { IconBack, IconMinus, IconPlus, IconTrash } from "../components/icons";
import { BigButton, ConfirmSheet } from "../components/ui";
import { ExercisePickerSheet } from "../components/ExercisePicker";
import "./planoeditor.css";

export function PlanoEditor() {
  const { workoutId } = useParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const workout = state.workouts.find((w) => w.id === workoutId);
  const inPlan = useMemo(() => new Set(workout?.items.map((i) => i.exerciseId)), [workout]);
  const canDelete = state.workouts.length > 1;

  if (!workout) {
    return (
      <main className="screen">
        <p>Treino não encontrado.</p>
        <BigButton onClick={() => navigate("/treino", { replace: true })} tone="ink">
          Voltar pro plano
        </BigButton>
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

  return (
    <main className="screen editor">
      <header className="editor-head">
        <button className="editor-back" onClick={() => navigate("/treino")} aria-label="Voltar">
          <IconBack />
        </button>
        <div className="editor-titles">
          <input
            className="editor-letter"
            value={workout.letter}
            maxLength={2}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_WORKOUT",
                workout: { ...workout, letter: e.target.value.toUpperCase() },
              })
            }
            aria-label="Tipo do treino (letra)"
          />
          <div className="editor-title-text">
            <p className="eyebrow">Editando treino</p>
            <input
              className="editor-name"
              value={workout.name}
              placeholder="Nome do treino"
              onChange={(e) => dispatch({ type: "UPDATE_WORKOUT", workout: { ...workout, name: e.target.value } })}
              aria-label="Nome do treino"
            />
          </div>
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

      {canDelete && (
        <button className="editor-delete" onClick={() => setConfirmDelete(true)}>
          Excluir treino {workout.letter}
        </button>
      )}

      {confirmDelete && (
        <ConfirmSheet
          title={`Excluir treino ${workout.letter}?`}
          text="O histórico dos treinos já feitos continua na progressão. Os dias da semana que usavam ele viram descanso."
          confirmLabel="Excluir treino"
          onConfirm={() => {
            dispatch({ type: "DELETE_WORKOUT", id: workout.id });
            navigate("/treino", { replace: true });
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}

      {picking && (
        <ExercisePickerSheet
          title="Adicionar exercício"
          excludeIds={inPlan}
          onClose={() => setPicking(false)}
          onPick={(exerciseId) => {
            dispatch({
              type: "ADD_PLAN_ITEM",
              workoutId: workout.id,
              item: { exerciseId, sets: 3, targetReps: 10, targetLoad: 10 },
            });
            setPicking(false);
          }}
        />
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
