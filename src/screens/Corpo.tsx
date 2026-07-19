import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { latestWeight, readLoop, sortedWeights } from "../lib/nutrition";
import { todayISO } from "../lib/dates";
import { LineChart } from "../components/charts";
import { Chip } from "../components/ui";
import { IconCheck, IconMinus, IconPlus, IconUp } from "../components/icons";
import "./corpo.css";

const fmtKg = (n: number) => n.toFixed(1).replace(".", ",");

export function Corpo() {
  const { state, dispatch } = useStore();
  const today = todayISO();
  const weights = useMemo(() => sortedWeights(state), [state]);
  const current = latestWeight(state) ?? 75;
  const loggedToday = weights.some((w) => w.date === today);

  const [kg, setKg] = useState(current);
  const [saved, setSaved] = useState(false);

  const loop = useMemo(() => readLoop(state), [state]);

  const register = () => {
    dispatch({ type: "LOG_WEIGHT", date: today, kg: +kg.toFixed(1) });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <main className="screen corpo">
      <header className="corpo-head rise">
        <p className="eyebrow">Treino + comida + peso, lidos juntos</p>
        <h1>Corpo</h1>
      </header>

      {loop && (
        <section className="card loop-card rise">
          <p className="eyebrow">A leitura do loop · 4 semanas</p>
          <p className="loop-story">{loop.story}</p>
          <p className="loop-verdict">{loop.verdict}</p>
          <div className="loop-chips">
            {loop.weightDelta !== null && (
              <Chip tone={loop.weightDelta >= 0 ? "mata" : "neutral"}>
                {loop.weightDelta >= 0 ? "+" : "−"}
                {fmtKg(Math.abs(loop.weightDelta))}kg
              </Chip>
            )}
            {loop.volumePct !== null && (
              <Chip tone={loop.volumePct >= 0 ? "mata" : "neutral"}>
                <IconUp size={12} /> carga {loop.volumePct >= 0 ? "+" : ""}
                {loop.volumePct}%
              </Chip>
            )}
            {loop.protPerKg !== null && (
              <Chip tone={loop.protPerKg >= 1.6 ? "ambar" : "neutral"}>
                {loop.protPerKg.toFixed(1).replace(".", ",")} g/kg prot
              </Chip>
            )}
          </div>
        </section>
      )}

      <section className="card peso-card rise">
        <p className="eyebrow">Peso de hoje</p>
        <div className="peso-ctrl">
          <button onClick={() => setKg(+(kg - 0.1).toFixed(1))} aria-label="Menos 100g">
            <IconMinus size={19} />
          </button>
          <span className="peso-num serif-num">
            {fmtKg(kg)}
            <small>kg</small>
          </span>
          <button onClick={() => setKg(+(kg + 0.1).toFixed(1))} aria-label="Mais 100g">
            <IconPlus size={19} stroke={2} />
          </button>
        </div>
        <button className={`peso-save ${saved ? "peso-saved" : ""}`} onClick={register}>
          {saved ? (
            <>
              <IconCheck size={17} stroke={3} /> registrado
            </>
          ) : loggedToday ? (
            "Atualizar o de hoje"
          ) : (
            "Registrar"
          )}
        </button>
        <p className="peso-note">Sem drama: é um número, não um veredito.</p>
      </section>

      <section className="card corpo-chart rise">
        <header className="prog-chart-head">
          <div>
            <h2>Peso ao longo do tempo</h2>
            <p>a média de semanas importa; o dia é ruído</p>
          </div>
        </header>
        <LineChart
          points={weights.map((w) => ({ date: w.date, value: w.kg }))}
          unit="kg"
          decimals={1}
          color="var(--chart-mata)"
          emptyText="Registre o primeiro peso pra desenhar a linha."
        />
      </section>

      <p className="corpo-privacy rise">
        Seu peso é privado por padrão — o grupo vê presença e carga, nunca isto aqui.
      </p>
    </main>
  );
}
