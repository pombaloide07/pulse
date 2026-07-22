import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { FOOD_BY_ID } from "../lib/foods";
import type { Dish } from "../lib/types";
import { dishMacros, foodMacros, gramsStep } from "../lib/nutrition";
import { fmtInt as fmt } from "../lib/format";
import { FoodSearchSheet } from "./Dieta";
import { IconBack, IconMinus, IconPlus, IconTrash } from "../components/icons";
import { BigButton, Sheet } from "../components/ui";
import "./pratoeditor.css";

const ICONS = ["🍱", "🥤", "🍽️", "🍳", "🥗", "🍝", "🥪", "🍚"];

export function PratoEditor() {
  const { dishId } = useParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const isNew = dishId === "novo";
  const existing = isNew ? null : state.dishes.find((d) => d.id === dishId);

  const [draft, setDraft] = useState<Dish>(
    existing ?? { id: `d-${Date.now()}`, name: "", icon: "🍱", ingredients: [] }
  );
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isNew && !existing) {
    return (
      <main className="screen">
        <p>Prato não encontrado.</p>
      </main>
    );
  }

  const m = dishMacros(draft);
  const canSave = draft.name.trim().length > 0 && draft.ingredients.length > 0;

  const save = () => {
    dispatch(isNew ? { type: "ADD_DISH", dish: draft } : { type: "UPDATE_DISH", dish: draft });
    navigate("/dieta/pratos");
  };

  const setGrams = (foodId: string, grams: number) => {
    setDraft({
      ...draft,
      ingredients: draft.ingredients.map((i) =>
        i.foodId === foodId ? { ...i, grams: Math.max(5, grams) } : i
      ),
    });
  };

  return (
    <main className="screen prato-editor">
      <header className="editor-head">
        <button
          className="editor-back"
          onClick={() => navigate("/dieta/pratos")}
          aria-label="Voltar"
        >
          <IconBack />
        </button>
        <div>
          <p className="eyebrow">{isNew ? "Novo prato" : "Editar prato"}</p>
          <input
            className="editor-name"
            value={draft.name}
            placeholder="Nome do prato"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            aria-label="Nome do prato"
          />
        </div>
      </header>

      <div className="pe-icons">
        {ICONS.map((ic) => (
          <button
            key={ic}
            className={`pe-icon ${draft.icon === ic ? "pe-icon-on" : ""}`}
            onClick={() => setDraft({ ...draft, icon: ic })}
            aria-label={`Ícone ${ic}`}
          >
            {ic}
          </button>
        ))}
      </div>

      <section className="card pe-summary">
        <div>
          <b className="serif-num">{fmt(m.kcal)}</b>
          <small>kcal</small>
        </div>
        <div>
          <b className="serif-num">{fmt(m.prot)}g</b>
          <small>proteína</small>
        </div>
        <div>
          <b className="serif-num">{fmt(m.carb)}g</b>
          <small>carbo</small>
        </div>
        <div>
          <b className="serif-num">{fmt(m.fat)}g</b>
          <small>gordura</small>
        </div>
      </section>

      <div className="pe-list">
        {draft.ingredients.map((ing) => {
          const food = FOOD_BY_ID[ing.foodId];
          if (!food) return null;
          const step = gramsStep(food, 10);
          const im = foodMacros(food, ing.grams);
          return (
            <div key={ing.foodId} className="card pe-item">
              <div className="pe-item-info">
                <b>{food.name}</b>
                <small>
                  {fmt(im.kcal)} kcal · {fmt(im.prot)}g prot
                </small>
              </div>
              <div className="pe-qty">
                <button
                  onClick={() => setGrams(ing.foodId, ing.grams - step)}
                  aria-label="Menos"
                >
                  <IconMinus size={15} />
                </button>
                <span className="serif-num">{ing.grams}g</span>
                <button onClick={() => setGrams(ing.foodId, ing.grams + step)} aria-label="Mais">
                  <IconPlus size={15} stroke={2} />
                </button>
              </div>
              <button
                className="pe-remove"
                aria-label={`Remover ${food.name}`}
                onClick={() =>
                  setDraft({
                    ...draft,
                    ingredients: draft.ingredients.filter((i) => i.foodId !== ing.foodId),
                  })
                }
              >
                <IconTrash size={17} />
              </button>
            </div>
          );
        })}
        {draft.ingredients.length === 0 && (
          <p className="pe-empty">Adicione os ingredientes — arroz, frango, o que for.</p>
        )}
      </div>

      <BigButton onClick={() => setPicking(true)} tone="ghost">
        <IconPlus size={18} />
        Adicionar ingrediente
      </BigButton>

      <BigButton onClick={save} tone="pulse" disabled={!canSave}>
        {isNew ? "Criar prato" : "Salvar prato"}
      </BigButton>

      {!isNew && (
        <button className="pe-delete" onClick={() => setConfirmDelete(true)}>
          Excluir prato
        </button>
      )}

      {picking && (
        <FoodSearchSheet
          localOnly
          onClose={() => setPicking(false)}
          onAdd={(food, grams) => {
            setDraft((d) =>
              d.ingredients.some((i) => i.foodId === food.id)
                ? {
                    ...d,
                    ingredients: d.ingredients.map((i) =>
                      i.foodId === food.id ? { ...i, grams: i.grams + grams } : i
                    ),
                  }
                : { ...d, ingredients: [...d.ingredients, { foodId: food.id, grams }] }
            );
            setPicking(false);
          }}
        />
      )}

      {confirmDelete && (
        <Sheet onClose={() => setConfirmDelete(false)}>
          <h2>Excluir "{draft.name}"?</h2>
          <p>O que já foi registrado com ele continua no histórico.</p>
          <BigButton
            onClick={() => {
              dispatch({ type: "DELETE_DISH", id: draft.id });
              navigate("/dieta/pratos");
            }}
            tone="pulse"
          >
            Excluir
          </BigButton>
          <BigButton onClick={() => setConfirmDelete(false)} tone="ghost">
            Cancelar
          </BigButton>
        </Sheet>
      )}
    </main>
  );
}
