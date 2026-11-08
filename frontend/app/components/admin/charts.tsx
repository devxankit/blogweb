import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { formatCount, formatFull } from "./ui";

/**
 * Small, dependency-free charts for the dashboard. One series each, so no
 * legend: the panel title names what is plotted. Marks use --chart (validated
 * for contrast in both themes); all text uses the ink tokens.
 */

export interface Point {
  /** ISO day, YYYY-MM-DD. */
  day: string;
  value: number;
}

const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longDayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const short = (day: string) => dayFmt.format(new Date(`${day}T00:00:00Z`));
const long = (day: string) => longDayFmt.format(new Date(`${day}T00:00:00Z`));

/** Clean y-axis maximum and step: 0 / 5 / 10, 0 / 250 / 500, 0 / 2K / 4K … */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const niceStep = Math.max(1, step);
  return { max: Math.ceil(max / niceStep) * niceStep, step: niceStep };
}

function useWidth(initial = 720) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

interface ChartProps {
  points: Point[];
  /** Plural noun for the value, used in the tooltip and table: "views". */
  unit: string;
  height?: number;
  /** Accessible summary, e.g. "Page views per day, last 30 days". */
  label: string;
  /** Shown over an empty chart. */
  emptyText?: string;
}

function Tooltip({ x, y, width, point, unit }: { x: number; y: number; width: number; point: Point; unit: string }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div className="nr-tip" style={{ left, top: y }} role="presentation">
      <strong>{formatFull(point.value)}</strong>
      <span>
        {unit}, {long(point.day)}
      </span>
    </div>
  );
}

function TableView({ points, unit }: { points: Point[]; unit: string }) {
  return (
    <details className="nr-chart__table">
      <summary>Show as a table</summary>
      <div className="nr-table-wrap">
        <table className="nr-table nr-table--compact">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col" className="num">
                {unit[0].toUpperCase() + unit.slice(1)}
              </th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.day}>
                <td>{long(p.day)}</td>
                <td className="num">{formatFull(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function useActiveIndex(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!count) return;
    const keys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
    if (!(e.key in keys)) return;
    e.preventDefault();
    setActive((i) => {
      const step = keys[e.key];
      if (step === -Infinity) return 0;
      if (step === Infinity) return count - 1;
      return Math.min(count - 1, Math.max(0, (i ?? count - 1) + step));
    });
  };
  return { active, setActive, onKeyDown };
}

function Axes({ width, height, scale, points, x }: { width: number; height: number; scale: { max: number; step: number }; points: Point[]; x: (i: number) => number }) {
  const plotH = height - PAD.top - PAD.bottom;
  const ticks: number[] = [];
  for (let v = 0; v <= scale.max; v += scale.step) ticks.push(v);
  const labelIdx = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);
  return (
    <g className="nr-axis">
      {ticks.map((t) => {
        const y = PAD.top + plotH - (t / scale.max) * plotH;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} className={t === 0 ? "nr-axis__base" : "nr-axis__grid"} />
            <text x={PAD.left - 8} y={y} dy="0.32em" textAnchor="end">
              {formatCount(t)}
            </text>
          </g>
        );
      })}
      {labelIdx.map((i, n) => (
        <text key={i} x={x(i)} y={height - 8} textAnchor={n === 0 ? "start" : n === labelIdx.length - 1 ? "end" : "middle"}>
          {short(points[i].day)}
        </text>
      ))}
    </g>
  );
}

