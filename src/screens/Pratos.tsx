import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { dishMacros } from "../lib/nutrition";
import { IconBack, IconChevronRight, IconPlus } from "../components/icons";
import { BigButton } from "../components/ui";
import "./pratos.css";

const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

export function Pratos() {
  const { state } = useStore();
  const navigate = useNavigate();
  const hide = state.profile.hideNumbers;

  return (
    <main className="screen pratos">
      <header className="editor-head">
        <button className="editor-back" onClick={() => navigate("/dieta")} aria-label="Voltar">
          <IconBack />
        </button>
        <div>
          <p className="eyebrow">Dieta</p>
          <h1 className="pratos-title">Meus pratos</h1>
        </div>
      </header>

      <p className="pratos-sub">
        Define uma vez, registra em um toque pra sempre. Três pratos cobrem 80% da sua
        semana — marmita, shake e bandejão.
      </p>

      {state.dishes.map((d) => {
        const m = dishMacros(d);
        return (
          <button
            key={d.id}
            className="card prato-card"
            onClick={() => navigate(`/dieta/pratos/${d.id}`)}
          >
            <span className="prato-icon">{d.icon}</span>
            <div className="prato-info">
              <b>{d.name}</b>
              <small>
                {d.ingredients.length} ingredientes · {fmt(m.prot)}g prot
                {!hide && ` · ${fmt(m.kcal)} kcal`}
              </small>
            </div>
            <IconChevronRight />
          </button>
        );
      })}

      <BigButton onClick={() => navigate("/dieta/pratos/novo")} tone="ink">
        <IconPlus size={19} />
        Novo prato
      </BigButton>
    </main>
  );
}
