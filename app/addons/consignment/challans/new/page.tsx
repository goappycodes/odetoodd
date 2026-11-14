"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CircleCheck, Plus, Trash2 } from "lucide-react";
import { AddonBanner, Badge, Card, PageHeader } from "@/components/ui";
import { challans, stores, products, getProduct, getStore, sizeStock, inr, TODAY } from "@/lib/data";

type Line = { productId: string; size: string; qty: number };
const input = "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink/40";
const PROVIDERS = ["Blue Dart", "DHL Express", "Delhivery"];

const nextNo = (ids: string[], prefix: string, pad: number) => {
  const max = Math.max(...ids.filter((x) => x.startsWith(prefix)).map((x) => Number(x.slice(prefix.length))));
  return `${prefix}${String(max + 1).padStart(pad, "0")}`;
};
const NEXT_DC = nextNo(challans.map((c) => c.id), "DC-2627-", 3);
const NEXT_CON = nextNo(challans.map((c) => c.orderId), "CON-", 3);
const stocked = products.filter((p) => Object.values(sizeStock(p)).some((n) => n > 0));
const sizesWithStock = (id: string) => {
  const s = sizeStock(getProduct(id)!);
  const withStock = Object.keys(s).filter((k) => s[k] > 0);
  return withStock.length ? withStock : Object.keys(s);
};
const firstLine = (p = stocked[0]): Line => ({ productId: p.id, size: sizesWithStock(p.id)[0], qty: 1 });

export default function NewChallan() {
  const [store, setStore] = useState(stores[0].id);
  const [lines, setLines] = useState<Line[]>([firstLine(stocked[0]), firstLine(stocked[1])]);
  const [mode, setMode] = useState("Courier");
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [awb, setAwb] = useState("");
  const [created, setCreated] = useState(false);

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const checked = lines.map((l) => {
    const p = getProduct(l.productId)!;
    const available = sizeStock(p)[l.size] ?? 0;
    return { l, p, available, short: l.qty > available };
  });
  const pieces = lines.reduce((a, l) => a + l.qty, 0);
  const value = checked.reduce((a, c) => a + c.l.qty * c.p.price, 0);
  const shortLines = checked.filter((c) => c.short).length;
  const s = getStore(store)!;

  if (created)
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <CircleCheck className="mx-auto size-12 text-good" />
        <h1 className="mt-4 font-serif text-3xl">Challan {NEXT_DC} created</h1>
        <p className="mt-2 text-sm text-muted">
          In the live system this creates challan {NEXT_DC} and order {NEXT_CON} for {s.name}, moves {pieces} pieces ({inr(value)} at MRP) from finished goods to the store&apos;s consignment stock{mode === "Courier" && awb ? `, and starts tracking ${provider} AWB ${awb}` : ""}. This prototype doesn&apos;t save data.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/addons/consignment/challans/${challans[0].id}`} className="rounded-lg bg-ink px-4 py-2 text-sm text-paper">See a print preview</Link>
          <button onClick={() => setCreated(false)} className="rounded-lg border border-line bg-card px-4 py-2 text-sm hover:bg-sand">Send more stock</button>
        </div>
      </div>
    );

  return (
    <>
      <PageHeader back={{ href: "/addons/consignment/challans", label: "Challans" }} title="Send stock to a store" subtitle={`Creates challan ${NEXT_DC} and order ${NEXT_CON}. Stock moves from finished goods to the store once the challan is saved.`} />
      <AddonBanner title="Consignment management" price="₹20,000">Part of the consignment add-on.</AddonBanner>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCreated(true);
        }}
        className="grid gap-6 xl:grid-cols-3"
      >
        <div className="space-y-6 xl:col-span-2">
          <Card title="Store and transport">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Store</span>
                <select className={input} value={store} onChange={(e) => setStore(e.target.value)}>
                  {stores.map((x) => <option key={x.id} value={x.id}>{x.name}, {x.city}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Challan date</span>
                <input type="date" className={input} defaultValue={TODAY} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Transport</span>
                <select className={input} value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option>Courier</option>
                  <option>Hand delivery</option>
                </select>
              </label>
              {mode === "Courier" ? (
                <>
                  <label className="text-sm">
                    <span className="mb-1 block text-muted">Courier</span>
                    <select className={input} value={provider} onChange={(e) => setProvider(e.target.value)}>
                      {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="mb-1 block text-muted">AWB number (optional, can be added at dispatch)</span>
                    <input className={input} value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="e.g. 78329516392" />
                  </label>
                </>
              ) : (
                <p className="self-end pb-2 text-sm text-muted">Delivered by studio staff. The store signs the challan on receipt.</p>
              )}
            </div>
          </Card>

          <Card
            title="Pieces"
            action={<button type="button" onClick={() => setLines((l) => [...l, firstLine(stocked[l.length % stocked.length])])} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Plus className="size-4" />Add line</button>}
          >
            <div className="space-y-3">
              {checked.map(({ l, p, available, short }, i) => (
                <div key={i} className={`grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-[2fr_1fr_80px_auto] sm:items-end ${short ? "border-warn/40 bg-warn-soft/40" : "border-line"}`}>
                  <label className="col-span-2 text-sm sm:col-span-1">
                    <span className="mb-1 block text-xs text-muted">Product</span>
                    <select className={input} value={l.productId} onChange={(e) => update(i, { productId: e.target.value, size: sizesWithStock(e.target.value)[0] })}>
                      {products.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.sku}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted">Size</span>
                    <select className={input} value={l.size} onChange={(e) => update(i, { size: e.target.value })}>
                      {Object.entries(sizeStock(p)).map(([sz, n]) => <option key={sz} value={sz}>{sz} ({n} in stock)</option>)}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted">Qty</span>
                    <input type="number" min={1} className={input} value={l.qty} onChange={(e) => update(i, { qty: Math.max(1, Number(e.target.value)) })} />
                  </label>
                  <button type="button" aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="justify-self-end rounded-md p-2 text-muted hover:bg-sand hover:text-bad">
                    <Trash2 className="size-4" />
                  </button>
                  <p className="col-span-2 text-xs sm:col-span-4">
                    {short ? (
                      <span className="inline-flex items-center gap-1 text-warn"><AlertTriangle className="size-3.5" />Only {available} in finished stock. Make the rest first, or reduce the quantity.</span>
                    ) : (
                      <span className="text-muted">{available} in finished stock · MRP {inr(p.price)}</span>
                    )}
                  </p>
                </div>
              ))}
              {lines.length === 0 && <p className="text-sm text-muted">Add at least one line.</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Challan preview">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Challan</dt><dd className="tabular">{NEXT_DC}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Order</dt><dd className="tabular">{NEXT_CON}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Store</dt><dd>{s.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Lines</dt><dd className="tabular">{lines.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Pieces</dt><dd className="tabular">{pieces}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Value at MRP</dt><dd className="tabular">{inr(value)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Purpose on the challan: supply on consignment (sale or return), not a sale.</p>
            {shortLines > 0 && <p className="mt-3"><Badge tone="warn">{shortLines} line{shortLines > 1 ? "s" : ""} short of stock</Badge></p>}
          </Card>
          <button type="submit" disabled={lines.length === 0} className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50">Create challan</button>
        </div>
      </form>
    </>
  );
}
