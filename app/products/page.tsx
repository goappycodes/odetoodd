"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { PageHeader, Badge, Button } from "@/components/ui";
import { SearchBox, Select, ExportButton, downloadCsv } from "@/components/DataTable";
import { products, finishedUnits, inr, getBom } from "@/lib/data";

const TYPES = ["All types", ...Array.from(new Set(products.map((p) => p.type)))];

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("All types");
  const rows = useMemo(
    () => products.filter((p) => (type === "All types" || p.type === type) && (!q || `${p.name} ${p.sku} ${p.fabric} ${p.colour}`.toLowerCase().includes(q.toLowerCase()))),
    [q, type],
  );
  return (
    <>
      <PageHeader
        title="Products and BOMs"
        subtitle={`${products.length} products in the master, each with a bill of materials. Synced with Shopify by SKU.`}
        actions={<Button href="/settings/imports"><Upload className="size-4" />Upload products or BOMs</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, SKU, fabric" />
        <Select label="Type" value={type} onChange={setType} options={TYPES} />
        <span className="ml-auto text-xs text-muted">{rows.length} products</span>
        <ExportButton onClick={() => downloadCsv("products", ["SKU", "Name", "Type", "Fabric", "Colour", "Price", "Sizes", "Finished stock", "BOM lines"], rows.map((p) => [p.sku, p.name, p.type, p.fabric, p.colour, p.price, p.sizes.join(" "), finishedUnits(p), getBom(p.id)?.lines.length]))} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rows.map((p) => {
          const fg = finishedUnits(p);
          return (
            <Link key={p.id} href={`/products/${p.id}`} className="group overflow-hidden rounded-xl border border-line bg-card hover:border-ink/30">
              <div className="aspect-[3/4] overflow-hidden bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              </div>
              <div className="p-3 text-sm">
                <p className="truncate font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted">{p.sku} · {p.fabric}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="tabular">{inr(p.price)}</span>
                  {fg > 0 ? <Badge tone="good">{fg} in stock</Badge> : <Badge>Made to order</Badge>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
