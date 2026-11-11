"use client";

import { useState } from "react";
import { CircleCheck, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { products, getProduct, getBom, getMaterial, inr, num, addDays, sizeStock, TODAY } from "@/lib/data";

type Line = { productId: string; size: string; qty: number; price: number };
const input = "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink/40";

export default function NewOrder() {
  const [channel, setChannel] = useState("Wholesale");
  const [lines, setLines] = useState<Line[]>([{ productId: products[0].id, size: products[0].sizes[1] ?? products[0].sizes[0], qty: 4, price: Math.round(products[0].price * 0.55) }]);
  const [saved, setSaved] = useState(false);

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((a, l) => a + l.qty * l.price, 0);

  // material needed for everything that has to be made
  const need = new Map<string, number>();
  const check = lines.map((l) => {
    const p = getProduct(l.productId)!;
    const inStock = sizeStock(p)[l.size] ?? 0;
    const toMake = Math.max(0, l.qty - inStock);
    for (const b of getBom(p.id)?.lines ?? []) need.set(b.materialId, (need.get(b.materialId) ?? 0) + b.qty * toMake);
    return { p, inStock, toMake, l };
  });
  const shortages = [...need.entries()].map(([id, q]) => ({ m: getMaterial(id)!, q })).filter((x) => x.q > x.m.stock);

  if (saved)
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <CircleCheck className="mx-auto size-12 text-good" />
        <h1 className="mt-4 font-serif text-3xl">Order saved</h1>
        <p className="mt-2 text-sm text-muted">
          In the live system this creates order OF-318, reserves finished stock and raises {check.filter((c) => c.toMake > 0).length} production order(s). This prototype doesn&apos;t save data.
        </p>
        <button onClick={() => setSaved(false)} className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm text-paper">Enter another order</button>
      </div>
    );

  return (
    <>
      <PageHeader back={{ href: "/orders", label: "Orders" }} title="New offline order" subtitle="For wholesale buyers, studio walk-ins, WhatsApp and exhibition orders." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
        className="grid gap-6 xl:grid-cols-3"
      >
        <div className="space-y-6 xl:col-span-2">
          <Card title="Customer">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Channel</span>
                <select className={input} value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option>Wholesale</option>
                  <option>Offline</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">{channel === "Wholesale" ? "Buyer / store" : "Customer name"}</span>
                <input className={input} required defaultValue={channel === "Wholesale" ? "The Loom Store" : ""} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">City</span>
                <input className={input} defaultValue="Mumbai" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Source</span>
                <select className={input}>
                  {channel === "Wholesale" ? <option>Buyer purchase order</option> : <><option>Jaipur studio</option><option>WhatsApp order</option><option>Exhibition</option></>}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Order date</span>
                <input type="date" className={input} defaultValue={TODAY} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Due date</span>
                <input type="date" className={input} defaultValue={addDays(TODAY, channel === "Wholesale" ? 40 : 30)} />
              </label>
            </div>
          </Card>

          <Card title="Items" action={<button type="button" onClick={() => setLines((l) => [...l, { productId: products[3].id, size: products[3].sizes[0], qty: 1, price: products[3].price }])} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Plus className="size-4" />Add item</button>}>
            <div className="space-y-3">
              {lines.map((l, i) => {
                const p = getProduct(l.productId)!;
                return (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3 sm:grid-cols-[2fr_1fr_80px_1fr_auto] sm:items-end">
                    <label className="col-span-2 text-sm sm:col-span-1">
                      <span className="mb-1 block text-xs text-muted">Product</span>
                      <select
                        className={input}
                        value={l.productId}
                        onChange={(e) => {
                          const np = getProduct(e.target.value)!;
                          update(i, { productId: np.id, size: np.sizes[0], price: channel === "Wholesale" ? Math.round(np.price * 0.55) : np.price });
                        }}
                      >
                        {products.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.sku}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-xs text-muted">Size</span>
                      <select className={input} value={l.size} onChange={(e) => update(i, { size: e.target.value })}>
                        {p.sizes.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-xs text-muted">Qty</span>
                      <input type="number" min={1} className={input} value={l.qty} onChange={(e) => update(i, { qty: Math.max(1, Number(e.target.value)) })} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-xs text-muted">Price (₹)</span>
                      <input type="number" className={input} value={l.price} onChange={(e) => update(i, { price: Number(e.target.value) })} />
                    </label>
                    <button type="button" aria-label="Remove item" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="justify-self-end rounded-md p-2 text-muted hover:bg-sand hover:text-bad">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-between border-t border-line pt-3 text-sm font-medium tabular">
              <span>Total</span>
              <span>{inr(total)}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Stock check">
            <ul className="space-y-3 text-sm">
              {check.map(({ p, inStock, toMake, l }, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{p.name}</span>
                    <span className="text-xs text-muted">{l.size} · {inStock} in stock</span>
                  </span>
                  {toMake > 0 ? <Badge tone="warn">Make {toMake}</Badge> : <Badge tone="good">From stock</Badge>}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Material check">
            {shortages.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-good"><CircleCheck className="size-4" />All materials available for this order.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {shortages.map(({ m, q }) => (
                  <li key={m.id} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
                    <span>{m.name}: need {num(q, 1)} {m.unit}, have {num(m.stock, 1)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <button type="submit" className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/85">Save order and create production orders</button>
        </div>
      </form>
    </>
  );
}
