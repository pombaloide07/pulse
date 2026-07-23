import { Suspense, lazy, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlanoSection } from "./Plano";
import { ProgressoSection } from "./Progresso";
import { QuickLogSheet } from "../components/QuickLog";
import { IconPlus } from "../components/icons";
import "./treino.css";

/* a biblioteca carrega as 75 fichas — não pode pesar na abertura do app,
   que quase sempre é pra ver o treino de hoje */
const ExerciciosSection = lazy(() =>
  import("./Exercicios").then((m) => ({ default: m.ExerciciosSection }))
);

const EYEBROW: Record<string, string> = {
  plano: "Seu split",
  progressao: "A prova de que está construindo",
  exercicios: "Como se faz, e o que trabalha",
};

export function Treino() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("seg");
  const seg = raw === "progressao" || raw === "exercicios" ? raw : "plano";
  const [quickLog, setQuickLog] = useState(false);

  return (
    <main className="screen treino-hub">
      <header className="th-head rise">
        <div>
          <p className="eyebrow">{EYEBROW[seg]}</p>
          <h1>Treino</h1>
        </div>
        <button className="th-quicklog" onClick={() => setQuickLog(true)}>
          <IconPlus size={15} stroke={2.4} />
          Lançar treino
        </button>
      </header>

      <div className="th-seg th-seg-3 rise" role="tablist" aria-label="Seção do treino">
        <button
          role="tab"
          aria-selected={seg === "plano"}
          className={seg === "plano" ? "th-seg-on" : ""}
          onClick={() => setParams({}, { replace: true })}
        >
          Plano
        </button>
        <button
          role="tab"
          aria-selected={seg === "progressao"}
          className={seg === "progressao" ? "th-seg-on" : ""}
          onClick={() => setParams({ seg: "progressao" }, { replace: true })}
        >
          Progressão
        </button>
        <button
          role="tab"
          aria-selected={seg === "exercicios"}
          className={seg === "exercicios" ? "th-seg-on" : ""}
          onClick={() => setParams({ seg: "exercicios" }, { replace: true })}
        >
          Exercícios
        </button>
      </div>

      {seg === "plano" && <PlanoSection />}
      {seg === "progressao" && <ProgressoSection />}
      {seg === "exercicios" && (
        <Suspense fallback={<p className="th-loading">Abrindo a biblioteca…</p>}>
          <ExerciciosSection />
        </Suspense>
      )}

      {quickLog && <QuickLogSheet onClose={() => setQuickLog(false)} />}
    </main>
  );
}
