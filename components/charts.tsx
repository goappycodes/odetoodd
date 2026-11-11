"use client";

import { useState } from "react";

import { inrShort } from "@/lib/format";

export type Series = { key: string; label: string; color: string };
/** Named number formats, so server pages can pick one without passing a function */
export type Fmt = "inr" | "num" | "pcs" | "pct" | "sold";
const FORMATS: Record<Fmt, (n: number) => string> = {
  inr: inrShort,
  num: (n) => String(Math.round(n * 10) / 10),
  pcs: (n) => `${Math.round(n)} pcs`,
  pct: (n) => `${n}%`,
  sold: (n) => `${n} sold`,
};
export type BarDatum = { label: string; values: Record<string, number> };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Vertical bars, stacked when more than one series. One y-axis, recessive grid, hover tooltip. */
export function StackedBars({
  data, series, format: unit = "num", height = 220, labelEvery = 1,
}: { data: BarDatum[]; series: Series[]; format?: Fmt; height?: number; labelEvery?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const format = FORMATS[unit];
  const totals = data.map((d) => series.reduce((a, s) => a + (d.values[s.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const W = 640, H = height, padL = 52, padB = 26, padT = 8;
  const plotW = W - padL - 8, plotH = H - padB - padT;
  const step = plotW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(36, step * 0.62));

  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart">
        {ticks.map((t) => {
          const y = padT + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="#e8e1d2" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#6b625c">{format(t)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + i * step + (step - barW) / 2;
          let acc = 0;
          const segs = series.map((s) => ({ s, v: d.values[s.key] ?? 0 })).filter((x) => x.v > 0);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * step} y={padT} width={step} height={plotH} fill={hover === i ? "#f1ecdd" : "transparent"} />
              {segs.map(({ s, v }, si) => {
                const h = (v / max) * plotH;
                const y = padT + plotH - acc - h;
                acc += h;
                const top = si === segs.length - 1;
                const gap = si > 0 ? 2 : 0; // 2px surface gap between stacked segments
                const r = top ? Math.min(4, barW / 2, Math.max(0, h - gap)) : 0;
                const hh = Math.max(0, h - gap);
                return (
                  <path
                    key={s.key}
                    d={`M${x},${y + hh} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + hh} Z`}
                    fill={s.color}
                  />
                );
              })}
              {i % labelEvery === 0 && (
                <text x={padL + i * step + step / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#6b625c">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-6 z-10 min-w-36 rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
          style={{ left: `${Math.min(70, ((hover + 0.5) / data.length) * 100)}%` }}
        >
          <p className="mb-1 font-medium">{data[hover].label}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4 tabular">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span>{format(data[hover].values[s.key] ?? 0)}</span>
            </p>
          ))}
          {series.length > 1 && (
            <p className="mt-1 flex justify-between border-t border-line pt-1 font-medium tabular">
              <span>Total</span>
              <span>{format(totals[hover])}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Horizontal bars for ranked lists (one series). */
export function HBars({
  rows, format: unit = "num", color = "var(--color-s1)",
}: { rows: { label: React.ReactNode; value: number; note?: React.ReactNode }[]; format?: Fmt; color?: string }) {
  const format = FORMATS[unit];
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="text-right tabular">
            {format(r.value)}
            {r.note && <span className="ml-1.5 text-xs text-muted">{r.note}</span>}
          </span>
          <span className="col-span-2 h-2 overflow-hidden rounded-full bg-sand">
            <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
