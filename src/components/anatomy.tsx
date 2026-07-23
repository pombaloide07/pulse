import type { MuscleRegion } from "../lib/types";
import "./anatomy.css";

/**
 * Mapa muscular do app: duas silhuetas (frente e costas) desenhadas aqui mesmo,
 * em SVG. Cada região é um path próprio, pintado conforme o exercício:
 * músculo principal no coral do app, auxiliar no mesmo coral bem mais fraco.
 *
 * É desenho nosso de propósito — foto e GIF de execução são material licenciado,
 * e um SVG pesa poucos KB, funciona offline e combina com o resto da interface.
 *
 * O corpo é simétrico: só a metade direita é desenhada e a esquerda é a mesma
 * metade espelhada. Peças centrais (cabeça, pescoço) entram uma vez só.
 */

interface Shape {
  region: MuscleRegion | null;
  d: string;
}

/* ————— metade direita, vista de frente (viewBox 120×300, centro em x=60) ————— */

const FRONT: Shape[] = [
  // volume neutro: pelve, joelho, mão — dão forma sem serem músculo do mapa
  { region: null, d: "M61 141 L75 139 Q81 148 79 159 L61 163 Z" },
  { region: null, d: "M66 220 Q78 219 80 228 Q79 236 72 236 Q66 232 66 220 Z" },
  { region: null, d: "M95 165 Q103 167 104 175 Q103 183 97 183 Q92 178 93 170 Z" },
  { region: null, d: "M69 276 Q80 275 83 284 L68 287 Z" },

  { region: "trapezio", d: "M60 40 L60 53 L83 59 Q79 45 68 39 Z" },
  { region: "deltoide-anterior", d: "M83 57 Q94 60 95 74 Q90 81 82 77 Q79 65 83 57 Z" },
  { region: "deltoide-lateral", d: "M93 58 Q102 67 98 81 Q94 85 91 81 Q97 69 90 60 Z" },
  { region: "peitoral", d: "M61 57 L79 60 Q90 66 88 78 Q85 88 73 90 L61 88 Z" },
  { region: "abdomen", d: "M61 93 L74 93 Q76 109 74 124 Q72 137 61 139 Z" },
  { region: "obliquo", d: "M75 95 Q83 101 81 117 Q79 130 73 137 Q77 117 75 95 Z" },
  { region: "biceps", d: "M84 82 Q94 85 96 101 Q97 114 92 120 Q84 117 83 104 Q82 90 84 82 Z" },
  { region: "antebraco", d: "M92 124 Q100 131 102 146 Q103 158 98 164 Q92 161 90 148 Q89 132 92 124 Z" },
  { region: "adutores", d: "M61 161 L65 160 Q65 181 67 197 Q62 195 61 181 Z" },
  { region: "quadriceps", d: "M66 160 L79 158 Q85 179 83 201 Q81 217 73 221 Q67 215 66 196 Z" },
  { region: "panturrilha", d: "M68 236 Q79 238 79 255 Q78 269 73 273 Q68 268 68 253 Z" },
];

/* ————— metade direita, vista de costas ————— */

const BACK: Shape[] = [
  { region: null, d: "M66 220 Q78 219 80 228 Q79 236 72 236 Q66 232 66 220 Z" },
  { region: null, d: "M95 165 Q103 167 104 175 Q103 183 97 183 Q92 178 93 170 Z" },
  { region: null, d: "M69 276 Q80 275 83 284 L68 287 Z" },

  { region: "trapezio", d: "M60 39 L83 58 Q80 80 60 90 Z" },
  { region: "deltoide-posterior", d: "M83 57 Q94 60 95 74 Q90 81 82 77 Q79 65 83 57 Z" },
  { region: "deltoide-lateral", d: "M93 58 Q102 67 98 81 Q94 85 91 81 Q97 69 90 60 Z" },
  { region: "dorsal", d: "M60 92 L80 82 Q87 97 82 113 Q73 125 60 127 Z" },
  { region: "lombar", d: "M60 129 L79 118 Q81 133 77 145 L60 149 Z" },
  { region: "triceps", d: "M84 82 Q94 85 96 101 Q97 114 92 120 Q84 117 83 104 Q82 90 84 82 Z" },
  { region: "antebraco", d: "M92 124 Q100 131 102 146 Q103 158 98 164 Q92 161 90 148 Q89 132 92 124 Z" },
  { region: "gluteo", d: "M60 151 Q77 147 81 159 Q81 173 70 177 Q61 175 60 167 Z" },
  { region: "isquiotibiais", d: "M66 179 L79 177 Q84 196 82 212 Q77 221 71 221 Q67 209 66 195 Z" },
  { region: "panturrilha", d: "M68 232 Q79 234 79 252 Q78 268 73 272 Q68 267 68 250 Z" },
];

