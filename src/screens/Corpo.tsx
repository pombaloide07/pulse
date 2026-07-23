import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { latestWeight, readLoop, sortedWeights } from "../lib/nutrition";
import { formatShort, todayISO } from "../lib/dates";
import { fmtDec1 as fmtKg } from "../lib/format";
import type { WeightEntry } from "../lib/types";
import { LineChart } from "../components/charts";
import { BigButton, Chip, ConfirmSheet, Sheet } from "../components/ui";
import {
  IconCheck,
  IconChevronRight,
  IconMinus,
  IconPlus,
  IconUp,
} from "../components/icons";
import "./corpo.css";

export function Corpo() {
  const { state, dispatch } = useStore();
  const weights = useMemo(() => sortedWeights(state), [state]);
  const current = latestWeight(state) ?? 75;
  const loggedToday = weights.some((w) => w.date === todayISO());
  const [editing, setEditing] = useState<WeightEntry | null>(null);

  const [kg, setKg] = useState(current);
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);

  // se a hidratação (login/sync) trouxer o peso real depois do primeiro
  // render, acompanha — senão um toque registraria o default de 75kg
  useEffect(() => {
    if (!touched) setKg(current);
  }, [current, touched]);

  const bump = (delta: number) => {
    setTouched(true);
    setKg((k) => Math.min(300, Math.max(30, +(k + delta).toFixed(1))));
  };

  const loop = useMemo(() => readLoop(state), [state]);

  const register = () => {
    // todayISO() na hora do clique — a data do render fica velha se o app
    // passa da meia-noite aberto
    dispatch({ type: "LOG_WEIGHT", date: todayISO(), kg: +kg.toFixed(1) });
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
                {fmtKg(loop.protPerKg)} g/kg prot
              </Chip>
            )}
          </div>
        </section>
      )}

      <section className="card peso-card rise">
        <p className="eyebrow">Peso de hoje</p>
        <div className="peso-ctrl">
          <button onClick={() => bump(-0.1)} aria-label="Menos 100g">
            <IconMinus size={19} />
          </button>
          <span className="peso-num serif-num">
            {fmtKg(kg)}
            <small>kg</small>
          </span>
          <button onClick={() => bump(0.1)} aria-label="Mais 100g">
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

      {weights.length > 0 && (
        <section className="card peso-hist rise">
          <header className="prog-chart-head">
            <div>
              <h2>Registros</h2>
              <p>toque pra corrigir ou apagar</p>
            </div>
          </header>
          <ul>
            {[...weights]
              .reverse()
              .slice(0, 10)
              .map((w) => (
                <li key={w.date}>
                  <button onClick={() => setEditing(w)}>
                    <span>{w.date === todayISO() ? "hoje" : formatShort(w.date)}</span>
                    <b className="serif-num">
                      {fmtKg(w.kg)}
                      <small>kg</small>
                    </b>
                    <IconChevronRight />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      <p className="corpo-privacy rise">
        Seu peso é privado por padrão — o grupo vê presença e carga, nunca isto aqui.
      </p>

      {editing && (
        <WeightEditSheet
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(date, value) => {
            dispatch({ type: "LOG_WEIGHT", date, kg: value });
            setEditing(null);
          }}
          onDelete={(date) => {
            dispatch({ type: "REMOVE_WEIGHT", date });
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}

/* ————— corrigir um peso registrado ————— */

function WeightEditSheet({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: WeightEntry;
  onClose: () => void;
  onSave: (date: string, kg: number) => void;
  onDelete: (date: string) => void;
}) {
  const [kg, setKg] = useState(entry.kg);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bump = (delta: number) => setKg((k) => Math.min(300, Math.max(30, +(k + delta).toFixed(1))));

  if (confirmDelete) {
    return (
      <ConfirmSheet
        title={`Apagar o peso de ${formatShort(entry.date)}?`}
        text="Some da linha do tempo e da leitura do loop. Sem drama: dá pra registrar de novo."
        confirmLabel="Apagar registro"
        onConfirm={() => onDelete(entry.date)}
        onClose={() => setConfirmDelete(false)}
      />
    );
  }

  return (
    <Sheet title={formatShort(entry.date)} onClose={onClose}>
      <div className="peso-ctrl">
        <button onClick={() => bump(-0.1)} aria-label="Menos 100g">
          <IconMinus size={19} />
        </button>
        <span className="peso-num serif-num">
          {fmtKg(kg)}
          <small>kg</small>
        </span>
        <button onClick={() => bump(0.1)} aria-label="Mais 100g">
          <IconPlus size={19} stroke={2} />
        </button>
      </div>
      <BigButton onClick={() => onSave(entry.date, kg)} tone="pulse">
        Salvar correção
      </BigButton>
      <button className="editor-delete" onClick={() => setConfirmDelete(true)}>
        Apagar registro
      </button>
    </Sheet>
  );
}
