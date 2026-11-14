"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, Plus, Trash2, AlertTriangle, Info } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import {
  products, orders, getProduct, getBom, getMaterial, inr, num, addDays, sizeStock, TODAY, CUSTOM_MARKUP, USD_RATE, type Product,
} from "@/lib/data";

type Line = { productId: string; size: string; qty: number; price: number };
type SourceKey = "Wholesale" | "Events" | "Offline";
type Market = "Domestic" | "International";
const input = "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink/40";

const SOURCES: { key: SourceKey; prefix: string; label: string }[] = [
  { key: "Wholesale", prefix: "WHO", label: "Wholesale (WHO)" },
  { key: "Events", prefix: "EV", label: "Events (EV)" },
  { key: "Offline", prefix: "OF", label: "Studio and offline (OF)" },
];

/** Next number in a prefix's series, from the highest number already used */
function nextNumber(prefix: string) {
  const nums = orders.filter((o) => o.ref.startsWith(prefix + "-")).map((o) => Number(o.ref.slice(prefix.length + 1))).filter((n) => !Number.isNaN(n));
  return `${prefix}-${(nums.length ? Math.max(...nums) : 100) + 1}`;
}

/** Unit price in INR from the right price list. International prices are set in US$. */
function unitPrice(p: Product, source: SourceKey, market: Market) {
  if (source === "Wholesale") return Math.round(p.price * 0.55);
  return market === "International" ? p.priceIntl * USD_RATE : p.price;
}

export default function NewOrder() {
  const [source, setSource] = useState<SourceKey>("Wholesale");
  const [market, setMarket] = useState<Market>("Domestic");
  const [custom, setCustom] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ productId: products[0].id, size: products[0].sizes[1] ?? products[0].sizes[0], qty: 4, price: unitPrice(products[0], "Wholesale", "Domestic") }]);
  const [saved, setSaved] = useState(false);

  const prefix = SOURCES.find((s) => s.key === source)!.prefix;
  const number = nextNumber(prefix);
  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const reprice = (s: SourceKey, m: Market) => setLines((ls) => ls.map((l) => ({ ...l, price: unitPrice(getProduct(l.productId)!, s, m) })));

  const subtotal = lines.reduce((a, l) => a + l.qty * l.price, 0);
  const markup = custom ? Math.round(subtotal * CUSTOM_MARKUP) : 0;
  const total = subtotal + markup;
  const intl = market === "International" && source !== "Wholesale";

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
        <h1 className="mt-4 font-serif text-3xl">Order {number} saved</h1>
        <p className="mt-2 text-sm text-muted">
          In the live system this creates order {number}{custom ? ` with a ${inr(markup)} custom markup` : ""}, reserves finished stock and raises {check.filter((c) => c.toMake > 0).length} production order(s). This prototype doesn&apos;t save data.
        </p>
        <button onClick={() => setSaved(false)} className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm text-paper">Enter another order</button>
      </div>
    );

  return (
    <>
      <PageHeader back={{ href: "/orders", label: "Orders" }} title="New order" subtitle="For wholesale buyers, events, studio walk-ins, WhatsApp and Instagram orders." />
      <p className="mb-6 flex items-start gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Shopify orders (SH) arrive automatically. Consignment orders (CON) are created when you{" "}
          <Link href="/addons/consignment/challans/new" className="text-ink underline">send stock to a store on a challan</Link>. Many orders at once?{" "}
          <Link href="/settings/imports?kind=orders" className="text-ink underline">Import a CSV</Link>.
        </span>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
        className="grid gap-6 xl:grid-cols-3"
      >
        <div className="space-y-6 xl:col-span-2">
          <Card title="Order" action={<span className="inline-flex items-center gap-2 text-sm text-muted">Order number <Badge tone="info">{number}</Badge></span>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Source</span>
                <select className={input} value={source} onChange={(e) => { const s = e.target.value as SourceKey; setSource(s); reprice(s, market); }}>
                  {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">{source === "Wholesale" ? "Buyer / store" : "Customer name"}</span>
                <input key={source} className={input} required defaultValue={source === "Wholesale" ? "The Loom Store" : ""} />
              </label>
              {source === "Events" && (
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Event</span>
                  <input className={input} required defaultValue="Jaipur trunk show" placeholder="Event name" />
                </label>
              )}
              {source === "Offline" && (
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Came in through</span>
                  <select className={input}><option>Jaipur studio</option><option>WhatsApp order</option><option>Instagram DM</option></select>
                </label>
              )}
              {source === "Wholesale" && (
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Buyer PO number</span>
                  <input className={input} placeholder="Optional" />
                </label>
              )}
              <label className="text-sm">
                <span className="mb-1 block text-muted">City</span>
                <input className={input} defaultValue={market === "International" ? "London" : "Mumbai"} key={market} />
              </label>
              <div className="text-sm">
                <span className="mb-1 block text-muted">Market and price list</span>
                <div className="inline-flex rounded-lg border border-line bg-card p-0.5" role="radiogroup" aria-label="Market">
                  {(["Domestic", "International"] as Market[]).map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={market === m} onClick={() => { setMarket(m); reprice(source, m); }} className={`rounded-md px-3 py-1.5 text-sm ${market === m ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}>{m}</button>
                  ))}
                </div>
                <span className="mt-1 block text-xs text-muted">{source === "Wholesale" ? "Wholesale uses 55% of the domestic price." : market === "International" ? `International prices in US$, shown in ₹ at ${USD_RATE}.` : "Domestic prices in ₹."}</span>
              </div>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Order date</span>
                <input type="date" className={input} defaultValue={TODAY} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Due date</span>
                <input type="date" className={input} key={source} defaultValue={addDays(TODAY, source === "Wholesale" ? 40 : 30)} />
              </label>
            </div>
            <label className={`mt-4 flex items-start gap-3 rounded-lg border p-3 text-sm ${custom ? "border-rose/40 bg-rose-soft/50" : "border-line"}`}>
              <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-rose)]" />
              <span>
                <span className="font-medium">Custom order</span>
                <span className="block text-muted">Design changes on an existing SKU, such as sleeve length, neckline or embroidery placement. Adds a 10% markup to the order.</span>
              </span>
            </label>
          </Card>

          <Card title="Items" action={<button type="button" onClick={() => setLines((l) => [...l, { productId: products[3].id, size: products[3].sizes[0], qty: 1, price: unitPrice(products[3], source, market) }])} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Plus className="size-4" />Add item</button>}>
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
                          update(i, { productId: np.id, size: np.sizes[0], price: unitPrice(np, source, market) });
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
                      <span className="mb-1 block text-xs text-muted">{intl ? `Price (₹, from $${p.priceIntl})` : "Price (₹)"}</span>
                      <input type="number" className={input} value={l.price} onChange={(e) => update(i, { price: Number(e.target.value) })} />
                    </label>
                    <button type="button" aria-label="Remove item" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="justify-self-end rounded-md p-2 text-muted hover:bg-sand hover:text-bad">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm tabular">
              <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd>{inr(subtotal)}</dd></div>
              {custom && <div className="flex justify-between text-rose"><dt>Custom order markup (10%)</dt><dd>+ {inr(markup)}</dd></div>}
              <div className="flex justify-between font-medium"><dt>Total</dt><dd>{inr(total)}{intl && <span className="ml-1 text-xs font-normal text-muted">(${num(total / USD_RATE)})</span>}</dd></div>
            </dl>
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
          <button type="submit" className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/85">Save {number} and create production orders</button>
        </div>
      </form>
    </>
  );
}
