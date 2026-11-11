"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { materials, productionOrders, suppliers, getMaterial, num, TODAY } from "@/lib/data";

const TYPES = [
  { id: "receive", label: "Receive from supplier", hint: "Goods received against a supplier bill" },
  { id: "issue", label: "Issue to production", hint: "Material handed to a karigar or vendor" },
  { id: "return", label: "Return from production", hint: "Unused material coming back" },
  { id: "adjust", label: "Stock count adjustment", hint: "Correct stock after a physical count" },
];
const input = "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink/40";

export default function StockEntry() {
  const [type, setType] = useState("issue");
  const [mat, setMat] = useState(materials[0].id);
  const [qty, setQty] = useState(5);
  const [done, setDone] = useState(false);
  const m = getMaterial(mat)!;
  const sign = type === "issue" ? -1 : 1;
  const after = type === "adjust" ? qty : m.stock + sign * qty;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Stock entry" subtitle="Record material received, issued or returned. Stock updates as soon as you save." />
      {done ? (
        <Card>
          <div className="py-6 text-center">
            <CircleCheck className="mx-auto size-10 text-good" />
            <p className="mt-3 font-medium">Entry saved</p>
            <p className="mt-1 text-sm text-muted">{m.name} is now {num(after, 1)} {m.unit}. This prototype doesn&apos;t save data.</p>
            <button onClick={() => setDone(false)} className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm text-paper">New entry</button>
          </div>
        </Card>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="space-y-6">
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPES.map((t) => (
              <button type="button" key={t.id} onClick={() => setType(t.id)} className={`rounded-xl border p-3 text-left text-sm ${type === t.id ? "border-ink bg-ink text-paper" : "border-line bg-card hover:bg-sand"}`}>
                <span className="block font-medium">{t.label}</span>
                <span className={`text-xs ${type === t.id ? "text-paper/70" : "text-muted"}`}>{t.hint}</span>
              </button>
            ))}
          </div>
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-muted">Material</span>
                <select className={input} value={mat} onChange={(e) => setMat(e.target.value)}>
                  {materials.map((x) => <option key={x.id} value={x.id}>{x.name} ({num(x.stock, 1)} {x.unit} in stock)</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">{type === "adjust" ? "Counted quantity" : "Quantity"} ({m.unit})</span>
                <input type="number" step="0.1" min={0} className={input} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Date</span>
                <input type="date" className={input} defaultValue={TODAY} />
              </label>
              {type === "receive" ? (
                <>
                  <label className="text-sm">
                    <span className="mb-1 block text-muted">Supplier</span>
                    <select className={input} defaultValue={m.supplierId}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-muted">Bill / GRN number</span>
                    <input className={input} placeholder="e.g. GRN-1024" />
                  </label>
                </>
              ) : type !== "adjust" ? (
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted">Production order</span>
                  <select className={input}>{productionOrders.filter((p) => p.status !== "Completed").slice(0, 40).map((p) => <option key={p.id}>{p.id} · {p.orderRef}</option>)}</select>
                </label>
              ) : (
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted">Reason</span>
                  <input className={input} placeholder="e.g. Monthly stock count" />
                </label>
              )}
            </div>
            <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${after < m.minLevel ? "bg-warn-soft text-warn" : "bg-sand"}`}>
              Stock after this entry: <span className="font-medium tabular">{num(after, 1)} {m.unit}</span> (minimum {num(m.minLevel)}){after < 0 && " · not enough stock"}
            </div>
          </Card>
          <button type="submit" disabled={after < 0} className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40">Save entry</button>
        </form>
      )}
    </div>
  );
}
