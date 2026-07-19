import type { Food, FoodGroup } from "./types";
import { TACO_FOODS } from "./tacoFoods";

/**
 * Curadoria de comida brasileira de verdade (valores aproximados por 100g,
 * base TACO/NEPA-Unicamp; embalados são médias de mercado). Curadoria
 * pequena e certa > base de 4 milhões em inglês (PRD §9).
 */
export const FOODS: Food[] = [
  // Básicos
  { id: "arroz-branco", name: "Arroz branco cozido", group: "Básicos", per100: { kcal: 128, prot: 2.5, carb: 28.1, fat: 0.2 } },
  { id: "arroz-integral", name: "Arroz integral cozido", group: "Básicos", per100: { kcal: 124, prot: 2.6, carb: 25.8, fat: 1.0 } },
  { id: "feijao-carioca", name: "Feijão carioca cozido", group: "Básicos", per100: { kcal: 76, prot: 4.8, carb: 13.6, fat: 0.5 }, unitName: "1 concha", unitGrams: 140 },
  { id: "feijao-preto", name: "Feijão preto cozido", group: "Básicos", per100: { kcal: 77, prot: 4.5, carb: 14.0, fat: 0.5 }, unitName: "1 concha", unitGrams: 140 },
  { id: "macarrao", name: "Macarrão cozido", group: "Básicos", per100: { kcal: 122, prot: 3.9, carb: 24.5, fat: 0.9 } },
  { id: "batata-doce", name: "Batata-doce cozida", group: "Básicos", per100: { kcal: 77, prot: 0.6, carb: 18.4, fat: 0.1 } },
  { id: "batata", name: "Batata inglesa cozida", group: "Básicos", per100: { kcal: 52, prot: 1.2, carb: 11.9, fat: 0 } },
  { id: "mandioca", name: "Mandioca cozida", group: "Básicos", per100: { kcal: 125, prot: 0.6, carb: 30.1, fat: 0.3 } },
  { id: "cuscuz", name: "Cuscuz de milho", group: "Básicos", per100: { kcal: 113, prot: 2.2, carb: 25.3, fat: 0.7 } },
  { id: "aveia", name: "Aveia em flocos", group: "Básicos", per100: { kcal: 394, prot: 13.9, carb: 66.6, fat: 8.5 }, unitName: "1 colher", unitGrams: 15 },
  { id: "tapioca", name: "Tapioca (goma hidratada)", group: "Básicos", per100: { kcal: 240, prot: 0.1, carb: 59.4, fat: 0 }, unitName: "1 unidade", unitGrams: 60 },

  // Proteínas
  { id: "peito-frango", name: "Peito de frango grelhado", group: "Proteínas", per100: { kcal: 159, prot: 32.0, carb: 0, fat: 2.5 }, unitName: "1 filé", unitGrams: 120 },
  { id: "coxa-frango", name: "Coxa de frango assada", group: "Proteínas", per100: { kcal: 215, prot: 28.0, carb: 0, fat: 11.0 }, unitName: "1 unidade", unitGrams: 65 },
  { id: "carne-moida", name: "Carne moída refogada", group: "Proteínas", per100: { kcal: 212, prot: 26.7, carb: 0, fat: 10.9 } },
  { id: "contra-file", name: "Contra-filé grelhado", group: "Proteínas", per100: { kcal: 220, prot: 31.0, carb: 0, fat: 10.5 }, unitName: "1 bife", unitGrams: 130 },
  { id: "tilapia", name: "Tilápia grelhada", group: "Proteínas", per100: { kcal: 128, prot: 26.0, carb: 0, fat: 2.5 }, unitName: "1 filé", unitGrams: 120 },
  { id: "ovo", name: "Ovo cozido", group: "Proteínas", per100: { kcal: 146, prot: 13.3, carb: 0.6, fat: 9.5 }, unitName: "1 unidade", unitGrams: 50 },
  { id: "ovo-frito", name: "Ovo frito", group: "Proteínas", per100: { kcal: 240, prot: 15.6, carb: 1.2, fat: 18.6 }, unitName: "1 unidade", unitGrams: 50 },
  { id: "atum-lata", name: "Atum em lata (água)", group: "Proteínas", per100: { kcal: 118, prot: 26.0, carb: 0, fat: 1.0 }, unitName: "1 lata", unitGrams: 120 },

  // Padaria & lanches
  { id: "pao-frances", name: "Pão francês", group: "Padaria & lanches", per100: { kcal: 300, prot: 8.0, carb: 58.6, fat: 3.1 }, unitName: "1 unidade", unitGrams: 50 },
  { id: "pao-forma", name: "Pão de forma integral", group: "Padaria & lanches", per100: { kcal: 253, prot: 9.4, carb: 49.9, fat: 3.5 }, unitName: "1 fatia", unitGrams: 25 },
  { id: "pao-de-queijo", name: "Pão de queijo assado", group: "Padaria & lanches", per100: { kcal: 363, prot: 5.1, carb: 34.2, fat: 22.9 }, unitName: "1 unidade", unitGrams: 40 },

  // Frutas
  { id: "banana", name: "Banana prata", group: "Frutas", per100: { kcal: 98, prot: 1.3, carb: 26.0, fat: 0.1 }, unitName: "1 unidade", unitGrams: 70 },
  { id: "maca", name: "Maçã", group: "Frutas", per100: { kcal: 56, prot: 0.3, carb: 15.2, fat: 0 }, unitName: "1 unidade", unitGrams: 130 },
  { id: "laranja", name: "Laranja", group: "Frutas", per100: { kcal: 37, prot: 1.0, carb: 8.9, fat: 0.1 }, unitName: "1 unidade", unitGrams: 140 },
  { id: "mamao", name: "Mamão", group: "Frutas", per100: { kcal: 40, prot: 0.5, carb: 10.4, fat: 0.1 }, unitName: "1 fatia", unitGrams: 170 },
  { id: "abacate", name: "Abacate", group: "Frutas", per100: { kcal: 96, prot: 1.2, carb: 6.0, fat: 8.4 } },
  { id: "acai", name: "Açaí (polpa s/ xarope)", group: "Frutas", per100: { kcal: 58, prot: 0.8, carb: 6.2, fat: 3.9 } },

  // Verduras & legumes
  { id: "brocolis", name: "Brócolis cozido", group: "Verduras & legumes", per100: { kcal: 25, prot: 2.1, carb: 4.4, fat: 0.5 } },
  { id: "alface", name: "Alface", group: "Verduras & legumes", per100: { kcal: 11, prot: 1.3, carb: 1.7, fat: 0.2 } },
  { id: "tomate", name: "Tomate", group: "Verduras & legumes", per100: { kcal: 15, prot: 1.1, carb: 3.1, fat: 0.2 } },
  { id: "cenoura", name: "Cenoura crua", group: "Verduras & legumes", per100: { kcal: 34, prot: 1.3, carb: 7.7, fat: 0.2 } },

  // Laticínios
  { id: "leite-integral", name: "Leite integral", group: "Laticínios", per100: { kcal: 61, prot: 3.2, carb: 4.6, fat: 3.3 }, unitName: "1 copo", unitGrams: 200 },
  { id: "leite-desnatado", name: "Leite desnatado", group: "Laticínios", per100: { kcal: 36, prot: 3.4, carb: 5.0, fat: 0.2 }, unitName: "1 copo", unitGrams: 200 },
  { id: "iogurte-natural", name: "Iogurte natural", group: "Laticínios", per100: { kcal: 51, prot: 4.1, carb: 1.9, fat: 3.0 }, unitName: "1 pote", unitGrams: 170 },
  { id: "queijo-mussarela", name: "Queijo mussarela", group: "Laticínios", per100: { kcal: 330, prot: 22.6, carb: 3.0, fat: 25.2 }, unitName: "1 fatia", unitGrams: 20 },
  { id: "queijo-minas", name: "Queijo minas frescal", group: "Laticínios", per100: { kcal: 264, prot: 17.4, carb: 3.2, fat: 20.2 }, unitName: "1 fatia", unitGrams: 30 },
  { id: "requeijao", name: "Requeijão", group: "Laticínios", per100: { kcal: 257, prot: 9.6, carb: 2.4, fat: 23.5 }, unitName: "1 colher", unitGrams: 30 },
  { id: "manteiga", name: "Manteiga", group: "Laticínios", per100: { kcal: 726, prot: 0.4, carb: 0, fat: 82.4 }, unitName: "1 colher chá", unitGrams: 10 },

  // Suplementos & gorduras
  { id: "whey", name: "Whey protein (pó)", group: "Suplementos", per100: { kcal: 400, prot: 80.0, carb: 10.0, fat: 6.5 }, unitName: "1 scoop", unitGrams: 30 },
  { id: "pasta-amendoim", name: "Pasta de amendoim", group: "Suplementos", per100: { kcal: 589, prot: 22.5, carb: 21.6, fat: 49.9 }, unitName: "1 colher", unitGrams: 15 },
  { id: "castanha-caju", name: "Castanha de caju", group: "Suplementos", per100: { kcal: 570, prot: 18.5, carb: 29.1, fat: 46.3 }, unitName: "1 punhado", unitGrams: 30 },
  { id: "azeite", name: "Azeite de oliva", group: "Suplementos", per100: { kcal: 884, prot: 0, carb: 0, fat: 100 }, unitName: "1 fio", unitGrams: 5 },

  // Bebidas
  { id: "cafe", name: "Café coado s/ açúcar", group: "Bebidas", per100: { kcal: 2, prot: 0.1, carb: 0.3, fat: 0 }, unitName: "1 xícara", unitGrams: 50 },
  { id: "suco-laranja", name: "Suco de laranja natural", group: "Bebidas", per100: { kcal: 41, prot: 0.7, carb: 9.5, fat: 0 }, unitName: "1 copo", unitGrams: 250 },
  { id: "refrigerante", name: "Refrigerante", group: "Bebidas", per100: { kcal: 42, prot: 0, carb: 10.6, fat: 0 }, unitName: "1 lata", unitGrams: 350 },

  // Da vida real (sem vergonha — §11)
  { id: "coxinha", name: "Coxinha de frango", group: "Da vida real", per100: { kcal: 283, prot: 8.4, carb: 34.8, fat: 12.1 }, unitName: "1 unidade", unitGrams: 80 },
  { id: "pizza-mussarela", name: "Pizza de mussarela", group: "Da vida real", per100: { kcal: 289, prot: 12.0, carb: 33.0, fat: 12.0 }, unitName: "1 fatia", unitGrams: 125 },
  { id: "feijoada", name: "Feijoada", group: "Da vida real", per100: { kcal: 117, prot: 8.7, carb: 11.6, fat: 4.0 }, unitName: "1 concha", unitGrams: 140 },
  { id: "strogonoff", name: "Estrogonofe de frango", group: "Da vida real", per100: { kcal: 157, prot: 12.0, carb: 6.5, fat: 9.5 }, unitName: "1 concha", unitGrams: 150 },
  { id: "farofa", name: "Farofa pronta", group: "Da vida real", per100: { kcal: 406, prot: 2.5, carb: 76.7, fat: 9.1 }, unitName: "1 colher", unitGrams: 25 },
];

/**
 * Base local completa: a curadoria (com dicas de porção) na frente,
 * mais a TACO inteira (~590 alimentos, NEPA/Unicamp) atrás.
 */
export const ALL_FOODS: Food[] = [...FOODS, ...TACO_FOODS];

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(
  ALL_FOODS.map((f) => [f.id, f])
);

/** Busca sem acento: "pao" acha "Pão". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Busca local: curadoria primeiro, depois TACO; filtro opcional por grupo. */
export function searchLocalFoods(query: string, group: string): Food[] {
  const q = normalize(query.trim());
  return ALL_FOODS.filter(
    (f) => (!group || f.group === group) && (!q || normalize(f.name).includes(q))
  );
}

export const FOOD_GROUPS: FoodGroup[] = [
  "Básicos",
  "Proteínas",
  "Padaria & lanches",
  "Frutas",
  "Verduras & legumes",
  "Laticínios",
  "Suplementos",
  "Bebidas",
  "Da vida real",
];
