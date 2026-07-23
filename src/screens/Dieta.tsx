import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { FOOD_BY_ID, FOOD_GROUPS, searchLocalFoods } from "../lib/foods";
import { Portal } from "../components/Portal";
import type { Food, MealEntry } from "../lib/types";
import {
  dayEntries,
  dayTotals,
  dishMacros,
  dishGrams,
  foodMacros,
  gramsStep,
  periodAvg,
  dailySeries,
  latestWeight,
  rescaleMeal,
} from "../lib/nutrition";
import { fmtDec1, fmtInt as fmt } from "../lib/format";
import { addDays, formatLong, formatShort, fromISO, toISO, todayISO } from "../lib/dates";
import { DailyBars } from "../components/charts";
import { IconChevronRight, IconMinus, IconPlus, IconX } from "../components/icons";
import { BigButton, ConfirmSheet, Sheet } from "../components/ui";
import { Field } from "./PlanoEditor";
import "./dieta.css";

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
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const today = todayISO();
  // o dia que a lista de refeições está mostrando — hero e médias são sempre de hoje
  const [day, setDay] = useState(today);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const entries = useMemo(() => dayEntries(state, day), [state, day]);
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

  /**
   * Onde o lançamento cai: no dia que a lista está mostrando. Em dia passado
   * entra ao meio-dia, do mesmo jeito que o lançamento rápido de treino faz.
   * todayISO() na hora do toque — a data do render envelhece se o app
   * atravessa a meia-noite aberto.
   */
  const logSlot = () => {
    const now = todayISO();
    return day === now
      ? { date: now, minutes: nowMinutes() }
      : { date: day, minutes: 12 * 60 };
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
          ...logSlot(),
          name: dish.name,
          grams: dishGrams(dish),
          macros: m,
          source: { kind: "dish", id: dish.id },
        },
      ],
    });
    showToast(`${dish.icon} ${dish.name} — registrado`);
  };

  // hoje + 6 dias pra trás: cobre "esqueci de lançar" sem virar calendário
  const dayStrip = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toISO(addDays(fromISO(today), -i))),
    [today]
  );

  const yesterdayEntries = useMemo(() => {
    const y = toISO(addDays(fromISO(today), -1));
    return dayEntries(state, y);
  }, [state, today]);

  const repeatYesterday = () => {
    const now = todayISO();
    const source = dayEntries(state, toISO(addDays(fromISO(now), -1)));
    if (!source.length) return;
    dispatch({
      type: "LOG_MEALS",
      entries: source.map((e) => ({
        ...e,
        id: newId(),
        date: now,
      })),
    });
    showToast(`Ontem repetido — ${source.length} registros`);
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
        <p className="eyebrow">
          {day === today ? "Refeições de hoje" : `Refeições de ${formatShort(day)}`}
        </p>
        <div className="picker-filters dieta-days">
          {dayStrip.map((iso, i) => (
            <button
              key={iso}
              className={`pf ${day === iso ? "pf-on" : ""}`}
              onClick={() => setDay(iso)}
            >
              {i === 0 ? "hoje" : i === 1 ? "ontem" : formatShort(iso)}
            </button>
          ))}
        </div>
        {entries.length === 0 ? (
          <p className="dieta-empty">
            {day === today
              ? "Nada ainda. Um toque num prato ali em cima resolve — registrar não pode ser mais difícil que comer."
              : "Nada registrado nesse dia. Dá pra lançar agora: os pratos ali em cima entram nele."}
          </p>
        ) : (
          <ul>
            {entries.map((e) => (
              <li key={e.id}>
                <span className="de-time serif-num">{hhmm(e.minutes)}</span>
                <button className="de-info" onClick={() => setEditing(e)}>
                  <b>{e.name}</b>
                  <small>
                    {fmt(e.macros.prot)}g prot{!hide && ` · ${fmt(e.macros.kcal)} kcal`}
                  </small>
                </button>
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
        {entries.length > 0 && (
          <p className="dieta-edit-hint">Errou a quantidade ou a hora? Toque no lançamento.</p>
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
              {kg && avg28.prot ? fmtDec1(avg28.prot / kg) : "—"}
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
                  ...logSlot(),
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

      {editing && (
        <MealEditSheet
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(entry) => {
            dispatch({ type: "UPDATE_MEAL", entry });
            setEditing(null);
            showToast(`${entry.name} — corrigido`);
          }}
          onDelete={(id) => {
            dispatch({ type: "REMOVE_MEAL", id });
            setEditing(null);
          }}
        />
      )}

      {toast && (
        <Portal>
          <div className="toast">{toast}</div>
        </Portal>
      )}
    </main>
  );
}

/* ————— corrigir um lançamento (quantidade, hora, dia) ————— */

function MealEditSheet({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: MealEntry;
  onClose: () => void;
  onSave: (entry: MealEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [grams, setGrams] = useState(entry.grams);
  const [minutes, setMinutes] = useState(entry.minutes);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // o degrau segue a porção do alimento quando ele existe na base local
  const food = entry.source?.kind === "food" ? FOOD_BY_ID[entry.source.id] : undefined;
  const step = food ? gramsStep(food, 25) : 25;
  const macros = rescaleMeal({ ...entry }, grams);
  const bump = (delta: number) => setMinutes((m) => (m + delta + 1440) % 1440);

  if (confirmDelete) {
    return (
      <ConfirmSheet
        title={`Apagar ${entry.name}?`}
        text="Some do dia e das médias. Registrar de novo leva um toque."
        confirmLabel="Apagar lançamento"
        onConfirm={() => onDelete(entry.id)}
        onClose={() => setConfirmDelete(false)}
      />
    );
  }

  return (
    <Sheet title={entry.name} onClose={onClose}>
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

      <div className="meal-time">
        <Field label="hora" value={String(Math.floor(minutes / 60))} onDec={() => bump(-60)} onInc={() => bump(60)} />
        <Field
          label="minuto"
          value={String(minutes % 60).padStart(2, "0")}
          onDec={() => bump(-5)}
          onInc={() => bump(5)}
        />
      </div>

      <p className="food-macros">
        {fmt(macros.kcal)} kcal · {fmt(macros.prot)}g prot · {fmt(macros.carb)}g carb ·{" "}
        {fmt(macros.fat)}g gord
      </p>

      <BigButton onClick={() => onSave({ ...entry, grams, minutes, macros })} tone="pulse">
        Salvar correção
      </BigButton>
      <button className="editor-delete" onClick={() => setConfirmDelete(true)}>
        Apagar lançamento
      </button>
    </Sheet>
  );
}

/* ————— busca de alimento (usada também no editor de pratos) ————— */

const LOCAL_RESULT_CAP = 80;

/** Produtos embalados via Open Food Facts (instância BR, licença ODbL). */
async function searchOpenFoodFacts(query: string, signal: AbortSignal): Promise<Food[]> {
  const url =
    "https://br.openfoodfacts.org/cgi/search.pl?action=process&json=1&search_simple=1" +
    "&page_size=20&fields=code,product_name,product_name_pt,brands,nutriments" +
    "&search_terms=" +
    encodeURIComponent(query);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = await res.json();
  const out: Food[] = [];
  for (const p of data.products ?? []) {
    const n = p.nutriments ?? {};
    const kcal = n["energy-kcal_100g"];
    if (typeof kcal !== "number" || !isFinite(kcal)) continue;
    const name = (p.product_name_pt || p.product_name || "").trim();
    if (!name) continue;
    out.push({
      id: `off-${p.code}`,
      name: p.brands ? `${name} — ${String(p.brands).split(",")[0].trim()}` : name,
      group: "Da vida real",
      per100: {
        kcal: Math.round(kcal),
        prot: +(Number(n.proteins_100g) || 0).toFixed(1),
        carb: +(Number(n.carbohydrates_100g) || 0).toFixed(1),
        fat: +(Number(n.fat_100g) || 0).toFixed(1),
      },
    });
  }
  return out;
}

export function FoodSearchSheet({
  onClose,
  onAdd,
  localOnly = false,
}: {
  onClose: () => void;
  onAdd: (food: Food, grams: number) => void;
  /** editor de pratos: só base local (ingredientes precisam existir no app) */
  localOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("");
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [off, setOff] = useState<Food[] | null>(null);
  const [offBusy, setOffBusy] = useState(false);

  const results = useMemo(() => searchLocalFoods(query, group), [query, group]);
  const shown = results.slice(0, LOCAL_RESULT_CAP);

  /* produtos embalados: busca remota com debounce, cancelando a anterior */
  useEffect(() => {
    if (localOnly || query.trim().length < 3) {
      setOff(null);
      setOffBusy(false);
      return;
    }
    const ctrl = new AbortController();
    setOffBusy(true);
    const t = window.setTimeout(() => {
      searchOpenFoodFacts(query.trim(), ctrl.signal)
        .then((r) => {
          setOff(r);
          setOffBusy(false);
        })
        .catch((e) => {
          if (e?.name !== "AbortError") {
            setOff([]);
            setOffBusy(false);
          }
        });
    }, 500);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query, localOnly]);

  const pick = (f: Food) => {
    setPicked(f);
    setGrams(f.unitGrams ?? 100);
  };

  const step = picked ? gramsStep(picked, 25) : 25;

  return (
    <Sheet onClose={onClose} className="picker">
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
              {shown.map((f) => (
                <li key={f.id}>
                  <button onClick={() => pick(f)}>
                    <span>
                      <b>{f.name}</b>
                      <small>
                        {Math.round(f.per100.kcal)} kcal · {fmtDec1(f.per100.prot)}g
                        prot /100g{f.unitName && ` · ${f.unitName} ≈ ${f.unitGrams}g`}
                      </small>
                    </span>
                    <IconPlus size={18} />
                  </button>
                </li>
              ))}
              {results.length > LOCAL_RESULT_CAP && (
                <li className="picker-more">
                  + {results.length - LOCAL_RESULT_CAP} na base local — digite pra refinar
                </li>
              )}

              {!localOnly && (offBusy || (off && off.length > 0)) && (
                <li className="picker-section">
                  Produtos embalados · Open Food Facts{offBusy && " — buscando…"}
                </li>
              )}
              {!localOnly &&
                (off ?? []).map((f) => (
                  <li key={f.id}>
                    <button onClick={() => pick(f)}>
                      <span>
                        <b>{f.name}</b>
                        <small>
                          {Math.round(f.per100.kcal)} kcal · {fmtDec1(f.per100.prot)}g prot /100g
                        </small>
                      </span>
                      <IconPlus size={18} />
                    </button>
                  </li>
                ))}

              {results.length === 0 && !offBusy && (off?.length ?? 0) === 0 && (
                <li className="picker-empty">
                  Não achei. Monte como um prato seu em "Meus pratos".
                </li>
              )}
            </ul>
            <p className="picker-attrib">
              {localOnly
                ? "Base local: sua curadoria + TACO (NEPA/Unicamp)."
                : "Busca em ~640 alimentos brasileiros (TACO/NEPA-Unicamp) e milhões de produtos embalados (Open Food Facts, ODbL)."}
            </p>
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
    </Sheet>
  );
}
