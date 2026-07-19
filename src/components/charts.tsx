import { useMemo, useRef, useState } from "react";
import { formatShort } from "../lib/dates";
import "./charts.css";

export interface ChartPoint {
  date: string;
  value: number;
  /** texto extra do tooltip ("volume 1320kg") */
  sub?: string;
}

/* ————— linha: série única ao longo do tempo ————— */

const W = 340;
const H = 168;
const PAD = { top: 14, right: 14, bottom: 24, left: 34 };

function fmtValue(v: number, decimals: number): string {
  return decimals > 0 ? v.toFixed(decimals).replace(".", ",") : String(Math.round(v));
}

export function LineChart({
  points,
  unit = "kg",
  decimals = 0,
  color = "var(--pulse)",
  emptyText = "Sem registros ainda.",
}: {
  points: ChartPoint[];
  unit?: string;
  decimals?: number;
  color?: string;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const geom = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => p.value);
    const span = Math.max(...values) - Math.min(...values);
    const margin = Math.max(span * 0.18, decimals > 0 ? 0.6 : 4);
    const lo = Math.max(0, Math.min(...values) - margin);
    const hi = Math.max(...values) + margin;
    const x = (i: number) =>
      PAD.left + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
    const coords = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
    const path = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(" ");
    const mid = (lo + hi) / 2;
    const ticks = [...new Set([lo, mid, hi].map((t) => +t.toFixed(decimals > 0 ? 1 : 0)))];
    return { coords, path, ticks, y };
  }, [points, decimals]);

  if (!geom) return <p className="chart-empty">{emptyText}</p>;

  const pick = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    geom.coords.forEach((c, i) => {
      const d = Math.abs(c.x - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const h = hover ?? points.length - 1;
  const hc = geom.coords[h];

  return (
    <div className="chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        role="img"
        aria-label="Gráfico de linha"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        {geom.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={geom.y(t)} y2={geom.y(t)} className="chart-grid" />
            <text x={PAD.left - 7} y={geom.y(t) + 3.5} className="chart-tick" textAnchor="end">
              {fmtValue(t, decimals)}
            </text>
          </g>
        ))}

        <path d={geom.path} className="chart-line" style={{ stroke: color }} />

        {geom.coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={i === h ? 5 : i === points.length - 1 ? 4 : 2.6}
            className="chart-dot"
            style={{ fill: color }}
          />
        ))}

        <line x1={hc.x} x2={hc.x} y1={PAD.top} y2={H - PAD.bottom} className="chart-cross" />

        <text x={geom.coords[0].x} y={H - 7} className="chart-tick" textAnchor="start">
          {formatShort(points[0].date)}
        </text>
        <text x={geom.coords[geom.coords.length - 1].x} y={H - 7} className="chart-tick" textAnchor="end">
          {formatShort(points[points.length - 1].date)}
        </text>
      </svg>
      <div className="chart-tooltip">
        <b className="serif-num">
          {fmtValue(points[h].value, decimals)}
          {unit}
        </b>
        <span>
          {formatShort(points[h].date)}
          {points[h].sub ? ` · ${points[h].sub}` : ""}
        </span>
      </div>
    </div>
  );
}

/* ————— barras: volume semanal (série única) ————— */

export function VolumeBars({ data }: { data: { week: string; volume: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.volume), 1);
  const bw = (W - PAD.left - PAD.right) / data.length;
  const h = hover ?? data.length - 1;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Volume semanal">
        {data.map((d, i) => {
          const bh = Math.max(3, (d.volume / max) * (H - PAD.top - PAD.bottom));
          const x = PAD.left + i * bw + bw * 0.18;
          const y = H - PAD.bottom - bh;
          const cls = `chart-bar ${i === h ? "chart-bar-hot" : ""} ${d.volume === 0 ? "chart-bar-zero" : ""}`;
          return (
            <g key={d.week}>
              <rect
                x={x}
                y={y}
                width={bw * 0.64}
                height={bh}
                rx={4}
                className={cls}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
              <rect x={x} y={H - PAD.bottom - 3} width={bw * 0.64} height={3} className={cls} />
            </g>
          );
        })}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          className="chart-grid chart-grid-base"
        />
        <text x={PAD.left} y={H - 7} className="chart-tick" textAnchor="start">
          há {data.length} sem
        </text>
        <text x={W - PAD.right} y={H - 7} className="chart-tick" textAnchor="end">
          esta semana
        </text>
      </svg>
      <div className="chart-tooltip">
        <b className="serif-num">{(data[h].volume / 1000).toFixed(1)}t</b>
        <span>levantadas na semana de {formatShort(data[h].week)}</span>
      </div>
    </div>
  );
}

/* ————— barras diárias com linha de meta (kcal ou proteína) ————— */

export function DailyBars({
  data,
  target,
  unit,
  color = "var(--chart-mata)",
}: {
  data: { date: string; value: number }[];
  target?: number;
  unit: string;
  color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), target ?? 0, 1) * 1.08;
  const bw = (W - PAD.left - PAD.right) / data.length;
  const h = hover ?? data.length - 1;
  const yOf = (v: number) => H - PAD.bottom - (v / max) * (H - PAD.top - PAD.bottom);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Registro diário (${unit})`}>
        {data.map((d, i) => {
          const bh = Math.max(2, (d.value / max) * (H - PAD.top - PAD.bottom));
          const x = PAD.left + i * bw + bw * 0.2;
          const cls = `chart-bar ${i === h ? "chart-bar-hot" : ""} ${d.value === 0 ? "chart-bar-zero" : ""}`;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={H - PAD.bottom - bh}
                width={bw * 0.6}
                height={bh}
                rx={3}
                className={cls}
                style={d.value > 0 ? { fill: color } : undefined}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
              <rect
                x={x}
                y={H - PAD.bottom - 2}
                width={bw * 0.6}
                height={2}
                className={cls}
                style={d.value > 0 ? { fill: color } : undefined}
              />
            </g>
          );
        })}
        {target !== undefined && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yOf(target)}
              y2={yOf(target)}
              className="chart-target"
            />
            <text x={W - PAD.right} y={yOf(target) - 5} className="chart-tick" textAnchor="end">
              meta
            </text>
          </g>
        )}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          className="chart-grid chart-grid-base"
        />
        <text x={PAD.left} y={H - 7} className="chart-tick" textAnchor="start">
          {formatShort(data[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 7} className="chart-tick" textAnchor="end">
          hoje
        </text>
      </svg>
      <div className="chart-tooltip">
        <b className="serif-num">
          {data[h].value.toLocaleString("pt-BR")}
          {unit}
        </b>
        <span>
          {data[h].value === 0 ? "sem registro em" : "em"} {formatShort(data[h].date)}
        </span>
      </div>
    </div>
  );
}
