import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlanoSection } from "./Plano";
import { ProgressoSection } from "./Progresso";
import { QuickLogSheet } from "../components/QuickLog";
import { IconPlus } from "../components/icons";
import "./treino.css";

export function Treino() {
  const [params, setParams] = useSearchParams();
  const seg = params.get("seg") === "progressao" ? "progressao" : "plano";
  const [quickLog, setQuickLog] = useState(false);

  return (
    <main className="screen treino-hub">
      <header className="th-head rise">
        <div>
          <p className="eyebrow">{seg === "plano" ? "Seu split" : "A prova de que está construindo"}</p>
          <h1>Treino</h1>
        </div>
        <button className="th-quicklog" onClick={() => setQuickLog(true)}>
          <IconPlus size={15} stroke={2.4} />
          Lançar treino
        </button>
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

      {quickLog && <QuickLogSheet onClose={() => setQuickLog(false)} />}
    </main>
  );
}