/** Trend over time: a 2px line over a 10% wash, with a crosshair that snaps to days. */
export function TrendChart({ points, unit, height = 240, label, emptyText }: ChartProps) {
  const { ref, width } = useWidth();
  const { active, setActive, onKeyDown } = useActiveIndex(points.length);
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const scale = niceScale(Math.max(0, ...points.map((p) => p.value)));
  const x = (i: number) => PAD.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / scale.max) * plotH;
  const empty = points.every((p) => p.value === 0);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = points.length ? `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : "";
  const last = points.length - 1;

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / box.width;
    setActive(Math.round(rel * (points.length - 1)));
  };

  const shown = active ?? null;
  return (
    <div className="nr-chart">
      <div ref={ref} className="nr-chart__frame">
        <svg
          width={width}
          height={height}
          className="nr-chart__svg"
          role="img"
          aria-label={`${label}. Use the left and right arrow keys to read each day.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          <Axes width={width} height={height} scale={scale} points={points} x={x} />
          {!empty ? (
            <>
              <path d={area} className="nr-chart__area" />
              <path d={line} className="nr-chart__line" />
              {last >= 0 && shown === null ? (
                <>
                  <circle cx={x(last)} cy={y(points[last].value)} r={4} className="nr-chart__dot" />
                  <text x={x(last) - 8} y={y(points[last].value) - 10} textAnchor="end" className="nr-chart__end">
                    {formatFull(points[last].value)}
                  </text>
                </>
              ) : null}
            </>
          ) : null}
          {shown !== null && points[shown] ? (
            <g className="nr-chart__cross">
              <line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={PAD.top + plotH} />
              <circle cx={x(shown)} cy={y(points[shown].value)} r={4} className="nr-chart__dot" />
            </g>
          ) : null}
          <rect
            x={PAD.left - 6}
            y={PAD.top}
            width={plotW + 12}
            height={plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
        {shown !== null && points[shown] ? (
          <Tooltip x={x(shown)} y={y(points[shown].value)} width={width} point={points[shown]} unit={unit} />
        ) : null}
        {empty && emptyText ? <p className="nr-chart__empty">{emptyText}</p> : null}
      </div>
      <TableView points={points} unit={unit} />
    </div>
  );
}

/** Counts per day as columns: 24px at most, 4px rounded tops, square on the baseline. */
export function ColumnChart({ points, unit, height = 200, label, emptyText }: ChartProps) {
  const { ref, width } = useWidth();
  const { active, setActive, onKeyDown } = useActiveIndex(points.length);
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const scale = niceScale(Math.max(0, ...points.map((p) => p.value)));
  const band = points.length ? plotW / points.length : plotW;
  const barW = Math.max(2, Math.min(24, band - 2));
  const cx = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + plotH - (v / scale.max) * plotH;
  const empty = points.every((p) => p.value === 0);

  const bar = (i: number, v: number) => {
    const x0 = cx(i) - barW / 2;
    const top = y(v);
    const base = y(0);
    const r = Math.min(4, barW / 2, base - top);
    return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + barW - r}Q${x0 + barW},${top} ${x0 + barW},${top + r}V${base}Z`;
  };

  return (
    <div className="nr-chart">
      <div ref={ref} className="nr-chart__frame">
        <svg
          width={width}
          height={height}
          className="nr-chart__svg"
          role="img"
          aria-label={`${label}. Use the left and right arrow keys to read each day.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          <Axes width={width} height={height} scale={scale} points={points} x={(i) => (i === 0 ? PAD.left : i === points.length - 1 ? width - PAD.right : cx(i))} />
          {points.map((p, i) =>
            p.value > 0 ? <path key={p.day} d={bar(i, p.value)} className={active === i ? "nr-chart__bar is-active" : "nr-chart__bar"} /> : null,
          )}
          {points.map((p, i) => (
            <rect
              key={p.day}
              x={PAD.left + band * i}
              y={PAD.top}
              width={band}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            />
          ))}
        </svg>
        {active !== null && points[active] ? (
          <Tooltip x={cx(active)} y={y(points[active].value)} width={width} point={points[active]} unit={unit} />
        ) : null}
        {empty && emptyText ? <p className="nr-chart__empty">{emptyText}</p> : null}
      </div>
      <TableView points={points} unit={unit} />
    </div>
  );
}

/** Ranked horizontal bars, largest first, one hue. Names and values are text, never colored. */
export function RankBars({
  rows,
  unit,
}: {
  rows: { key: string; label: ReactNode; value: number; section?: string }[];
  unit: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="nr-rank">
      {rows.map((r) => (
        <li key={r.key} className="nr-rank__row" data-section={r.section}>
          <span className="nr-rank__label">{r.label}</span>
          <span className="nr-rank__track" aria-hidden="true">
            {r.value > 0 ? <span className="nr-rank__bar" style={{ width: `${(r.value / max) * 100}%` }} /> : null}
          </span>
          <span className="nr-rank__value">
            {formatFull(r.value)} <span className="visually-hidden">{unit}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
