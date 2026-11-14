"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Upload } from "lucide-react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { PageHeader, StatusBadge, UrgencyBadge, Badge, Button } from "@/components/ui";
import { useQueryParam } from "@/lib/useQuery";
import { orders, getProduct, orderUrgency, fmtDate, inr, daysBetween, TODAY, ORDER_SOURCES, sourceOf, type Order } from "@/lib/data";

const STATUSES = ["All statuses", "New", "In production", "Quality check", "Ready to dispatch", "Dispatched"];

export default function OrdersPage() {
  const [q, setQ] = useState("");
  const [source, setSource] = useQueryParam("source", "all");
  const [status, setStatus] = useState("Open orders");
  const [due, setDue] = useQueryParam("due", "any");

  const openCount = (channel?: string) => orders.filter((o) => o.status !== "Dispatched" && (!channel || o.channel === channel)).length;
  const active = ORDER_SOURCES.find((s) => s.channel === source);
  const latest = active ? orders.find((o) => o.channel === active.channel)?.ref : undefined;

  const rows = useMemo(
    () =>
      orders.filter((o) => {
        if (source !== "all" && o.channel !== source) return false;
        if (status === "Open orders" && o.status === "Dispatched") return false;
        if (status !== "Open orders" && status !== "All statuses" && o.status !== status) return false;
        if (due !== "any" && orderUrgency(o) !== due) return false;
        if (q) {
          const extra = `${"shopifyRef" in o ? o.shopifyRef : ""} ${"challanId" in o ? o.challanId : ""} ${"source" in o ? o.source : ""}`;
          const hay = `${o.ref} ${extra} ${o.customer} ${o.city} ${o.items.map((i) => getProduct(i.productId)?.name + " " + getProduct(i.productId)?.sku).join(" ")}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [q, source, status, due],
  );

  const columns: Column<Order>[] = [
    {
      key: "ref", label: "Order", value: (o) => o.ref, render: (o) => (
        <span className="block">
          <Link href={`/orders/${o.id}`} className="font-medium hover:underline">{o.ref}</Link>
          <span className="mt-0.5 flex flex-wrap gap-1">
            {o.custom && <Badge tone="rose">Custom +10%</Badge>}
            {o.market === "International" && <Badge tone="info">Intl</Badge>}
          </span>
        </span>
      ),
    },
    { key: "date", label: "Received", value: (o) => o.date, render: (o) => fmtDate(o.date) },
    {
      key: "channel", label: "Source", value: (o) => o.channel, render: (o) => {
        const s = sourceOf(o.channel);
        return (
          <span className="block">
            <Badge tone={s.tone}>{s.prefix} · {s.label}</Badge>
            {"challanId" in o && o.challanId ? (
              <Link href={`/addons/consignment/challans/${o.challanId}`} className="mt-0.5 block text-xs text-muted hover:text-ink hover:underline">{o.challanId}</Link>
            ) : "shopifyRef" in o && o.shopifyRef ? (
              <span className="mt-0.5 block text-xs text-muted">{o.shopifyRef}</span>
            ) : "source" in o && o.source ? (
              <span className="mt-0.5 block max-w-40 truncate text-xs text-muted">{o.source}</span>
            ) : null}
          </span>
        );
      },
    },
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

  const tabs = [{ key: "all", label: "All orders", prefix: null as string | null, count: openCount() }, ...ORDER_SOURCES.map((s) => ({ key: s.channel as string, label: s.label, prefix: s.prefix as string | null, count: openCount(s.channel) }))];

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every source has its own number series: SH for Shopify, WHO wholesale, CON consignment, EV events and OF studio and offline. Shopify orders arrive automatically."
        actions={
          <>
            <Button variant="secondary" href="/settings/imports?kind=orders"><Upload className="size-4" />Import CSV</Button>
            <Button href="/orders/new"><Plus className="size-4" />New order</Button>
          </>
        }
      />

      <div className="mb-4 scroll-x">
        <div role="tablist" aria-label="Order source" className="flex min-w-max gap-1 border-b border-line">
          {tabs.map((t) => {
            const on = source === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                onClick={() => setSource(t.key)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${on ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {t.prefix && <span className={`rounded px-1.5 py-px text-[11px] font-semibold tracking-wide ${on ? "bg-ink text-paper" : "bg-sand text-ink/70"}`}>{t.prefix}</span>}
                {t.label}
                <span className="text-xs text-muted tabular">{t.count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">
        {active ? <>{active.hint}. Numbered in its own {active.prefix} series{latest ? `, latest ${latest}` : ""}{active.channel === "Shopify" ? ", matching the Shopify order number" : ""}. </> : "All sources together. "}
        Counts show open orders.
        {active?.channel === "Consignment" && <> Consignment orders are created when stock goes out on a <Link href="/addons/consignment/challans" className="text-ink underline">challan</Link>.</>}
      </p>

      <DataTable
        rows={rows}
        columns={columns}
        exportName={`orders-${source === "all" ? "all" : (active?.prefix ?? source).toLowerCase()}`}
        initialSort={{ key: "due", dir: "asc" }}
        rowClassName={(o) => (o.status === "Dispatched" ? "" : orderUrgency(o) === "overdue" ? "bg-bad-soft/40" : orderUrgency(o) === "due-soon" ? "bg-warn-soft/40" : "")}
        toolbar={
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Search order, customer, SKU" />
            <Select label="Status" value={status} onChange={setStatus} options={["Open orders", ...STATUSES]} />
            <Select label="Due" value={due} onChange={setDue} options={[{ value: "any", label: "Any due date" }, { value: "overdue", label: "Overdue (red)" }, { value: "due-soon", label: "Due in 7 days (yellow)" }, { value: "on-track", label: "On track" }]} />
          </>
        }
      />
    </>
  );
}
