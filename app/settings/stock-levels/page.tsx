"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { categoryLevels, products, materials, finishedUnits } from "@/lib/data";

const input = "w-20 rounded-lg border border-line bg-card px-2.5 py-1.5 text-right text-sm tabular outline-none focus:border-ink/40";

export default function StockLevels() {
  const [fg, setFg] = useState<Record<string, number>>(() => Object.fromEntries(categoryLevels.finished.map((c) => [c.category, c.minPerStyle])));
  const [rm, setRm] = useState<Record<string, number>>(() => Object.fromEntries(categoryLevels.materials.map((c) => [c.category, c.defaultMin])));
  const [stuck, setStuck] = useState(categoryLevels.shipmentStuckDays);
  const [prDays, setPrDays] = useState(categoryLevels.prReminderDays);
  const [saved, setSaved] = useState(false);
  const touch = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setSaved(false); };

  return (
    <>
      <PageHeader
        title="Low-stock levels"
        subtitle="Set the minimum once per category. Anything below it is flagged on the dashboard and in inventory."
        actions={
          saved ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm text-good"><CircleCheck className="size-4" />Saved</span>
          ) : (
            <button onClick={() => setSaved(true)} className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-ink/85">Save levels</button>
          )
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Finished goods" pad={false}>
          <div className="scroll-x">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Styles</th>
                  <th className="px-4 py-2 text-right font-medium">Min ready pieces per style</th>
                  <th className="px-4 py-2 font-medium">Below now</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {categoryLevels.finished.map((c) => {
                  const styles = products.filter((p) => p.type === c.category);
                  const min = fg[c.category] ?? 0;
                  const below = min > 0 ? styles.filter((p) => finishedUnits(p) < min).length : 0;
                  return (
                    <tr key={c.category} className="border-b border-line/70 last:border-0">
                      <td className="px-4 py-2">{c.category}</td>
                      <td className="px-4 py-2 text-right">{styles.length}</td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" min={0} aria-label={`${c.category} minimum`} className={input} value={min} onChange={(e) => touch(setFg)({ ...fg, [c.category]: Math.max(0, Number(e.target.value)) })} />
                      </td>
                      <td className="px-4 py-2">{min === 0 ? <span className="text-xs text-muted">Not tracked</span> : below ? <Badge tone="warn">{below} below</Badge> : <Badge tone="good">All OK</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">Set 0 for made-to-order categories you don&apos;t keep ready. Sample stock is not counted.</p>
        </Card>

        <Card title="Raw materials" pad={false}>
          <div className="scroll-x">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Items</th>
                  <th className="px-4 py-2 text-right font-medium">Default minimum</th>
                  <th className="px-4 py-2 font-medium">Below now</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {categoryLevels.materials.map((c) => {
                  const items = materials.filter((m) => m.category === c.category);
                  const below = items.filter((m) => m.stock < m.minLevel).length;
                  return (
                    <tr key={c.category} className="border-b border-line/70 last:border-0">
                      <td className="px-4 py-2">{c.category}</td>
                      <td className="px-4 py-2 text-right">{items.length}</td>
                      <td className="px-4 py-2 text-right">
                        <span className="inline-flex items-center gap-2">
                          <input type="number" min={0} aria-label={`${c.category} default minimum`} className={input} value={rm[c.category] ?? 0} onChange={(e) => touch(setRm)({ ...rm, [c.category]: Math.max(0, Number(e.target.value)) })} />
                          <span className="w-16 text-left text-xs text-muted">{c.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2">{below ? <Badge tone="bad">{below} below</Badge> : <Badge tone="good">All OK</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">New materials start at their category default. Any item can override it with its own minimum on the material page, since units differ within a category.</p>
        </Card>
      </div>

      <Card className="mt-6" title={<span className="inline-flex items-center gap-2">Add-on alerts <Badge tone="rose">Add-on</Badge></span>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Shipment tracking: flag a shipment as not moving after</span>
            <span className="inline-flex items-center gap-2">
              <input type="number" min={1} className={input} value={stuck} onChange={(e) => touch(setStuck)(Math.max(1, Number(e.target.value)))} />
              days without a scan
            </span>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">PR tracker: remind the team before a piece is due back</span>
            <span className="inline-flex items-center gap-2">
              <input type="number" min={0} className={input} value={prDays} onChange={(e) => touch(setPrDays)(Math.max(0, Number(e.target.value)))} />
              days before the due date
            </span>
          </label>
        </div>
      </Card>
    </>
  );
}
