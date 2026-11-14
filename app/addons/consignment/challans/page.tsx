"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { AddonBanner, Button, PageHeader, Stat, StatusBadge } from "@/components/ui";
import { challans, consignmentStock, stores, getStore, shipmentForOrder, inr, fmtDate, TODAY, type Challan } from "@/lib/data";

const transportOf = (c: Challan) => {
  if (c.transport.mode === "Hand delivery") return "Hand delivery";
  const sh = shipmentForOrder(c.orderId);
  return sh ? `${sh.provider} ${sh.awb}` : `${c.transport.provider ?? "Courier"}, AWB not added yet`;
};

export default function ChallansPage() {
  const [q, setQ] = useState("");
  const [store, setStore] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = useMemo(
    () =>
      challans.filter((c) => {
        if (store !== "all" && c.storeId !== store) return false;
        if (status !== "all" && c.status !== status) return false;
        if (q && !`${c.id} ${c.orderId} ${transportOf(c)}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [q, store, status],
  );
  const month = TODAY.slice(0, 7);
  const thisMonth = challans.filter((c) => c.date.startsWith(month));
  const atStores = consignmentStock.reduce((a, c) => a + c.remaining, 0);

  const columns: Column<Challan>[] = [
    { key: "id", label: "Challan", value: (c) => c.id, render: (c) => <Link href={`/addons/consignment/challans/${c.id}`} className="font-medium hover:underline">{c.id}</Link> },
    { key: "date", label: "Date", value: (c) => c.date, render: (c) => fmtDate(c.date) },
    { key: "store", label: "Store", value: (c) => getStore(c.storeId)?.name, render: (c) => <span>{getStore(c.storeId)?.name}<span className="block text-xs text-muted">{getStore(c.storeId)?.city}</span></span> },
    { key: "order", label: "Order", value: (c) => c.orderId, render: (c) => <Link href={`/orders/${c.orderId}`} className="hover:underline">{c.orderId}</Link> },
    { key: "qty", label: "Pieces", align: "right", value: (c) => c.totalQty },
    { key: "value", label: "Value at MRP", align: "right", value: (c) => c.value, render: (c) => inr(c.value) },
    { key: "transport", label: "Transport", value: (c) => transportOf(c), render: (c) => {
      const sh = shipmentForOrder(c.orderId);
      return sh ? <Link href={`/addons/shipments/${sh.id}`} className="hover:underline">{transportOf(c)}</Link> : <span className="text-muted">{transportOf(c)}</span>;
    } },
    { key: "status", label: "Status", value: (c) => c.status, render: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/addons/consignment", label: "Consignment" }}
        title="Delivery challans"
        subtitle="Every movement of stock to a store goes out on a numbered challan and is logged as a CON order."
        actions={<Button href="/addons/consignment/challans/new"><Send className="size-4" />Send stock to a store</Button>}
      />
      <AddonBanner title="Consignment management" price="₹20,000">Part of the consignment add-on.</AddonBanner>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Challans this month" value={thisMonth.length} hint={`${thisMonth.reduce((a, c) => a + c.totalQty, 0)} pieces sent`} />
        <Stat label="Pieces at stores" value={atStores} />
        <Stat label="In transit" value={challans.filter((c) => c.status === "In transit").length} tone="default" />
        <Stat label="Drafts" value={challans.filter((c) => c.status === "Draft").length} hint="Packed, not yet sent" tone={challans.some((c) => c.status === "Draft") ? "warn" : "default"} />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        exportName="challans"
        initialSort={{ key: "date", dir: "desc" }}
        toolbar={
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Search challan, order, AWB" />
            <Select label="Store" value={store} onChange={setStore} options={[{ value: "all", label: "All stores" }, ...stores.map((s) => ({ value: s.id, label: s.name }))]} />
            <Select label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All statuses" }, "Draft", "In transit", "Received by store"]} />
          </>
        }
      />
    </>
  );
}
