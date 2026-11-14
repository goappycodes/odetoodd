"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { PageHeader, Stat, Badge, ProductThumb } from "@/components/ui";
import { useQueryParam } from "@/lib/useQuery";
import {
  products, finishedUnits, sizeStock, sampleStock, sampleUnits, inr, inrShort, productionOrders, fgCategoryMin, belowCategoryMin, prOut,
  type Product,
} from "@/lib/data";

const out = prOut();
const outOnPr = (id: string, type: "Main" | "Sample") => out.filter((l) => l.productId === id && l.stockType === type).reduce((a, l) => a + l.qty, 0);
const sizeChips = (stock: Record<string, number>, tone: "good" | "rose") => (
  <span className="flex flex-wrap gap-1">
    {Object.entries(stock).map(([s, n]) => (
      <span key={s} className={`rounded px-1.5 py-0.5 text-xs tabular ${n > 0 ? (tone === "good" ? "bg-good-soft text-good" : "bg-rose-soft text-rose") : "bg-sand text-faint"}`}>{s} {n}</span>
    ))}
  </span>
);
const productCell = (p: Product) => (
  <Link href={`/products/${p.id}`} className="flex items-center gap-2 hover:underline">
    <ProductThumb src={p.image} alt={p.name} size={26} />
    <span>{p.name}<span className="block text-xs text-muted">{p.sku} · {p.type}</span></span>
  </Link>
);

export default function FinishedGoods() {
  const [view, setView] = useQueryParam("view", "main");
  const [q, setQ] = useState("");
  const [show, setShow] = useQueryParam("show", "all");
  const isSample = view === "sample";

  const rows = useMemo(
    () =>
      products.filter((p) => {
        if (q && !`${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (isSample) return show === "all" || (show === "in" ? sampleUnits(p) > 0 : outOnPr(p.id, "Sample") > 0);
        return show === "all" || (show === "in" ? finishedUnits(p) > 0 : show === "below" ? belowCategoryMin(p) : outOnPr(p.id, "Main") > 0);
      }),
    [q, show, isSample],
  );

  const units = products.reduce((a, p) => a + finishedUnits(p), 0);
  const value = products.reduce((a, p) => a + finishedUnits(p) * p.price, 0);
  const samples = products.reduce((a, p) => a + sampleUnits(p), 0);
  const samplesOut = out.filter((l) => l.stockType === "Sample").reduce((a, l) => a + l.qty, 0);
  const below = products.filter(belowCategoryMin).length;
  const making = (id: string) => productionOrders.filter((x) => x.productId === id && x.status !== "Completed").reduce((a, x) => a + x.qty, 0);

  const mainColumns: Column<Product>[] = [
    { key: "name", label: "Product", value: (p) => p.name, render: productCell },
    { key: "sizes", label: "By size", value: (p) => Object.entries(sizeStock(p)).map(([s, n]) => `${s}:${n}`).join(" "), render: (p) => sizeChips(sizeStock(p), "good") },
    { key: "units", label: "Total", align: "right", value: (p) => finishedUnits(p) },
    { key: "min", label: "Category minimum", align: "right", value: (p) => fgCategoryMin(p.type), render: (p) => fgCategoryMin(p.type) || "None" },
    { key: "pr", label: "Out on PR", align: "right", value: (p) => outOnPr(p.id, "Main"), render: (p) => outOnPr(p.id, "Main") || "None" },
    { key: "making", label: "In production", align: "right", value: (p) => making(p.id), render: (p) => making(p.id) || "None" },
    { key: "value", label: "Value at retail", align: "right", value: (p) => finishedUnits(p) * p.price, render: (p) => inr(finishedUnits(p) * p.price) },
    { key: "flag", label: "", value: (p) => (belowCategoryMin(p) ? "Below minimum" : ""), render: (p) => (belowCategoryMin(p) ? <Badge tone="warn">Below minimum</Badge> : null) },
  ];

  const sampleColumns: Column<Product>[] = [
    { key: "name", label: "Product", value: (p) => p.name, render: productCell },
    { key: "sizes", label: "Sample pieces", value: (p) => Object.entries(sampleStock(p)).map(([s, n]) => `${s}:${n}`).join(" "), render: (p) => (sampleUnits(p) ? sizeChips(sampleStock(p), "rose") : <span className="text-xs text-faint">No samples</span>) },
    { key: "units", label: "Total", align: "right", value: (p) => sampleUnits(p) },
    { key: "pr", label: "Out on PR", align: "right", value: (p) => outOnPr(p.id, "Sample"), render: (p) => outOnPr(p.id, "Sample") || "None" },
    { key: "avail", label: "Available", align: "right", value: (p) => Math.max(0, sampleUnits(p) - outOnPr(p.id, "Sample")) },
    { key: "flag", label: "", value: (p) => (outOnPr(p.id, "Sample") ? "On PR" : ""), render: (p) => (outOnPr(p.id, "Sample") ? <Link href="/addons/pr-tracker"><Badge tone="info">On PR</Badge></Link> : null) },
  ];

  const tab = (id: string, label: string) => (
    <button
      onClick={() => { setView(id); setShow("all"); }}
      className={`rounded-lg px-3 py-1.5 text-sm ${view === id ? "bg-ink text-paper" : "text-ink/80 hover:bg-sand"}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <PageHeader
        title="Finished goods"
        subtitle={
          <>
            Ready pieces by size. Sample stock is kept as its own inventory. Low-stock minimums are set per category in{" "}
            <Link href="/settings/stock-levels" className="underline hover:text-ink">Low-stock levels</Link>.
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Main stock" value={units} hint={`${inrShort(value)} at retail`} />
        <Stat label="Sample stock" value={samples} hint={`${samplesOut} out on PR now`} />
        <Stat label="Products with main stock" value={products.filter((p) => finishedUnits(p) > 0).length} hint={`of ${products.length}`} />
        <Stat label="Below category minimum" value={below} tone={below ? "warn" : "good"} hint="Flagged on the dashboard" />
      </div>
      <div className="mb-3 inline-flex gap-1 rounded-xl border border-line bg-card p-1">
        {tab("main", "Main stock")}
        {tab("sample", "Sample stock")}
      </div>
      <DataTable
        key={view}
        rows={rows}
        columns={isSample ? sampleColumns : mainColumns}
        exportName={isSample ? "sample-stock" : "finished-goods"}
        initialSort={{ key: "units", dir: "desc" }}
        rowClassName={(p) => (!isSample && belowCategoryMin(p) ? "bg-warn-soft/40" : "")}
        toolbar={
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Search product or SKU" />
            <Select
              label="Show"
              value={show}
              onChange={setShow}
              options={
                isSample
                  ? [{ value: "all", label: "All products" }, { value: "in", label: "Has samples" }, { value: "pr", label: "Out on PR" }]
                  : [{ value: "all", label: "All products" }, { value: "in", label: "In stock" }, { value: "below", label: "Below category minimum" }, { value: "pr", label: "Out on PR" }]
              }
            />
          </>
        }
      />
    </>
  );
}
