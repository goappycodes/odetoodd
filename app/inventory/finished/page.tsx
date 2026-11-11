"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { PageHeader, Stat, Badge, ProductThumb } from "@/components/ui";
import { products, finishedUnits, sizeStock, inr, inrShort, productionOrders, type Product } from "@/lib/data";

export default function FinishedGoods() {
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");
  const rows = useMemo(
    () => products.filter((p) => (show === "all" || (show === "in" ? finishedUnits(p) > 0 : finishedUnits(p) < p.minStock)) && (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()))),
    [q, show],
  );
  const units = products.reduce((a, p) => a + finishedUnits(p), 0);
  const value = products.reduce((a, p) => a + finishedUnits(p) * p.price, 0);
  const making = (id: string) => productionOrders.filter((x) => x.productId === id && x.status !== "Completed").reduce((a, x) => a + x.qty, 0);

  const columns: Column<Product>[] = [
    { key: "name", label: "Product", value: (p) => p.name, render: (p) => <Link href={`/products/${p.id}`} className="flex items-center gap-2 hover:underline"><ProductThumb src={p.image} alt={p.name} size={26} /><span>{p.name}<span className="block text-xs text-muted">{p.sku}</span></span></Link> },
    { key: "sizes", label: "By size", value: (p) => Object.entries(sizeStock(p)).map(([s, n]) => `${s}:${n}`).join(" "), render: (p) => (
      <span className="flex flex-wrap gap-1">{Object.entries(sizeStock(p)).map(([s, n]) => <span key={s} className={`rounded px-1.5 py-0.5 text-xs tabular ${n > 0 ? "bg-good-soft text-good" : "bg-sand text-faint"}`}>{s} {n}</span>)}</span>
    ) },
    { key: "units", label: "Total", align: "right", value: (p) => finishedUnits(p) },
    { key: "min", label: "Minimum", align: "right", value: (p) => p.minStock, render: (p) => (p.minStock ? p.minStock : "—") },
    { key: "making", label: "In production", align: "right", value: (p) => making(p.id), render: (p) => making(p.id) || "—" },
    { key: "value", label: "Value at retail", align: "right", value: (p) => finishedUnits(p) * p.price, render: (p) => inr(finishedUnits(p) * p.price) },
    { key: "flag", label: "", value: (p) => (finishedUnits(p) < p.minStock ? "Below minimum" : ""), render: (p) => (finishedUnits(p) < p.minStock ? <Badge tone="warn">Below minimum</Badge> : null) },
  ];

  return (
    <>
      <PageHeader title="Finished goods" subtitle="Ready pieces by size. Stock goes up when production completes and down on dispatch." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pieces in stock" value={units} />
        <Stat label="Value at retail" value={inrShort(value)} />
        <Stat label="Products with stock" value={products.filter((p) => finishedUnits(p) > 0).length} hint={`of ${products.length}`} />
        <Stat label="Below minimum" value={products.filter((p) => finishedUnits(p) < p.minStock).length} tone="warn" hint="Ready-to-ship styles" />
      </div>
      <DataTable rows={rows} columns={columns} exportName="finished-goods" initialSort={{ key: "units", dir: "desc" }} toolbar={<><SearchBox value={q} onChange={setQ} placeholder="Search product or SKU" /><Select label="Show" value={show} onChange={setShow} options={[{ value: "all", label: "All products" }, { value: "in", label: "In stock" }, { value: "below", label: "Below minimum" }]} /></>} />
    </>
  );
}
