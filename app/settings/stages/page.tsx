"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { stages as initial, productionOrders } from "@/lib/data";

export default function StagesPage() {
  const [stages, setStages] = useState(initial.map((s) => ({ ...s })));
  const move = (i: number, d: number) =>
    setStages((s) => {
      const n = [...s];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x);
      return n;
    });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Production stages" subtitle="Set the stages every production order moves through. Changes apply to new production orders." />
      <Card pad={false}>
        <ul className="divide-y divide-line/70">
          {stages.map((s, i) => {
            const wip = productionOrders.filter((p) => p.currentStage === s.id).length;
            return (
              <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                <GripVertical className="size-4 text-faint" />
                <span className="w-6 text-sm text-muted tabular">{i + 1}</span>
                <input
                  value={s.name}
                  onChange={(e) => setStages((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm hover:border-line focus:border-ink/40 focus:outline-none"
                />
                <label className="flex items-center gap-1 text-xs text-muted">
                  Typical
                  <input
                    type="number"
                    min={0}
                    value={s.avgDays}
                    onChange={(e) => setStages((all) => all.map((x, j) => (j === i ? { ...x, avgDays: Number(e.target.value) } : x)))}
                    className="w-14 rounded-md border border-line bg-card px-2 py-1 text-right text-sm"
                  />
                  days
                </label>
                <span className="hidden w-20 text-right text-xs text-muted sm:block">{wip ? `${wip} active` : ""}</span>
                <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 hover:bg-sand disabled:opacity-30"><ArrowUp className="size-4" /></button>
                <button aria-label="Move down" disabled={i === stages.length - 1} onClick={() => move(i, 1)} className="rounded p-1 hover:bg-sand disabled:opacity-30"><ArrowDown className="size-4" /></button>
                <button aria-label="Remove stage" disabled={wip > 0} title={wip ? "Stage has active work" : "Remove"} onClick={() => setStages((all) => all.filter((_, j) => j !== i))} className="rounded p-1 text-muted hover:bg-sand hover:text-bad disabled:opacity-30"><Trash2 className="size-4" /></button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-line p-3">
          <button onClick={() => setStages((s) => [...s, { id: `new-${s.length}`, name: "New stage", order: s.length + 1, avgDays: 1 }])} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><Plus className="size-4" />Add stage</button>
          <span className="text-sm text-muted tabular">Typical total: {stages.reduce((a, s) => a + s.avgDays, 0)} working days</span>
        </div>
      </Card>
      <p className="mt-3 text-sm text-muted">Examples: add &ldquo;Dyeing&rdquo; before cutting, or split &ldquo;Embroidery / Adda&rdquo; into hand and machine embroidery.</p>
    </div>
  );
}
