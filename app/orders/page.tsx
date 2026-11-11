"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { PageHeader, StatusBadge, UrgencyBadge, Badge, Button } from "@/components/ui";
import { useQueryParam } from "@/lib/useQuery";
import { orders, getProduct, orderUrgency, fmtDate, inr, daysBetween, TODAY, type Order } from "@/lib/data";

const STATUSES = ["All statuses", "New", "In production", "Quality check", "Ready to dispatch", "Dispatched"];

export default function OrdersPage() {
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("All channels");
  const [status, setStatus] = useState("Open orders");
  const [due, setDue] = useQueryParam("due", "any");

  const rows = useMemo(
    () =>
      orders.filter((o) => {
        if (channel !== "All channels" && o.channel !== channel) return false;
        if (status === "Open orders" && o.status === "Dispatched") return false;
        if (status !== "Open orders" && status !== "All statuses" && o.status !== status) return false;
        if (due !== "any" && orderUrgency(o) !== due) return false;
        if (q) {
          const hay = `${o.ref} ${o.customer} ${o.city} ${o.items.map((i) => getProduct(i.productId)?.name + " " + getProduct(i.productId)?.sku).join(" ")}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [q, channel, status, due],
  );

  const columns: Column<Order>[] = [
    { key: "ref", label: "Order", value: (o) => o.ref, render: (o) => <Link href={`/orders/${o.id}`} className="font-medium hover:underline">{o.ref}</Link> },
    { key: "date", label: "Received", value: (o) => o.date, render: (o) => fmtDate(o.date) },
    { key: "channel", label: "Channel", value: (o) => o.channel, render: (o) => <Badge tone={o.channel === "Shopify" ? "info" : o.channel === "Wholesale" ? "rose" : "neutral"}>{o.channel}</Badge> },
    { key: "customer", label: "Customer", value: (o) => o.customer, render: (o) => <span>{o.customer}<span className="block text-xs text-muted">{o.city}</span></span> },
    { key: "items", label: "Items", value: (o) => o.items.map((i) => `${getProduct(i.productId)?.name} (${i.size}) x${i.qty}`).join("; "), render: (o) => (
      <span className="block max-w-64 truncate">{o.items.map((i) => `${getProduct(i.productId)?.name} · ${i.size}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</span>
    ) },
    { key: "total", label: "Value", align: "right", value: (o) => o.total, render: (o) => inr(o.total) },
    { key: "status", label: "Status", value: (o) => o.status, render: (o) => <StatusBadge status={o.status} /> },
    { key: "due", label: "Due", value: (o) => o.dueDate, render: (o) => {
      const d = daysBetween(TODAY, o.dueDate);
      return <span className="flex items-center gap-2 whitespace-nowrap">{fmtDate(o.dueDate)} {o.status !== "Dispatched" && (orderUrgency(o) !== "on-track" ? <UrgencyBadge u={orderUrgency(o)} /> : <span className="text-xs text-muted">{d}d</span>)}</span>;
    } },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Shopify orders arrive automatically. Wholesale and offline orders are entered by the sales team."
        actions={<Button href="/orders/new"><Plus className="size-4" />New offline order</Button>}
      />
      <DataTable
        rows={rows}
        columns={columns}
        exportName="orders"
        initialSort={{ key: "due", dir: "asc" }}
        rowClassName={(o) => (orderUrgency(o) === "overdue" ? "bg-bad-soft/40" : orderUrgency(o) === "due-soon" ? "bg-warn-soft/40" : "")}
        toolbar={
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Search order, customer, SKU" />
            <Select label="Channel" value={channel} onChange={setChannel} options={["All channels", "Shopify", "Wholesale", "Offline"]} />
            <Select label="Status" value={status} onChange={setStatus} options={["Open orders", ...STATUSES]} />
            <Select label="Due" value={due} onChange={setDue} options={[{ value: "any", label: "Any due date" }, { value: "overdue", label: "Overdue (red)" }, { value: "due-soon", label: "Due in 7 days (yellow)" }, { value: "on-track", label: "On track" }]} />
          </>
        }
      />
    </>
  );
}
