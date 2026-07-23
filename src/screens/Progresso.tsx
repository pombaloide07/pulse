import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import {
  personalRecords,
  plateau,
  progression,
  trackedExercises,
  weeklyVolume,
} from "../lib/logic";
import { exerciseName } from "../lib/exercises";
import { LineChart, VolumeBars } from "../components/charts";
import { Chip } from "../components/ui";
import { IconChevronRight, IconMedal, IconUp } from "../components/icons";
import { formatShort } from "../lib/dates";
import "./progresso.css";

/** Seção "Progressão" do hub Treino. */
export function ProgressoSection() {
  const { state } = useStore();
  const navigate = useNavigate();
  const tracked = useMemo(() => trackedExercises(state), [state]);
  const [selected, setSelected] = useState<string | null>(null);
  const exerciseId = selected ?? tracked[0];

  const points = useMemo(
    () => (exerciseId ? progression(state, exerciseId) : []),
    [state, exerciseId]
  );
  const plateauInfo = useMemo(() => plateau(points), [points]);
  const volume = useMemo(() => weeklyVolume(state, 8), [state]);
  const prs = useMemo(() => personalRecords(state).slice(0, 5), [state]);
  // o histórico que o app nunca teve: é por aqui que se corrige ou apaga.
  // Ordena pelo dia (que é o que a linha mostra); startedAt só desempata dois
  // treinos do mesmo dia.
  const recent = useMemo(
    () =>
      [...state.sessions]
        .filter((s) => s.finishedAt)
        .sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1))
        .slice(0, 12),
    [state.sessions]
  );

  const first = points[0]?.topLoad ?? 0;
  const last = points[points.length - 1]?.topLoad ?? 0;
  const gain = last - first;

  return (
    <div className="progresso">
      <div className="prog-picker rise">
        {tracked.map((id) => (
          <button
            key={id}
            className={`pf ${id === exerciseId ? "pf-on" : ""}`}
            onClick={() => setSelected(id)}
          >
            {exerciseName(id)}
          </button>
        ))}
      </div>

      <section className="card prog-chart rise">
        <header className="prog-chart-head">
          <div>
            <h2>{exerciseId ? exerciseName(exerciseId) : "Progressão"}</h2>
            <p>carga máxima por treino</p>
          </div>
          {gain > 0 && (
            <Chip tone="mata">
              <IconUp size={13} /> +{gain}kg
            </Chip>
          )}
        </header>
        <LineChart
          points={points.map((p) => ({
            date: p.date,
            value: p.topLoad,
            sub: `volume ${Math.round(p.volume)}kg`,
          }))}
          unit="kg"
          emptyText="Sem registros ainda — o primeiro treino desenha a linha."
        />
        {plateauInfo && (
          <p className="prog-plateau">
            Está em <b>{plateauInfo.load}kg</b> há {plateauInfo.weeks} semanas. Platôs fazem
            parte — vale tentar mais uma rep antes de subir o peso.
          </p>
        )}
      </section>

      <section className="card prog-chart rise">
        <header className="prog-chart-head">
          <div>
            <h2>Volume semanal</h2>
            <p>total levantado (carga × reps)</p>
          </div>
        </header>
        <VolumeBars data={volume} />
      </section>

      <section className="card prog-prs rise">
        <header className="prog-chart-head">
          <div>
            <h2>Recordes pessoais</h2>
            <p>suas melhores marcas até aqui</p>
          </div>
        </header>
        <ul>
          {prs.map((pr) => (
            <li key={pr.exerciseId}>
              <span className="pr-medal">
                <IconMedal size={17} />
              </span>
              <div>
                <b>{pr.name}</b>
                <small>em {formatShort(pr.date)}</small>
              </div>
              <span className="pr-load serif-num">{pr.load}kg</span>
            </li>
          ))}
        </ul>
      </section>

      {recent.length > 0 && (
        <section className="card prog-hist rise">
          <header className="prog-chart-head">
            <div>
              <h2>Últimos treinos</h2>
              <p>toque pra ver, corrigir ou apagar</p>
            </div>
          </header>
          <ul>
            {recent.map((s) => {
              const w = state.workouts.find((x) => x.id === s.workoutId);
              const sets = s.logs.reduce(
                (acc, l) => acc + l.sets.filter((x) => x.done).length,
                0
              );
              return (
                <li key={s.id}>
                  <button onClick={() => navigate(`/resumo/${s.id}`)}>
                    <span className="ph-letter serif-num">{w?.letter ?? "?"}</span>
                    <span className="ph-info">
                      <b>{w?.name ?? "Treino"}</b>
                      <small>
                        {formatShort(s.date)} · {sets} {sets === 1 ? "série" : "séries"}
                      </small>
                    </span>
                    <IconChevronRight />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
