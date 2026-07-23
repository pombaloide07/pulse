import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EXERCISES, MUSCLE_GROUPS, searchExercises } from "../lib/exercises";
import { EXERCISE_GUIDES } from "../lib/exerciseGuides";
import { BodyMap } from "../components/anatomy";
import { IconChevronRight } from "../components/icons";
import "./exercicios.css";

/** Seção "Exercícios" do hub Treino: a biblioteca. */
export function ExerciciosSection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");

  const results = useMemo(() => searchExercises(query, muscle), [query, muscle]);

  return (
    <div className="biblio">
      <input
        className="food-search rise"
        placeholder="supino, polia, glúteos…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar exercício"
      />

      <div className="picker-filters rise">
        <button className={`pf ${muscle === "" ? "pf-on" : ""}`} onClick={() => setMuscle("")}>
          Todos
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            className={`pf ${muscle === m ? "pf-on" : ""}`}
            onClick={() => setMuscle(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <p className="biblio-count">
        {results.length === EXERCISES.length
          ? `${EXERCISES.length} exercícios, com o que trabalha e como se faz`
          : `${results.length} ${results.length === 1 ? "exercício" : "exercícios"}`}
      </p>

      <ul className="biblio-list">
        {results.map((e) => {
          const g = EXERCISE_GUIDES[e.id];
          return (
            <li key={e.id}>
              <button className="card biblio-row" onClick={() => navigate(`/exercicio/${e.id}`)}>
                <span className="biblio-thumb" aria-hidden>
                  <BodyMap primary={g?.primary ?? []} secondary={g?.secondary} compact />
                </span>
                <span className="biblio-info">
                  <b>{e.name}</b>
                  <small>
                    {e.muscle} · {e.equipment}
                  </small>
                </span>
                <IconChevronRight />
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="biblio-empty">
            Não achei esse. Tenta o nome do aparelho, ou toca num grupo muscular ali em cima.
          </li>
        )}
      </ul>
    </div>
  );
}
