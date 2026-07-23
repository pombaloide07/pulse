import type { Exercise } from "./types";

/**
 * O catálogo do app: exercícios que academia brasileira tem de verdade, em
 * português. Cada um tem uma ficha em ./exerciseGuides.ts — este arquivo é só
 * o índice, porque é ele que as telas de plano e sessão leem o tempo todo.
 *
 * Os ids nunca mudam: plano e histórico salvos apontam pra eles.
 */
export const EXERCISES: Exercise[] = [
  // Peito
  { id: "supino-reto", name: "Supino reto", muscle: "Peito", equipment: "Barra" },
  { id: "supino-inclinado-halteres", name: "Supino inclinado c/ halteres", muscle: "Peito", equipment: "Halteres" },
  { id: "supino-maquina", name: "Supino máquina", muscle: "Peito", equipment: "Máquina" },
  { id: "crucifixo-maquina", name: "Crucifixo máquina (peck deck)", muscle: "Peito", equipment: "Máquina" },
  { id: "crossover", name: "Crossover na polia", muscle: "Peito", equipment: "Polia" },
  { id: "flexao", name: "Flexão de braço", muscle: "Peito", equipment: "Peso do corpo" },
  { id: "supino-inclinado-barra", name: "Supino inclinado na barra", muscle: "Peito", equipment: "Barra" },
  { id: "supino-declinado", name: "Supino declinado", muscle: "Peito", equipment: "Barra" },
  { id: "crucifixo-halteres", name: "Crucifixo com halteres", muscle: "Peito", equipment: "Halteres" },
  { id: "pullover-halter", name: "Pullover com halter", muscle: "Peito", equipment: "Halteres" },

  // Costas
  { id: "puxada-frente", name: "Puxada frente (pulley)", muscle: "Costas", equipment: "Polia" },
  { id: "remada-curvada", name: "Remada curvada", muscle: "Costas", equipment: "Barra" },
  { id: "remada-baixa", name: "Remada baixa (triângulo)", muscle: "Costas", equipment: "Polia" },
  { id: "remada-unilateral", name: "Remada unilateral (serrote)", muscle: "Costas", equipment: "Halteres" },
  { id: "barra-fixa", name: "Barra fixa", muscle: "Costas", equipment: "Peso do corpo" },
  { id: "pulldown", name: "Pulldown braço reto", muscle: "Costas", equipment: "Polia" },
  { id: "levantamento-terra", name: "Levantamento terra", muscle: "Costas", equipment: "Barra" },
  { id: "remada-cavalinho", name: "Remada cavalinho", muscle: "Costas", equipment: "Máquina" },
  { id: "remada-maquina", name: "Remada máquina (articulada)", muscle: "Costas", equipment: "Máquina" },
  { id: "puxada-supinada", name: "Puxada supinada", muscle: "Costas", equipment: "Polia" },
  { id: "hiperextensao-lombar", name: "Hiperextensão lombar", muscle: "Costas", equipment: "Peso do corpo" },

  // Ombros
  { id: "desenvolvimento-halteres", name: "Desenvolvimento c/ halteres", muscle: "Ombros", equipment: "Halteres" },
  { id: "desenvolvimento-maquina", name: "Desenvolvimento máquina", muscle: "Ombros", equipment: "Máquina" },
  { id: "elevacao-lateral", name: "Elevação lateral", muscle: "Ombros", equipment: "Halteres" },
  { id: "elevacao-frontal", name: "Elevação frontal", muscle: "Ombros", equipment: "Halteres" },
  { id: "face-pull", name: "Face pull", muscle: "Ombros", equipment: "Polia" },
  { id: "encolhimento", name: "Encolhimento (trapézio)", muscle: "Ombros", equipment: "Halteres" },
  { id: "desenvolvimento-militar", name: "Desenvolvimento militar c/ barra", muscle: "Ombros", equipment: "Barra" },
  { id: "crucifixo-inverso", name: "Crucifixo inverso (voador inverso)", muscle: "Ombros", equipment: "Máquina" },
  { id: "elevacao-lateral-polia", name: "Elevação lateral na polia", muscle: "Ombros", equipment: "Polia" },
  { id: "desenvolvimento-arnold", name: "Desenvolvimento Arnold", muscle: "Ombros", equipment: "Halteres" },

  // Bíceps
  { id: "rosca-direta", name: "Rosca direta", muscle: "Bíceps", equipment: "Barra" },
  { id: "rosca-alternada", name: "Rosca alternada", muscle: "Bíceps", equipment: "Halteres" },
  { id: "rosca-martelo", name: "Rosca martelo", muscle: "Bíceps", equipment: "Halteres" },
  { id: "rosca-scott", name: "Rosca Scott", muscle: "Bíceps", equipment: "Máquina" },
  { id: "rosca-polia", name: "Rosca na polia", muscle: "Bíceps", equipment: "Polia" },
  { id: "rosca-concentrada", name: "Rosca concentrada", muscle: "Bíceps", equipment: "Halteres" },
  { id: "rosca-inversa", name: "Rosca inversa", muscle: "Bíceps", equipment: "Barra" },
  { id: "rosca-banco-inclinado", name: "Rosca no banco inclinado", muscle: "Bíceps", equipment: "Halteres" },

  // Tríceps
  { id: "triceps-corda", name: "Tríceps corda", muscle: "Tríceps", equipment: "Polia" },
  { id: "triceps-testa", name: "Tríceps testa", muscle: "Tríceps", equipment: "Barra" },
  { id: "triceps-frances", name: "Tríceps francês", muscle: "Tríceps", equipment: "Halteres" },
  { id: "triceps-barra-reta", name: "Tríceps barra reta (polia)", muscle: "Tríceps", equipment: "Polia" },
  { id: "mergulho-banco", name: "Mergulho no banco", muscle: "Tríceps", equipment: "Peso do corpo" },
  { id: "mergulho-paralelas", name: "Mergulho nas paralelas", muscle: "Tríceps", equipment: "Peso do corpo" },
  { id: "supino-fechado", name: "Supino fechado", muscle: "Tríceps", equipment: "Barra" },
  { id: "triceps-coice", name: "Tríceps coice (kickback)", muscle: "Tríceps", equipment: "Halteres" },

  // Pernas
  { id: "agachamento-bulgaro", name: "Agachamento búlgaro", muscle: "Pernas", equipment: "Halteres" },
  { id: "agachamento-livre", name: "Agachamento livre", muscle: "Pernas", equipment: "Barra" },
  { id: "leg-press", name: "Leg press 45°", muscle: "Pernas", equipment: "Máquina" },
  { id: "cadeira-extensora", name: "Cadeira extensora", muscle: "Pernas", equipment: "Máquina" },
  { id: "mesa-flexora", name: "Mesa flexora", muscle: "Pernas", equipment: "Máquina" },
  { id: "stiff", name: "Stiff", muscle: "Pernas", equipment: "Barra" },
  { id: "afundo", name: "Afundo c/ halteres", muscle: "Pernas", equipment: "Halteres" },
  { id: "panturrilha-em-pe", name: "Panturrilha em pé", muscle: "Pernas", equipment: "Máquina" },
  { id: "panturrilha-sentado", name: "Panturrilha sentado", muscle: "Pernas", equipment: "Máquina" },
  { id: "agachamento-smith", name: "Agachamento no Smith", muscle: "Pernas", equipment: "Máquina" },
  { id: "hack-machine", name: "Hack machine", muscle: "Pernas", equipment: "Máquina" },
  { id: "cadeira-flexora", name: "Cadeira flexora", muscle: "Pernas", equipment: "Máquina" },
  { id: "cadeira-adutora", name: "Cadeira adutora", muscle: "Pernas", equipment: "Máquina" },

  // Glúteos
  { id: "elevacao-pelvica", name: "Elevação pélvica (hip thrust)", muscle: "Glúteos", equipment: "Barra" },
  { id: "cadeira-abdutora", name: "Cadeira abdutora", muscle: "Glúteos", equipment: "Máquina" },
  { id: "coice-na-polia", name: "Coice na polia (glúteo na polia)", muscle: "Glúteos", equipment: "Polia" },
  { id: "agachamento-sumo", name: "Agachamento sumô", muscle: "Glúteos", equipment: "Halteres" },
  { id: "ponte-de-gluteo", name: "Ponte de glúteo no solo", muscle: "Glúteos", equipment: "Peso do corpo" },
  { id: "elevacao-pelvica-maquina", name: "Elevação pélvica na máquina", muscle: "Glúteos", equipment: "Máquina" },
  { id: "subida-no-banco", name: "Subida no banco (step-up)", muscle: "Glúteos", equipment: "Halteres" },

  // Abdômen
  { id: "abdominal-supra", name: "Abdominal supra", muscle: "Abdômen", equipment: "Peso do corpo" },
  { id: "prancha", name: "Prancha", muscle: "Abdômen", equipment: "Peso do corpo" },
  { id: "abdominal-polia", name: "Abdominal na polia", muscle: "Abdômen", equipment: "Polia" },
  { id: "elevacao-pernas-suspenso", name: "Elevação de pernas suspenso", muscle: "Abdômen", equipment: "Peso do corpo" },
  { id: "abdominal-infra", name: "Abdominal infra (elevação de pernas deitado)", muscle: "Abdômen", equipment: "Peso do corpo" },
  { id: "prancha-lateral", name: "Prancha lateral", muscle: "Abdômen", equipment: "Peso do corpo" },
  { id: "roda-abdominal", name: "Roda abdominal", muscle: "Abdômen", equipment: "Peso do corpo" },
  { id: "abdominal-maquina", name: "Abdominal na máquina", muscle: "Abdômen", equipment: "Máquina" },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e])
);

/** Nome do exercício; um id desconhecido nunca vira tela em branco. */
export function exerciseName(id: string): string {
  return EXERCISE_BY_ID[id]?.name ?? id;
}

export const MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Glúteos",
  "Abdômen",
] as const;

/** Sem acento e em minúscula — "abdomen" acha "Abdômen". */
// montado por string pra não deixar caractere combinante solto no fonte
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s: string) => s.normalize("NFD").replace(DIACRITICS, "").toLowerCase();

/* normalizado uma vez no carregamento, como a base de alimentos faz */
const SEARCHABLE = EXERCISES.map((e) => ({
  e,
  hay: norm(`${e.name} ${e.muscle} ${e.equipment}`),
}));

/** Busca por nome, grupo ou aparelho, ignorando acento. */
export function searchExercises(query: string, muscle = ""): Exercise[] {
  const q = norm(query.trim());
  return SEARCHABLE.filter(
    ({ e, hay }) => (!muscle || e.muscle === muscle) && (!q || hay.includes(q))
  ).map(({ e }) => e);
}
