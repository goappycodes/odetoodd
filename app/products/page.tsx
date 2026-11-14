"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { PageHeader, Badge, Button } from "@/components/ui";
import { SearchBox, Select, ExportButton, downloadCsv } from "@/components/DataTable";
import { products, finishedUnits, sampleUnits, inr, getBom } from "@/lib/data";

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
        subtitle={`${products.length} products in the master, each with a bill of materials, a domestic price and an international price. Synced with Shopify by SKU.`}
        actions={<Button href="/settings/imports"><Upload className="size-4" />Upload products or BOMs</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, SKU, fabric" />
        <Select label="Type" value={type} onChange={setType} options={TYPES} />
        <span className="ml-auto text-xs text-muted">{rows.length} products</span>
        <ExportButton onClick={() => downloadCsv("products", ["SKU", "Name", "Type", "Fabric", "Colour", "Domestic price (INR)", "International price (USD)", "Sizes", "Finished stock", "Sample stock", "BOM lines"], rows.map((p) => [p.sku, p.name, p.type, p.fabric, p.colour, p.price, p.priceIntl, p.sizes.join(" "), finishedUnits(p), sampleUnits(p), getBom(p.id)?.lines.length]))} />
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
                <div className="mt-2 flex items-baseline justify-between gap-2 tabular">
                  <span>{inr(p.price)}</span>
                  <span className="text-xs text-muted" title="International price">US${p.priceIntl.toLocaleString("en-US")}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {fg > 0 ? <Badge tone="good">{fg} in stock</Badge> : <Badge>Made to order</Badge>}
                  {sampleUnits(p) > 0 && <Badge tone="rose">Sample</Badge>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
