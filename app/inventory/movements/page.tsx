"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { PageHeader, Badge } from "@/components/ui";
import { movements, getMaterial, getProduct, fmtDate, num, orders } from "@/lib/data";

type Mv = (typeof movements)[number];
const TYPES = ["All types", "Received", "Issued", "Consumed", "Returned", "Produced", "Dispatched"];
const itemName = (m: Mv) => (m.itemType === "Material" ? getMaterial(m.itemId)?.name : `${getProduct(m.itemId)?.name}${"size" in m && m.size ? ` · ${m.size}` : ""}`) ?? m.itemId;

export default function Movements() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("All types");
  const [kind, setKind] = useState("All items");
  const rows = useMemo(
    () => movements.filter((m) => (type === "All types" || m.type === type) && (kind === "All items" || m.itemType === kind) && (!q || `${itemName(m)} ${m.ref} ${m.by}`.toLowerCase().includes(q.toLowerCase()))),
    [q, type, kind],
  );
  const refLink = (ref: string) => {
    if (ref.startsWith("PO-")) return <Link href={`/production/${ref}`} className="hover:underline">{ref}</Link>;
    const o = orders.find((x) => x.ref === ref);
    return o ? <Link href={`/orders/${o.id}`} className="hover:underline">{ref}</Link> : ref;
  };
  const columns: Column<Mv>[] = [
    { key: "date", label: "Date", value: (m) => m.date, render: (m) => fmtDate(m.date) },
    { key: "id", label: "Entry", value: (m) => m.id, render: (m) => <span className="text-muted">{m.id}</span> },
    { key: "type", label: "Type", value: (m) => m.type, render: (m) => <Badge tone={m.qty > 0 ? "good" : m.type === "Dispatched" ? "info" : "neutral"}>{m.type}</Badge> },
    { key: "item", label: "Item", value: (m) => itemName(m), render: (m) => <Link href={m.itemType === "Material" ? `/inventory/materials/${m.itemId}` : `/products/${m.itemId}`} className="hover:underline">{itemName(m)}</Link> },
    { key: "qty", label: "Qty", align: "right", value: (m) => m.qty, render: (m) => <span className={m.qty > 0 ? "text-good" : ""}>{m.qty > 0 ? "+" : ""}{num(m.qty, 1)} {m.unit}</span> },
    { key: "ref", label: "Reference", value: (m) => m.ref, render: (m) => refLink(m.ref) },
    { key: "by", label: "Entered by", value: (m) => m.by, render: (m) => <span className="text-muted">{m.by}</span> },
  ];
  return (
    <>
      <PageHeader title="Stock movements" subtitle="Every change to stock, with who made it and why. Entries can't be edited or deleted, only reversed." />
      <DataTable rows={rows} columns={columns} exportName="stock-movements" toolbar={<><SearchBox value={q} onChange={setQ} placeholder="Search item, reference, person" /><Select label="Type" value={type} onChange={setType} options={TYPES} /><Select label="Item kind" value={kind} onChange={setKind} options={["All items", "Material", "Product"]} /></>} />
    </>
  );
}
