import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useSync } from "../lib/sync";
import { exerciseName } from "../lib/exercises";
import { lastLoadOf, loadStep, logForItem } from "../lib/logic";
import { WEEKDAY_SHORT, addDays, formatShort, fromISO, toISO } from "../lib/dates";
import type { ExerciseLog, PlanItem } from "../lib/types";
import { IconCheck, IconMinus, IconPlus, IconTrash, IconX } from "../components/icons";
import { BigButton, Chip, ConfirmSheet, Sheet } from "../components/ui";
import { ExercisePickerSheet } from "../components/ExercisePicker";
import "./sessao.css";

/** Uma linha da sessão: um exercício do plano, ou um que entrou por fora. */
interface Row {
  log: ExerciseLog;
  /** null quando o exercício não veio do plano */
  item: PlanItem | null;
}

export function Sessao() {
  const { sessionId } = useParams();
  const { state, dispatch } = useStore();
  const sync = useSync();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picking, setPicking] = useState<null | { replacing?: string }>(null);
  const [pickingDate, setPickingDate] = useState(false);

  const session = state.sessions.find((s) => s.id === sessionId);
  const workout = session ? state.workouts.find((w) => w.id === session.workoutId) : null;
  // treino já concluído: a tela vira correção do registro, não treino ao vivo
  const isDone = !!session?.finishedAt;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!session || session.finishedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 60000));
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [session?.startedAt, session?.finishedAt]);

  /* linhas: primeiro o plano (com quem entrou no lugar), depois os extras */
  const rows = useMemo<Row[]>(() => {
    if (!session) return [];
    const out: Row[] = [];
    for (const item of workout?.items ?? []) {
      const log = logForItem(session, item.exerciseId);
      // exercício adicionado ao plano depois que a sessão começou não tem log
      if (log) out.push({ log, item });
    }
    for (const log of session.logs) {
      if (log.extra) out.push({ log, item: null });
    }
    return out;
  }, [session, workout]);

  const totals = useMemo(() => {
    // o contador é do plano: adicionar exercício não pode fazer a barra voltar
    let done = 0;
    let all = 0;
    for (const { log, item } of rows) {
      if (!item) continue;
      all += log.sets.length;
      done += log.sets.filter((s) => s.done).length;
    }
    const extras = rows.filter((r) => !r.item && r.log.sets.some((s) => s.done)).length;
    return { done, all, extras };
  }, [rows]);

  if (!session || !workout) {
    return (
      <main className="screen">
        <p>Treino não encontrado.</p>
        <BigButton onClick={() => navigate("/", { replace: true })} tone="ink">
          Voltar pro início
        </BigButton>
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

  const remove = async () => {
    await sync.deleteSession(session.id);
    navigate(isDone ? "/treino?seg=progressao" : "/", { replace: true });
  };

  const pick = (exerciseId: string) => {
    if (picking?.replacing) {
      dispatch({
        type: "REPLACE_SESSION_EXERCISE",
        sessionId: session.id,
        fromExerciseId: picking.replacing,
        toExerciseId: exerciseId,
        reps: 10,
        load: lastLoadOf(state, exerciseId),
      });
    } else {
      dispatch({
        type: "ADD_SESSION_EXERCISE",
        sessionId: session.id,
        exerciseId,
        sets: 3,
        reps: 10,
        load: lastLoadOf(state, exerciseId),
      });
    }
    setPicking(null);
  };

  // mesma janela que o servidor aceita pra presença retroativa
  const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(new Date(), -i)));
  const canMoveDate = isDone && days.includes(session.date);

  return (
    <main className="screen sessao">
      <header className="sessao-head">
        <button
          className="sessao-close"
          aria-label={isDone ? "Apagar treino" : "Descartar treino"}
          onClick={() => setConfirmDelete(true)}
        >
          <IconX />
        </button>
        <div>
          <p className="eyebrow">
            Treino {workout.letter} · {isDone ? formatShort(session.date) : `${elapsed} min`}
          </p>
          <h1>{workout.name}</h1>
        </div>
        <span className="sessao-count serif-num">
          {totals.done}
          <small>/{totals.all}</small>
        </span>
      </header>

      {isDone && (
        <div className="sessao-editing">
          <span>Corrigindo um treino já registrado — nada aqui está correndo.</span>
          {canMoveDate && (
            <button onClick={() => setPickingDate(true)}>trocar o dia</button>
          )}
        </div>
      )}

      <div className="sessao-progress" aria-hidden>
        <span style={{ width: `${totals.all ? (totals.done / totals.all) * 100 : 0}%` }} />
      </div>

      {totals.extras > 0 && (
        <div className="sessao-extras-chip">
          <Chip tone="ambar">
            +{totals.extras} fora do plano
          </Chip>
        </div>
      )}

      <div className="sessao-list">
        {rows.map(({ log, item }) => {
          const allDone = log.sets.every((s) => s.done);
          const nothingDone = !log.sets.some((s) => s.done);
          const isExtra = !item;
          return (
            <section
              key={log.exerciseId}
              className={`card ex-card ${allDone ? "ex-done" : ""} ${isExtra ? "ex-extra" : ""}`}
            >
              <header className="ex-head">
                <div>
                  <h2>{exerciseName(log.exerciseId)}</h2>
                  <p>
                    {isExtra ? (
                      <>Fora do plano · {log.sets.length} séries</>
                    ) : log.replacedId ? (
                      <>No lugar de {exerciseName(log.replacedId)}</>
                    ) : (
                      <>
                        Plano: {item.sets}×{item.targetReps}
                        {item.targetLoad > 0 && <> · {item.targetLoad}kg</>}
                      </>
                    )}
                  </p>
                </div>
                <div className="ex-actions">
                  {allDone && (
                    <span className="ex-check">
                      <IconCheck size={16} stroke={3} />
                    </span>
                  )}
                  {/* o extra sai a qualquer momento, inclusive já concluído:
                      adicionou errado tem que ter volta */}
                  {isExtra && (
                    <button
                      className="ex-remove"
                      aria-label={`Tirar ${exerciseName(log.exerciseId)} do treino`}
                      onClick={() =>
                        dispatch({
                          type: "REMOVE_SESSION_EXERCISE",
                          sessionId: session.id,
                          exerciseId: log.exerciseId,
                        })
                      }
                    >
                      <IconTrash size={16} />
                    </button>
                  )}
                </div>
              </header>
              <div className="sets">
                {log.sets.map((set, i) => (
                  <div key={i} className={`set-row ${set.done ? "set-done" : ""}`}>
                    <span className="set-n serif-num">{i + 1}</span>

                    <div className="stepper">
                      <button
                        aria-label="Menos carga"
                        onClick={() =>
                          update(log.exerciseId, i, set.load - loadStep(set.load), set.reps)
                        }
                      >
                        <IconMinus size={17} />
                      </button>
                      <span>
                        <b className="serif-num">{set.load}</b>
                        <small>kg</small>
                      </span>
                      <button
                        aria-label="Mais carga"
                        onClick={() =>
                          update(log.exerciseId, i, set.load + loadStep(set.load), set.reps)
                        }
                      >
                        <IconPlus size={17} stroke={2} />
                      </button>
                    </div>

                    <div className="stepper stepper-reps">
                      <button
                        aria-label="Menos repetições"
                        onClick={() => update(log.exerciseId, i, set.load, set.reps - 1)}
                      >
                        <IconMinus size={17} />
                      </button>
                      <span>
                        <b className="serif-num">{set.reps}</b>
                        <small>rep</small>
                      </span>
                      <button
                        aria-label="Mais repetições"
                        onClick={() => update(log.exerciseId, i, set.load, set.reps + 1)}
                      >
                        <IconPlus size={17} stroke={2} />
                      </button>
                    </div>

                    <button
                      className="set-toggle"
                      aria-label={set.done ? "Desmarcar série" : "Concluir série"}
                      aria-pressed={set.done}
                      onClick={() => toggle(log.exerciseId, i)}
                    >
                      <IconCheck size={20} stroke={2.8} />
                    </button>
                  </div>
                ))}
              </div>
              <footer className="ex-foot">
                <button
                  onClick={() =>
                    dispatch({
                      type: "REMOVE_SESSION_SET",
                      sessionId: session.id,
                      exerciseId: log.exerciseId,
                    })
                  }
                  disabled={log.sets.length <= 1}
                >
                  − série
                </button>
                <button
                  onClick={() =>
                    dispatch({
                      type: "ADD_SESSION_SET",
                      sessionId: session.id,
                      exerciseId: log.exerciseId,
                    })
                  }
                  disabled={log.sets.length >= 12}
                >
                  + série
                </button>
                {/* trocar só enquanto nada foi feito: senão a carga do antigo
                    viraria recorde do novo */}
                {!isExtra && nothingDone && (
                  <button
                    className="ex-swap"
                    onClick={() => setPicking({ replacing: log.exerciseId })}
                  >
                    trocar
                  </button>
                )}
              </footer>
            </section>
          );
        })}
      </div>

      <div className="sessao-add">
        <BigButton onClick={() => setPicking({})} tone="ink">
          <IconPlus size={18} />
          Adicionar exercício
        </BigButton>
        <p className="sessao-hint">
          Fugiu do plano? Registra aqui — conta no volume e na progressão do mesmo jeito.
        </p>
      </div>

      <footer className="sessao-footer">
        {isDone ? (
          <BigButton onClick={() => navigate(`/resumo/${session.id}`, { replace: true })} tone="ink">
            Pronto
          </BigButton>
        ) : (
          <BigButton onClick={finish} tone="ink" disabled={totals.done === 0}>
            Concluir treino
          </BigButton>
        )}
        <p className="sessao-hint">
          {isDone
            ? "Corrigido. O histórico já está atualizado."
            : totals.done === 0
              ? "Marque as séries conforme for fazendo."
              : "Não precisa fazer tudo. Fez, valeu."}
        </p>
      </footer>

      {confirmDelete && (
        <ConfirmSheet
          title={isDone ? `Apagar o treino de ${formatShort(session.date)}?` : "Sair sem salvar?"}
          text={
            isDone
              ? "Sai do histórico, da progressão e da presença desse dia. Se você fez outro treino no mesmo dia, a presença continua. O plano não muda."
              : "Esse registro de hoje será descartado. O plano continua intacto."
          }
          confirmLabel={isDone ? "Apagar treino" : "Descartar treino"}
          cancelLabel={isDone ? "Cancelar" : "Voltar pro treino"}
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}

      {pickingDate && (
        <Sheet title="Que dia foi esse treino?" onClose={() => setPickingDate(false)}>
          <p className="conn-note">
            A presença acompanha: sai do dia antigo e entra no novo.
          </p>
          <div className="picker-filters">
            {days.map((iso, i) => (
              <button
                key={iso}
                className={`pf ${session.date === iso ? "pf-on" : ""}`}
                onClick={() => {
                  dispatch({ type: "SET_SESSION_DATE", sessionId: session.id, date: iso });
                  setPickingDate(false);
                }}
              >
                {i === 0
                  ? "hoje"
                  : i === 1
                    ? "ontem"
                    : `${WEEKDAY_SHORT[(fromISO(iso).getDay() + 6) % 7]} ${fromISO(iso).getDate()}`}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {picking && (
        <ExercisePickerSheet
          title={picking.replacing ? "Trocar exercício" : "Adicionar exercício"}
          replacingName={picking.replacing ? exerciseName(picking.replacing) : undefined}
          excludeIds={new Set(session.logs.map((l) => l.exerciseId))}
          onPick={pick}
          onClose={() => setPicking(null)}
        />
      )}
    </main>
  );
}
