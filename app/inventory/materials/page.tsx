"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PackagePlus } from "lucide-react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { PageHeader, StatusBadge, Progress, Button, Stat } from "@/components/ui";
import { useQueryParam } from "@/lib/useQuery";
import { materials, materialStatus, getSupplier, num, inr, inrShort, type Material } from "@/lib/data";

const CATS = ["All categories", ...Array.from(new Set(materials.map((m) => m.category)))];

export default function MaterialsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All categories");
  const [status, setStatus] = useQueryParam("status", "all");
  const rows = useMemo(
    () => materials.filter((m) => (cat === "All categories" || m.category === cat) && (status === "all" || (status === "below" ? m.stock < m.minLevel : materialStatus(m) === "OK")) && (!q || m.name.toLowerCase().includes(q.toLowerCase()))),
    [q, cat, status],
  );
  const below = materials.filter((m) => m.stock < m.minLevel);

  const columns: Column<Material>[] = [
    { key: "id", label: "Code", value: (m) => m.id },
    { key: "name", label: "Material", value: (m) => m.name, render: (m) => <Link href={`/inventory/materials/${m.id}`} className="font-medium hover:underline">{m.name}</Link> },
    { key: "cat", label: "Category", value: (m) => m.category },
    { key: "stock", label: "In stock", align: "right", value: (m) => m.stock, render: (m) => `${num(m.stock, 1)} ${m.unit}` },
    { key: "min", label: "Minimum", align: "right", value: (m) => m.minLevel, render: (m) => `${num(m.minLevel)} ${m.unit}` },
    { key: "level", label: "Level", value: (m) => m.stock / m.minLevel, render: (m) => <span className="block w-24"><Progress value={m.stock} max={m.minLevel * 2} tone={materialStatus(m) === "Critical" ? "bad" : materialStatus(m) === "Low" ? "warn" : "good"} /></span> },
    { key: "status", label: "Status", value: (m) => materialStatus(m), render: (m) => <StatusBadge status={materialStatus(m)} /> },
    { key: "value", label: "Stock value", align: "right", value: (m) => Math.round(m.stock * m.cost), render: (m) => inr(m.stock * m.cost) },
    { key: "supplier", label: "Supplier", value: (m) => getSupplier(m.supplierId)?.name, render: (m) => <span className="text-muted">{getSupplier(m.supplierId)?.name}</span> },
  ];

  return (
    <>
      <PageHeader title="Raw materials" subtitle="Fabrics, threads, trims and packaging. Stock updates with every issue, return and receipt." actions={<Button href="/inventory/entry"><PackagePlus className="size-4" />Stock entry</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Materials tracked" value={materials.length} />
        <Stat label="Below minimum" value={below.length} tone="bad" hint="Highlighted on the dashboard" />
        <Stat label="Critical (under half the minimum)" value={materials.filter((m) => materialStatus(m) === "Critical").length} tone="bad" />
        <Stat label="Stock value" value={inrShort(materials.reduce((a, m) => a + m.stock * m.cost, 0))} />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        exportName="raw-materials"
        initialSort={{ key: "level", dir: "asc" }}
        toolbar={
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Search materials" />
            <Select label="Category" value={cat} onChange={setCat} options={CATS} />
            <Select label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All levels" }, { value: "below", label: "Below minimum" }, { value: "ok", label: "OK" }]} />
          </>
        }
      />
    </>
  );
}