type Tone = "primary" | "secondary" | "off";

function Half({ shapes, toneOf }: { shapes: Shape[]; toneOf: (r: MuscleRegion | null) => Tone }) {
  return (
    <>
      {shapes.map((s, i) => (
        <path key={i} d={s.d} className={`bm-${toneOf(s.region)}`} />
      ))}
    </>
  );
}

function Figure({
  shapes,
  toneOf,
  label,
}: {
  shapes: Shape[];
  toneOf: (r: MuscleRegion | null) => Tone;
  label: string;
}) {
  return (
    <figure className="bm-fig">
      <svg viewBox="0 0 120 300" className="bm-svg" role="img" aria-label={label || "músculo trabalhado"}>
        {/* cabeça e pescoço: no eixo, desenhados uma vez */}
        <ellipse cx="60" cy="23" rx="12" ry="14.5" className="bm-off" />
        <path d="M53 34 h14 v9 q-7 4 -14 0 Z" className="bm-off" />
        <Half shapes={shapes} toneOf={toneOf} />
        <g transform="scale(-1,1) translate(-120,0)">
          <Half shapes={shapes} toneOf={toneOf} />
        </g>
      </svg>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );
}

/** Quantas regiões marcadas essa vista consegue mostrar. */
function coverage(shapes: Shape[], marked: Set<MuscleRegion>): number {
  return shapes.filter((s) => s.region && marked.has(s.region)).length;
}

export function BodyMap({
  primary,
  secondary = [],
  compact = false,
}: {
  primary: MuscleRegion[];
  secondary?: MuscleRegion[];
  /** miniatura: uma vista só, sem legenda — pra lista */
  compact?: boolean;
}) {
  const prim = new Set(primary);
  const sec = new Set(secondary);
  const toneOf = (r: MuscleRegion | null): Tone =>
    r && prim.has(r) ? "primary" : r && sec.has(r) ? "secondary" : "off";

  if (compact) {
    // mostra o lado que revela mais do alvo: peito de frente, dorsal de costas
    const back = coverage(BACK, prim) > coverage(FRONT, prim);
    return (
      <span className="bodymap bodymap-mini">
        <Figure shapes={back ? BACK : FRONT} toneOf={toneOf} label="" />
      </span>
    );
  }

  return (
    <div className="bodymap">
      <Figure shapes={FRONT} toneOf={toneOf} label="frente" />
      <Figure shapes={BACK} toneOf={toneOf} label="costas" />
    </div>
  );
}

/** Nome legível de cada região — usado nas legendas da ficha. */
export const REGION_LABEL: Record<MuscleRegion, string> = {
  peitoral: "peitoral",
  "deltoide-anterior": "ombro (frente)",
  "deltoide-lateral": "ombro (lateral)",
  "deltoide-posterior": "ombro (posterior)",
  trapezio: "trapézio",
  dorsal: "dorsais",
  lombar: "lombar",
  biceps: "bíceps",
  triceps: "tríceps",
  antebraco: "antebraço",
  abdomen: "abdômen",
  obliquo: "oblíquos",
  gluteo: "glúteos",
  quadriceps: "quadríceps",
  isquiotibiais: "posterior de coxa",
  adutores: "adutores",
  panturrilha: "panturrilha",
};
