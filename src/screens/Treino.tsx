import { useSearchParams } from "react-router-dom";
import { PlanoSection } from "./Plano";
import { ProgressoSection } from "./Progresso";
import "./treino.css";

export function Treino() {
  const [params, setParams] = useSearchParams();
  const seg = params.get("seg") === "progressao" ? "progressao" : "plano";

  return (
    <main className="screen treino-hub">
      <header className="th-head rise">
        <p className="eyebrow">{seg === "plano" ? "Seu split" : "A prova de que está construindo"}</p>
        <h1>Treino</h1>
      </header>

      <div className="th-seg rise" role="tablist" aria-label="Seção do treino">
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
      </div>

      {seg === "plano" ? <PlanoSection /> : <ProgressoSection />}
    </main>
  );
}
