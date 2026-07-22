import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import {
  defaultTargets,
  gastoTotal,
  kcalFloor,
  latestWeight,
  tmb,
} from "../lib/nutrition";
import type { Goal } from "../lib/types";
import { fmtDec1, fmtInt as fmt } from "../lib/format";
import { Field } from "./PlanoEditor";
import { IconBack } from "../components/icons";
import { BigButton } from "../components/ui";
import "./planoeditor.css";
import "./dietametas.css";

const ACTIVITIES = [
  { v: 1.2, label: "Sedentário" },
  { v: 1.375, label: "Leve" },
  { v: 1.55, label: "Moderado" },
  { v: 1.725, label: "Intenso" },
  { v: 1.9, label: "Atleta" },
];

const GOALS: { v: Goal; label: string; note: string }[] = [
  { v: "cut", label: "Cutting", note: "déficit de ~500 kcal — devagar, protegendo músculo" },
  { v: "maint", label: "Manutenção", note: "comer o que gasta" },
  {
    v: "bulk",
    label: "Bulking",
    note: "superávit moderado (~300 kcal) — agressivo demais vira barriguinha, não músculo",
  },
];

export function DietaMetas() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const p = state.profile;
  const kg = latestWeight(state) ?? 75;

  const basal = tmb(p, kg);
  const get = gastoTotal(p, kg);
  const floor = kcalFloor(p, kg);
  const goalInfo = GOALS.find((g) => g.v === p.goal)!;

  const patch = (changes: Partial<typeof p>) => dispatch({ type: "SET_PROFILE", patch: changes });
  const patchTargets = (changes: Partial<typeof p.targets>) =>
    patch({ targets: { ...p.targets, ...changes } });

  return (
    <main className="screen metas">
      <header className="editor-head">
        <button className="editor-back" onClick={() => navigate("/dieta")} aria-label="Voltar">
          <IconBack />
        </button>
        <div>
          <p className="eyebrow">Dieta</p>
          <h1 className="metas-title">Metas & calculadora</h1>
        </div>
      </header>

      <section className="card metas-card">
        <p className="eyebrow">Seu perfil</p>
        <div className="metas-seg">
          {(["M", "F"] as const).map((s) => (
            <button
              key={s}
              className={p.sex === s ? "on" : ""}
              onClick={() => patch({ sex: s })}
            >
              {s === "M" ? "Masculino" : "Feminino"}
            </button>
          ))}
        </div>
        <div className="editor-fields">
          <Field
            label="idade"
            value={p.age}
            onDec={() => patch({ age: Math.max(14, p.age - 1) })}
            onInc={() => patch({ age: Math.min(90, p.age + 1) })}
          />
          <Field
            label="altura cm"
            value={p.heightCm}
            onDec={() => patch({ heightCm: Math.max(120, p.heightCm - 1) })}
            onInc={() => patch({ heightCm: Math.min(220, p.heightCm + 1) })}
          />
          <div className="field">
            <span className="field-label">peso kg</span>
            <button className="metas-weight" onClick={() => navigate("/corpo")}>
              <b className="serif-num">{fmtDec1(kg)}</b>
              <small>no Corpo</small>
            </button>
          </div>
        </div>
        <div className="metas-activity">
          {ACTIVITIES.map((a) => (
            <button
              key={a.v}
              className={`pf ${p.activity === a.v ? "pf-on" : ""}`}
              onClick={() => patch({ activity: a.v })}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="metas-tmb">
          <div>
            <b className="serif-num">{fmt(basal)}</b>
            <small>TMB estimada (kcal)</small>
          </div>
          <div>
            <b className="serif-num">{fmt(get)}</b>
            <small>gasto diário estimado</small>
          </div>
        </div>
      </section>

      <section className="card metas-card">
        <p className="eyebrow">Objetivo</p>
        <div className="metas-seg metas-seg-3">
          {GOALS.map((g) => (
            <button
              key={g.v}
              className={p.goal === g.v ? "on" : ""}
              onClick={() => patch({ goal: g.v })}
            >
              {g.label}
            </button>
          ))}
        </div>
        <p className="metas-goal-note">{goalInfo.note}</p>
      </section>

      <section className="card metas-card">
        <div className="metas-target-head">
          <p className="eyebrow">Suas metas</p>
          <button
            className="metas-recalc"
            onClick={() => patch({ targets: defaultTargets(p, kg) })}
          >
            recalcular sugestão
          </button>
        </div>
        <div className="metas-kcal-field">
          <Field
            label="kcal por dia"
            value={fmt(p.targets.kcal)}
            onDec={() => patchTargets({ kcal: Math.max(800, p.targets.kcal - 50) })}
            onInc={() => patchTargets({ kcal: p.targets.kcal + 50 })}
          />
        </div>
        <div className="editor-fields">
          <Field
            label="proteína g"
            value={p.targets.prot}
            onDec={() => patchTargets({ prot: Math.max(40, p.targets.prot - 5) })}
            onInc={() => patchTargets({ prot: p.targets.prot + 5 })}
          />
          <Field
            label="carbo g"
            value={p.targets.carb}
            onDec={() => patchTargets({ carb: Math.max(0, p.targets.carb - 5) })}
            onInc={() => patchTargets({ carb: p.targets.carb + 5 })}
          />
          <Field
            label="gordura g"
            value={p.targets.fat}
            onDec={() => patchTargets({ fat: Math.max(20, p.targets.fat - 5) })}
            onInc={() => patchTargets({ fat: p.targets.fat + 5 })}
          />
        </div>
        {p.targets.kcal < floor && (
          <p className="metas-floor">
            Sua meta está abaixo do piso razoável pra você (~{fmt(floor)} kcal). O app não
            impede — mas avisa: menos que isso costuma custar músculo, treino e humor.
          </p>
        )}
      </section>

      <section className="card metas-card">
        <div className="metas-hide">
          <div>
            <b>Modo só proteína</b>
            <small>esconde kcal e macros — sobra proteína e presença (§ saúde)</small>
          </div>
          <button
            className={`switch ${p.hideNumbers ? "switch-on" : ""}`}
            role="switch"
            aria-checked={p.hideNumbers}
            onClick={() => patch({ hideNumbers: !p.hideNumbers })}
          >
            <span />
          </button>
        </div>
      </section>

      <p className="metas-disclaimer">
        TMB e gasto são estimativas (Mifflin-St Jeor) com margem de erro real por pessoa.
        O Pulse calcula e mostra — não prescreve. Pra dieta de verdade, nutricionista.
      </p>

      <BigButton onClick={() => navigate("/dieta")} tone="ink">
        Pronto
      </BigButton>
    </main>
  );
}
