import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { EXERCISE_BY_ID, exerciseName } from "../lib/exercises";
import { EXERCISE_GUIDES } from "../lib/exerciseGuides";
import { progression } from "../lib/logic";
import { formatShort } from "../lib/dates";
import { BodyMap, REGION_LABEL } from "../components/anatomy";
import { IconBack, IconChevronRight, IconMedal } from "../components/icons";
import { BigButton, Chip, Sheet } from "../components/ui";
import "./exercicio.css";

/** A ficha de um exercício: o que trabalha, como se faz e onde. */
export function Exercicio() {
  const { exerciseId = "" } = useParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const ex = EXERCISE_BY_ID[exerciseId];
  const guide = EXERCISE_GUIDES[exerciseId];

  const history = useMemo(
    () => (ex ? progression(state, exerciseId) : []),
    [state, exerciseId, ex]
  );

  if (!ex) {
    return (
      <main className="screen">
        <p>Exercício não encontrado.</p>
        <BigButton onClick={() => navigate("/treino?seg=exercicios", { replace: true })} tone="ink">
          Voltar pra biblioteca
        </BigButton>
      </main>
    );
  }

  const best = history.reduce(
    (acc, p) => (p.topLoad > (acc?.topLoad ?? 0) ? p : acc),
    null as (typeof history)[number] | null
  );
  const last = history[history.length - 1];

  return (
    <main className="screen ficha">
      <header className="editor-head">
        <button className="editor-back" onClick={() => navigate(-1)} aria-label="Voltar">
          <IconBack />
        </button>
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h1 className="ficha-name">{ex.name}</h1>
        </div>
      </header>

      <section className="card ficha-map rise">
        <BodyMap primary={guide?.primary ?? []} secondary={guide?.secondary} />
        {guide && (
          <div className="bm-legend">
            <span>
              <i className="bm-dot-primary" />
              {guide.primary.map((r) => REGION_LABEL[r]).join(", ")}
            </span>
            {guide.secondary.length > 0 && (
              <span>
                <i className="bm-dot-secondary" />
                {guide.secondary.map((r) => REGION_LABEL[r]).join(", ")}
              </span>
            )}
          </div>
        )}
        <div className="ficha-chips">
          <Chip>{ex.muscle}</Chip>
          <Chip>{ex.equipment}</Chip>
        </div>
        {guide && <p className="ficha-summary">{guide.summary}</p>}
      </section>

      {guide && (
        <>
          <section className="card ficha-block rise">
            <p className="eyebrow">Onde fazer</p>
            <p className="ficha-text">{guide.where}</p>
          </section>

          <section className="card ficha-block rise">
            <p className="eyebrow">Como faz</p>
            <ol className="ficha-steps">
              {guide.steps.map((s, i) => (
                <li key={i}>
                  <span className="serif-num">{i + 1}</span>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="card ficha-block rise">
            <p className="eyebrow">O que costuma sair errado</p>
            <ul className="ficha-mistakes">
              {guide.mistakes.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>

          <section className="card ficha-tip rise">
            <p className="eyebrow">A dica</p>
            <p className="ficha-text">{guide.tip}</p>
          </section>
        </>
      )}

      {history.length > 0 && (
        <section className="card ficha-block rise">
          <p className="eyebrow">Seu histórico</p>
          <div className="ficha-hist">
            <div>
              <span className="ficha-hist-num serif-num">
                {best?.topLoad ?? 0}
                <small>kg</small>
              </span>
              <small>
                <IconMedal size={13} /> melhor marca
                {best && ` · ${formatShort(best.date)}`}
              </small>
            </div>
            <div>
              <span className="ficha-hist-num serif-num">
                {last?.topLoad ?? 0}
                <small>kg</small>
              </span>
              <small>última vez · {last && formatShort(last.date)}</small>
            </div>
            <div>
              <span className="ficha-hist-num serif-num">{history.length}</span>
              <small>{history.length === 1 ? "treino" : "treinos"} com ele</small>
            </div>
          </div>
        </section>
      )}

      {guide && guide.swaps.length > 0 && (
        <section className="card ficha-block rise">
          <p className="eyebrow">Serve no lugar dele</p>
          <ul className="ficha-swaps">
            {guide.swaps.map((id) => (
              <li key={id}>
                <button onClick={() => navigate(`/exercicio/${id}`, { replace: true })}>
                  <span>{exerciseName(id)}</span>
                  <IconChevronRight />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BigButton onClick={() => setAdding(true)} tone="ink">
        Adicionar a um treino
      </BigButton>
      <p className="ficha-foot">
        Guia de execução, não avaliação individual. Dor que continua depois do treino é assunto
        pra quem pode te examinar.
      </p>

      {adding && (
        <Sheet title="Em qual treino?" onClose={() => setAdding(false)}>
          <div className="ficha-picker">
            {state.workouts.map((w) => {
              const has = w.items.some((i) => i.exerciseId === ex.id);
              return (
                <button
                  key={w.id}
                  className="ficha-pick"
                  disabled={has}
                  onClick={() => {
                    dispatch({
                      type: "ADD_PLAN_ITEM",
                      workoutId: w.id,
                      item: { exerciseId: ex.id, sets: 3, targetReps: 10, targetLoad: 10 },
                    });
                    setAdding(false);
                    navigate(`/plano/${w.id}`);
                  }}
                >
                  <span className="ficha-pick-letter serif-num">{w.letter}</span>
                  <span className="ficha-pick-info">
                    <b>{w.name}</b>
                    <small>{has ? "já está nesse treino" : `${w.items.length} exercícios`}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </main>
  );
}
