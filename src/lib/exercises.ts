import type { Exercise } from "./types";

/**
 * Curadoria pequena e certa (PRD §14.2): os exercícios que o grupo
 * realmente faz, em português — não uma base de 11 mil em inglês.
 */
export const EXERCISES: Exercise[] = [
  // Peito
  { id: "supino-reto", name: "Supino reto", muscle: "Peito", equipment: "Barra" },
  { id: "supino-inclinado-halteres", name: "Supino inclinado c/ halteres", muscle: "Peito", equipment: "Halteres" },
  { id: "supino-maquina", name: "Supino máquina", muscle: "Peito", equipment: "Máquina" },
  { id: "crucifixo-maquina", name: "Crucifixo máquina (peck deck)", muscle: "Peito", equipment: "Máquina" },
  { id: "crossover", name: "Crossover na polia", muscle: "Peito", equipment: "Polia" },
  { id: "flexao", name: "Flexão de braço", muscle: "Peito", equipment: "Peso do corpo" },

  // Costas
  { id: "puxada-frente", name: "Puxada frente (pulley)", muscle: "Costas", equipment: "Polia" },
  { id: "remada-curvada", name: "Remada curvada", muscle: "Costas", equipment: "Barra" },
  { id: "remada-baixa", name: "Remada baixa (triângulo)", muscle: "Costas", equipment: "Polia" },
  { id: "remada-unilateral", name: "Remada unilateral (serrote)", muscle: "Costas", equipment: "Halteres" },
  { id: "barra-fixa", name: "Barra fixa", muscle: "Costas", equipment: "Peso do corpo" },
  { id: "pulldown", name: "Pulldown braço reto", muscle: "Costas", equipment: "Polia" },

  // Ombros
  { id: "desenvolvimento-halteres", name: "Desenvolvimento c/ halteres", muscle: "Ombros", equipment: "Halteres" },
  { id: "desenvolvimento-maquina", name: "Desenvolvimento máquina", muscle: "Ombros", equipment: "Máquina" },
  { id: "elevacao-lateral", name: "Elevação lateral", muscle: "Ombros", equipment: "Halteres" },
  { id: "elevacao-frontal", name: "Elevação frontal", muscle: "Ombros", equipment: "Halteres" },
  { id: "face-pull", name: "Face pull", muscle: "Ombros", equipment: "Polia" },
  { id: "encolhimento", name: "Encolhimento (trapézio)", muscle: "Ombros", equipment: "Halteres" },

  // Bíceps
  { id: "rosca-direta", name: "Rosca direta", muscle: "Bíceps", equipment: "Barra" },
  { id: "rosca-alternada", name: "Rosca alternada", muscle: "Bíceps", equipment: "Halteres" },
  { id: "rosca-martelo", name: "Rosca martelo", muscle: "Bíceps", equipment: "Halteres" },
  { id: "rosca-scott", name: "Rosca Scott", muscle: "Bíceps", equipment: "Máquina" },
  { id: "rosca-polia", name: "Rosca na polia", muscle: "Bíceps", equipment: "Polia" },

  // Tríceps
  { id: "triceps-corda", name: "Tríceps corda", muscle: "Tríceps", equipment: "Polia" },
  { id: "triceps-testa", name: "Tríceps testa", muscle: "Tríceps", equipment: "Barra" },
  { id: "triceps-frances", name: "Tríceps francês", muscle: "Tríceps", equipment: "Halteres" },
  { id: "triceps-barra-reta", name: "Tríceps barra reta (polia)", muscle: "Tríceps", equipment: "Polia" },
  { id: "mergulho-banco", name: "Mergulho no banco", muscle: "Tríceps", equipment: "Peso do corpo" },

  // Pernas
  { id: "agachamento-livre", name: "Agachamento livre", muscle: "Pernas", equipment: "Barra" },
  { id: "leg-press", name: "Leg press 45°", muscle: "Pernas", equipment: "Máquina" },
  { id: "cadeira-extensora", name: "Cadeira extensora", muscle: "Pernas", equipment: "Máquina" },
  { id: "mesa-flexora", name: "Mesa flexora", muscle: "Pernas", equipment: "Máquina" },
  { id: "stiff", name: "Stiff", muscle: "Pernas", equipment: "Barra" },
  { id: "afundo", name: "Afundo c/ halteres", muscle: "Pernas", equipment: "Halteres" },
  { id: "panturrilha-em-pe", name: "Panturrilha em pé", muscle: "Pernas", equipment: "Máquina" },
  { id: "panturrilha-sentado", name: "Panturrilha sentado", muscle: "Pernas", equipment: "Máquina" },

  // Glúteos
  { id: "elevacao-pelvica", name: "Elevação pélvica (hip thrust)", muscle: "Glúteos", equipment: "Barra" },
  { id: "cadeira-abdutora", name: "Cadeira abdutora", muscle: "Glúteos", equipment: "Máquina" },

  // Abdômen
  { id: "abdominal-supra", name: "Abdominal supra", muscle: "Abdômen", equipment: "Peso do corpo" },
  { id: "prancha", name: "Prancha", muscle: "Abdômen", equipment: "Peso do corpo" },
  { id: "abdominal-polia", name: "Abdominal na polia", muscle: "Abdômen", equipment: "Polia" },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e])
);

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
