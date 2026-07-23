import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MUSCLE_GROUPS, searchExercises } from "../lib/exercises";
import { IconPlus } from "./icons";
import { Sheet } from "./ui";

/**
 * Escolher exercício — o mesmo sheet no editor de plano e no meio do treino.
 * Busca por nome, grupo ou aparelho, e cada linha tem atalho pra ficha.
 */
export function ExercisePickerSheet({
  title,
  excludeIds,
  replacingName,
  onPick,
  onClose,
}: {
  title: string;
  /** exercícios que já estão na lista de destino */
  excludeIds: Set<string>;
  /** nome do exercício que vai ser substituído, quando for uma troca */
  replacingName?: string;
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");

  const results = useMemo(
    () => searchExercises(query, muscle).filter((e) => !excludeIds.has(e.id)),
    [query, muscle, excludeIds]
  );

  return (
    <Sheet title={title} onClose={onClose} className="picker">
      {replacingName && (
        <p className="pk-replacing">
          Entra no lugar de <b>{replacingName}</b> — as séries começam do zero.
        </p>
      )}
      <input
        className="food-search"
        placeholder="agachamento, polia, costas…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="picker-filters">
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
      <ul className="picker-list">
        {results.map((e) => (
          <li key={e.id} className="pk-row">
            <button onClick={() => onPick(e.id)}>
              <span>
                <b>{e.name}</b>
                <small>
                  {e.muscle} · {e.equipment}
                </small>
              </span>
              <IconPlus size={18} />
            </button>
            <button
              className="pk-info"
              aria-label={`Como se faz ${e.name}`}
              onClick={() => navigate(`/exercicio/${e.id}`)}
            >
              ?
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="picker-empty">
            Não achei esse. Tenta outro nome (o aparelho, por exemplo) ou procura pelo grupo
            muscular.
          </li>
        )}
      </ul>
    </Sheet>
  );
}
