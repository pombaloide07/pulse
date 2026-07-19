import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { FOODS, FOOD_GROUPS } from "../lib/foods";
import type { Food, MealEntry } from "../lib/types";
import {
  dayEntries,
  dayTotals,
  dishMacros,
  dishGrams,
  foodMacros,
  periodAvg,
  dailySeries,
  latestWeight,
} from "../lib/nutrition";
import { addDays, formatLong, fromISO, toISO, todayISO } from "../lib/dates";
import { DailyBars } from "../components/charts";
import { IconChevronRight, IconMinus, IconPlus, IconX } from "../components/icons";
import { BigButton } from "../components/ui";
import "./dieta.css";

const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const hhmm = (min: number) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

let entrySeq = 0;
const newId = () => `m-${Date.now()}-${entrySeq++}`;

export function Dieta() {
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const today = todayISO();
  const entries = useMemo(() => dayEntries(state, today), [state, today]);
  const totals = useMemo(() => dayTotals(state, today), [state, today]);
  const t = state.profile.targets;
  const hide = state.profile.hideNumbers;

  const avg7 = useMemo(() => periodAvg(state, 7), [state]);
  const avg28 = useMemo(() => periodAvg(state, 28), [state]);
  const kg = latestWeight(state);
  const series = useMemo(
    () => dailySeries(state, 14, hide ? "prot" : "kcal"),
    [state, hide]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  };

  const logDish = (dishId: string) => {
    const dish = state.dishes.find((d) => d.id === dishId);
    if (!dish) return;
    const m = dishMacros(dish);
    dispatch({
      type: "LOG_MEALS",
      entries: [
        {
          id: newId(),
          date: today,
          minutes: nowMinutes(),
          name: dish.name,
          grams: dishGrams(dish),
          macros: m,
          source: { kind: "dish", id: dish.id },
        },
      ],
    });
    showToast(`${dish.icon} ${dish.name} — registrado`);
  };

  const yesterdayEntries = useMemo(() => {
    const y = toISO(addDays(fromISO(today), -1));
    return dayEntries(state, y);
  }, [state, today]);

  const repeatYesterday = () => {
    if (!yesterdayEntries.length) return;
    dispatch({
      type: "LOG_MEALS",
      entries: yesterdayEntries.map((e) => ({
        ...e,
        id: newId(),
        date: today,
      })),
    });
    showToast(`Ontem repetido — ${yesterdayEntries.length} registros`);
  };

  const protPct = Math.min(1, t.prot > 0 ? totals.prot / t.prot : 0);
  const kcalPct = Math.min(1, t.kcal > 0 ? totals.kcal / t.kcal : 0);

  return (
    <main className="screen dieta">
      <header className="dieta-head rise">
        <p className="eyebrow">{formatLong(new Date())}</p>
        <h1>Dieta</h1>
      </header>

      <section className="card dieta-hero rise">
        <div className="dh-prot">
          <span className="dh-num serif-num">
            {fmt(totals.prot)}
            <small>g</small>
          </span>
          <div className="dh-prot-info">
            <b>proteína</b>
            <span>meta {fmt(t.prot)}g — a métrica que importa</span>
          </div>
        </div>
        <div className="dh-bar">
          <span style={{ width: `${protPct * 100}%` }} />
        </div>

        {!hide && (
          <>
            <div className="dh-kcal">
              <span>
                <b className="serif-num">{fmt(totals.kcal)}</b> de {fmt(t.kcal)} kcal
              </span>
              <span className="dh-macros">
                carb {fmt(totals.carb)}g · gord {fmt(totals.fat)}g
              </span>
            </div>
            <div className="dh-bar dh-bar-kcal">
              <span style={{ width: `${kcalPct * 100}%` }} />
            </div>
          </>
        )}
        {hide && (
          <p className="dh-hidden-note">
            Modo só proteína ativo — os outros números ficam guardados.
          </p>
        )}
      </section>

      <section className="rise">
        <p className="eyebrow dieta-label">Registrar em um toque</p>
        <div className="dish-row">
          {state.dishes.map((d) => {
            const m = dishMacros(d);
            return (
              <button key={d.id} className="card dish-card" onClick={() => logDish(d.id)}>
                <span className="dish-icon">{d.icon}</span>
                <b>{d.name}</b>
                <small>
                  {fmt(m.prot)}g prot{!hide && ` · ${fmt(m.kcal)} kcal`}
                </small>
              </button>
            );
          })}
        </div>
        <div className="dieta-quick">
          <button
            className="dq-pill"
            onClick={repeatYesterday}
            disabled={yesterdayEntries.length === 0}
          >
            ↺ Repetir ontem
          </button>
          <button className="dq-pill" onClick={() => setSearching(true)}>
            Buscar alimento
          </button>
        </div>
      </section>

      <section className="card dieta-today rise">
        <p className="eyebrow">Refeições de hoje</p>
        {entries.length === 0 ? (
          <p className="dieta-empty">
            Nada ainda. Um toque num prato ali em cima resolve — registrar não pode ser
            mais difícil que comer.
          </p>
        ) : (
          <ul>
            {entries.map((e) => (
              <li key={e.id}>
                <span className="de-time serif-num">{hhmm(e.minutes)}</span>
                <div className="de-info">
                  <b>{e.name}</b>
                  <small>
                    {fmt(e.macros.prot)}g prot{!hide && ` · ${fmt(e.macros.kcal)} kcal`}
                  </small>
                </div>
                <button
                  className="de-x"
                  aria-label={`Remover ${e.name}`}
                  onClick={() => dispatch({ type: "REMOVE_MEAL", id: e.id })}
                >
                  <IconX size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card dieta-track rise">
        <p className="eyebrow">O padrão, não o dia</p>
        <div className="dt-tiles">
          <div className="dt-tile">
            <b className="serif-num">
              {hide ? `${fmt(avg7.prot)}g` : fmt(avg7.kcal)}
            </b>
            <small>{hide ? "prot média 7 dias" : "kcal média 7 dias"}</small>
          </div>
          <div className="dt-tile">
            <b className="serif-num">
              {hide ? `${fmt(avg28.prot)}g` : fmt(avg28.kcal)}
            </b>
            <small>{hide ? "prot média 4 semanas" : "kcal média 4 semanas"}</small>
          </div>
          <div className="dt-tile">
            <b className="serif-num">
              {kg && avg28.prot ? (avg28.prot / kg).toFixed(1).replace(".", ",") : "—"}
            </b>
            <small>g de prot por kg</small>
          </div>
        </div>
        <DailyBars
          data={series}
          target={hide ? t.prot : t.kcal}
          unit={hide ? "g" : " kcal"}
        />
        <p className="dieta-note">
          Um dia não significa nada; o padrão de 4 semanas significa tudo.
        </p>
      </section>

      <div className="dieta-links rise">
        <button className="card dieta-link" onClick={() => navigate("/dieta/pratos")}>
          <span>🍱</span>
          <div>
            <b>Meus pratos</b>
            <small>a marmita definida uma vez, registrada pra sempre</small>
          </div>
          <IconChevronRight />
        </button>
        <button className="card dieta-link" onClick={() => navigate("/dieta/metas")}>
          <span>🎯</span>
          <div>
            <b>Metas & calculadora</b>
            <small>bulking, cutting ou manutenção — do seu jeito</small>
          </div>
          <IconChevronRight />
        </button>
      </div>

      {searching && (
        <FoodSearchSheet
          onClose={() => setSearching(false)}
          onAdd={(food, grams) => {
            dispatch({
              type: "LOG_MEALS",
              entries: [
                {
                  id: newId(),
                  date: today,
                  minutes: nowMinutes(),
                  name: food.name,
                  grams,
                  macros: foodMacros(food, grams),
                  source: { kind: "food", id: food.id },
                },
              ],
            });
            setSearching(false);
            showToast(`${food.name} — registrado`);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

/* ————— busca de alimento (usada também no editor de pratos) ————— */

export function FoodSearchSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (food: Food, grams: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("");
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOODS.filter(
      (f) =>
        (!group || f.group === group) &&
        (!q || f.name.toLowerCase().includes(q))
    );
  }, [query, group]);

  const pick = (f: Food) => {
    setPicked(f);
    setGrams(f.unitGrams ?? 100);
  };

  const step = picked?.unitGrams && picked.unitGrams <= 50 ? picked.unitGrams : 25;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet picker" onClick={(e) => e.stopPropagation()}>
        {!picked ? (
          <>
            <header className="picker-head">
              <h2>Buscar alimento</h2>
              <button onClick={onClose} aria-label="Fechar">
                <IconX />
              </button>
            </header>
            <input
              className="food-search"
              placeholder="frango, arroz, pão de queijo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="picker-filters">
              <button className={`pf ${group === "" ? "pf-on" : ""}`} onClick={() => setGroup("")}>
                Todos
              </button>
              {FOOD_GROUPS.map((g) => (
                <button
                  key={g}
                  className={`pf ${group === g ? "pf-on" : ""}`}
                  onClick={() => setGroup(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <ul className="picker-list">
              {results.map((f) => (
                <li key={f.id}>
                  <button onClick={() => pick(f)}>
                    <span>
                      <b>{f.name}</b>
                      <small>
                        {Math.round(f.per100.kcal)} kcal · {f.per100.prot.toFixed(1).replace(".", ",")}g
                        prot /100g{f.unitName && ` · ${f.unitName} ≈ ${f.unitGrams}g`}
                      </small>
                    </span>
                    <IconPlus size={18} />
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="picker-empty">
                  Não achei. Monte como um prato seu em "Meus pratos".
                </li>
              )}
            </ul>
          </>
        ) : (
          <>
            <header className="picker-head">
              <h2>{picked.name}</h2>
              <button onClick={() => setPicked(null)} aria-label="Voltar">
                <IconX />
              </button>
            </header>
            <div className="food-qty">
              <button onClick={() => setGrams(Math.max(5, grams - step))} aria-label="Menos">
                <IconMinus size={18} />
              </button>
              <span>
                <b className="serif-num">{grams}</b>
                <small>g</small>
              </span>
              <button onClick={() => setGrams(grams + step)} aria-label="Mais">
                <IconPlus size={18} stroke={2} />
              </button>
            </div>
            {picked.unitName && (
              <p className="food-hint">
                {picked.unitName} ≈ {picked.unitGrams}g
              </p>
            )}
            <p className="food-macros">
              {fmt(foodMacros(picked, grams).kcal)} kcal ·{" "}
              {fmt(foodMacros(picked, grams).prot)}g prot ·{" "}
              {fmt(foodMacros(picked, grams).carb)}g carb ·{" "}
              {fmt(foodMacros(picked, grams).fat)}g gord
            </p>
            <BigButton onClick={() => onAdd(picked, grams)} tone="pulse">
              Adicionar
            </BigButton>
          </>
        )}
      </div>
    </div>
  );
}
