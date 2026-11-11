"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Minus, Plus } from "lucide-react";
import { PageHeader, ProductThumb } from "@/components/ui";
import { karigars, productionOrders, getProduct, stageName, output, TODAY, fmtDate, getKarigar } from "@/lib/data";

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-muted">{label}</span>
      <button type="button" aria-label={`Less ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="grid size-9 place-items-center rounded-lg border border-line bg-card active:bg-sand"><Minus className="size-4" /></button>
      <span className="w-8 text-center text-lg tabular">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-lg border border-line bg-card active:bg-sand"><Plus className="size-4" /></button>
    </div>
  );
}

export default function DailyEntry() {
  const [who, setWho] = useState(karigars[0].id);
  const [counts, setCounts] = useState<Record<string, { done: number; rejected: number }>>({});
  const [saved, setSaved] = useState(false);
  const k = getKarigar(who)!;

  const jobs = useMemo(
    () => productionOrders.filter((p) => p.status !== "Completed" && p.stages.some((s) => s.stage === k.stage && s.pending > 0)).slice(0, 6),
    [k.stage],
  );
  const todays = output.filter((o) => o.date === TODAY).slice(0, 12);

  const set = (id: string, patch: Partial<{ done: number; rejected: number }>) =>
    setCounts((c) => ({ ...c, [id]: { ...(c[id] ?? { done: 0, rejected: 0 }), ...patch } }));
  const totalDone = Object.values(counts).reduce((a, c) => a + c.done, 0);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Daily output" subtitle={`${fmtDate(TODAY)} · Supervisors enter each karigar's output on a phone at the end of the day.`} />

      <label className="mb-4 block text-sm">
        <span className="mb-1 block text-muted">Karigar</span>
        <select value={who} onChange={(e) => { setWho(e.target.value); setCounts({}); setSaved(false); }} className="w-full rounded-xl border border-line bg-card px-3 py-3 text-base outline-none focus:border-ink/40">
          {karigars.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.role}</option>)}
        </select>
      </label>

      <p className="mb-2 text-sm text-muted">Open work at <span className="text-ink">{stageName(k.stage)}</span></p>
      <div className="space-y-3">
        {jobs.map((p) => {
          const prod = getProduct(p.productId)!;
          const st = p.stages.find((s) => s.stage === k.stage)!;
          const c = counts[p.id] ?? { done: 0, rejected: 0 };
          return (
            <div key={p.id} className="rounded-xl border border-line bg-card p-3">
              <div className="mb-3 flex gap-3">
                <ProductThumb src={prod.image} alt={prod.name} size={36} />
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium">{prod.name} · {p.size}</p>
                  <p className="text-xs text-muted">{p.id} · {st.pending > 0 ? `${st.pending} pending of ${st.assigned}` : `${p.qty} to start`}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Stepper label="Done" value={c.done} onChange={(n) => set(p.id, { done: n })} />
                <Stepper label="Rejected" value={c.rejected} onChange={(n) => set(p.id, { rejected: n })} />
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && <p className="rounded-xl border border-line bg-card p-4 text-sm text-muted">No open work at this stage.</p>}
      </div>

      <div className="sticky bottom-0 mt-4 bg-paper/95 py-3 backdrop-blur">
        {saved ? (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-good-soft px-4 py-3 text-sm text-good"><CircleCheck className="size-4" />Saved {totalDone} pieces for {k.name}. Stock and stage counts update straight away.</p>
        ) : (
          <button onClick={() => setSaved(true)} disabled={totalDone === 0 && Object.values(counts).every((c) => c.rejected === 0)} className="w-full rounded-xl bg-ink px-4 py-3 text-base font-medium text-paper disabled:opacity-40">
            Save output{totalDone ? ` · ${totalDone} pcs` : ""}
          </button>
        )}
      </div>

      <h2 className="mt-8 mb-2 text-sm font-medium">Already entered today</h2>
      <ul className="divide-y divide-line/70 rounded-xl border border-line bg-card text-sm">
        {todays.map((o, i) => (
          <li key={i} className="flex justify-between gap-3 px-3 py-2">
            <span>{getKarigar(o.karigarId)?.name}<span className="text-xs text-muted"> · {stageName(o.stage)}</span></span>
            <span className="text-xs text-muted tabular">{o.completed} done{o.rejected ? ` · ${o.rejected} rejected` : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
