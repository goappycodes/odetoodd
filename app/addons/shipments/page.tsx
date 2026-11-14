"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CircleCheck, RefreshCw } from "lucide-react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { AddonBanner, Badge, Card, PageHeader, SimpleTable, Stat, StatusBadge } from "@/components/ui";
import { useQueryParam } from "@/lib/useQuery";
import {
  shipments, awaitingAwb, shipmentFlag, daysSinceScan, isDelayed, isStuck, isOpenShipment, STUCK_DAYS,
  fmtDate, fmtShort, daysBetween, addDays, inr, TODAY, type Shipment,
} from "@/lib/data";

const PROVIDERS = ["Blue Dart", "DHL Express", "Delhivery"];
const ago = (n: number) => (n === 0 ? "today" : n === 1 ? "1 day ago" : `${n} days ago`);
const flagTone = (f: string | null) => (f === "Delayed" ? "bg-warn-soft/40" : f ? "bg-bad-soft/40" : "");

function AwbEntry({ provider }: { provider: string }) {
  const [awb, setAwb] = useState("");
  const [courier, setCourier] = useState(provider);
  const [saved, setSaved] = useState(false);
  if (saved) return <span className="inline-flex items-center gap-1 text-xs text-good"><CircleCheck className="size-3.5" />{courier} {awb} saved, tracking started</span>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (awb.trim()) setSaved(true); }} className="flex flex-wrap items-center gap-1.5">
      <select aria-label="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} className="rounded-md border border-line bg-card px-2 py-1 text-xs">
        {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
      </select>
      <input aria-label="AWB number" value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="AWB number" className="w-32 rounded-md border border-line bg-card px-2 py-1 text-xs outline-none focus:border-ink/40" />
      <button type="submit" className="rounded-md bg-ink px-2 py-1 text-xs text-paper">Add</button>
    </form>
  );
}

export default function ShipmentsPage() {
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useQueryParam("status", "all");

  const rows = useMemo(
    () =>
      shipments.filter((s) => {
        if (provider !== "all" && s.provider !== provider) return false;
        if (status === "open" && !isOpenShipment(s)) return false;
        if (status === "flagged" && !shipmentFlag(s)) return false;
        if (status === "delivered" && s.status !== "Delivered") return false;
        if (q && !`${s.awb} ${s.orderRef} ${s.destination}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [q, provider, status],
  );

  const open = shipments.filter(isOpenShipment);
  const flagged = shipments.filter((s) => shipmentFlag(s)).sort((a, b) => daysSinceScan(b) - daysSinceScan(a));
  const deliveredWeek = shipments.filter((s) => s.deliveredOn && s.deliveredOn >= addDays(TODAY, -6));
  const awaiting = awaitingAwb();

  const byProvider = PROVIDERS.map((p) => {
    const list = shipments.filter((s) => s.provider === p);
    const delivered = list.filter((s) => s.deliveredOn);
    const avg = delivered.length ? delivered.reduce((a, s) => a + daysBetween(s.shippedOn, s.deliveredOn!), 0) / delivered.length : 0;
    return { p, total: list.length, open: list.filter(isOpenShipment).length, delivered: delivered.length, avg, flagged: list.filter((s) => shipmentFlag(s)).length };
  });

  const columns: Column<Shipment>[] = [
    { key: "id", label: "Shipment", value: (s) => s.id, render: (s) => <Link href={`/addons/shipments/${s.id}`} className="font-medium hover:underline">{s.id}</Link> },
    { key: "order", label: "Order", value: (s) => s.orderRef, render: (s) => <Link href={`/orders/${s.orderId}`} className="hover:underline">{s.orderRef}</Link> },
    { key: "channel", label: "Channel", value: (s) => s.channel },
    { key: "provider", label: "Courier", value: (s) => s.provider },
    { key: "awb", label: "AWB", value: (s) => s.awb },
    { key: "dest", label: "Destination", value: (s) => s.destination, render: (s) => <span>{s.destination}{s.market === "International" && <span className="block text-xs text-muted">International</span>}</span> },
    { key: "shipped", label: "Shipped", value: (s) => s.shippedOn, render: (s) => fmtShort(s.shippedOn) },
    { key: "expected", label: "Expected by", value: (s) => s.expectedBy, render: (s) => <span className={isDelayed(s) ? "text-bad" : ""}>{fmtShort(s.expectedBy)}</span> },
    { key: "scan", label: "Last scan", value: (s) => s.lastScan.date, render: (s) => (
      <span className="block max-w-56">
        <span className="block truncate">{s.lastScan.text}</span>
        <span className={`block text-xs ${isStuck(s) ? "text-bad" : "text-muted"}`}>{s.lastScan.location} · {ago(daysSinceScan(s))}</span>
      </span>
    ) },
    { key: "status", label: "Status", value: (s) => s.status, render: (s) => <StatusBadge status={s.status} /> },
    { key: "flag", label: "Flag", value: (s) => shipmentFlag(s) ?? "", render: (s) => (shipmentFlag(s) ? <StatusBadge status={shipmentFlag(s)!} /> : null) },
    { key: "sync", label: "Shopify", value: (s) => s.shopifySync, render: (s) => (s.shopifySync === "Not applicable" ? <span className="text-xs text-faint">n/a</span> : <StatusBadge status={s.shopifySync} />) },
  ];

  return (
    <>
      <PageHeader
        title="Shipment tracking"
        subtitle="Every dispatched order with its courier and AWB, tracked through the courier APIs. Anything late or stalled is flagged here and on the dashboard."
        actions={<button className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2 text-sm font-medium hover:bg-sand"><RefreshCw className="size-4" />Refresh all tracking</button>}
      />
      <AddonBanner title="Shipment tracking" price="₹35,000">
        AWB and courier recorded for every order, live tracking from the Blue Dart, DHL and Delhivery APIs, delayed and stalled shipments flagged on the dashboard, and the AWB synced back to Shopify.
      </AddonBanner>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="In transit" value={open.filter((s) => s.status === "In transit").length} />
        <Stat label="Delivered, last 7 days" value={deliveredWeek.length} tone="good" />
        <Stat label="Delayed" value={shipments.filter(isDelayed).length} hint="Past expected delivery" tone="warn" />
        <Stat label={`Not moving ${STUCK_DAYS}+ days`} value={shipments.filter(isStuck).length} hint="No courier scan" tone="bad" />
        <Stat label="Exceptions" value={shipments.filter((s) => s.status === "Exception").length} hint="Failed attempt or customs" tone="bad" />
        <Stat label="Awaiting AWB" value={awaiting.length} hint="Packed, not handed over" />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card title={<span className="inline-flex items-center gap-2">Needs attention <Badge tone={flagged.length ? "bad" : "good"}>{flagged.length}</Badge></span>} pad={false}>
          <ul className="divide-y divide-line/70">
            {flagged.map((s) => {
              const f = shipmentFlag(s)!;
              return (
                <li key={s.id}>
                  <Link href={`/addons/shipments/${s.id}`} className={`flex items-start gap-3 px-4 py-3 text-sm hover:bg-sand/60 border-l-4 ${f === "Delayed" ? "border-[#e0b100]" : "border-bad"}`}>
                    <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${f === "Delayed" ? "text-warn" : "text-bad"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.orderRef} · {s.provider} {s.awb}</p>
                      <p className="text-xs text-muted">{s.lastScan.text}, {s.lastScan.location} · last scan {ago(daysSinceScan(s))} · expected {fmtShort(s.expectedBy)}</p>
                    </div>
                    <StatusBadge status={f} />
                  </Link>
                </li>
              );
            })}
            {flagged.length === 0 && <li className="px-4 py-6 text-sm text-muted">Every shipment is moving on time.</li>}
          </ul>
        </Card>

        <Card title="Awaiting AWB" pad={false}>
          <ul className="divide-y divide-line/70">
            {awaiting.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={`/orders/${o.id}`} className="font-medium hover:underline">{o.ref}</Link>
                  <p className="truncate text-xs text-muted">{o.customer}, {o.city} · {inr(o.total)}</p>
                </div>
                <AwbEntry provider={o.market === "International" ? "DHL Express" : "Blue Dart"} />
              </li>
            ))}
            {awaiting.length === 0 && <li className="px-4 py-6 text-sm text-muted">Nothing waiting for an AWB.</li>}
          </ul>
        </Card>
      </div>

      <Card title="By courier" pad={false} className="mb-6">
        <SimpleTable
          head={["Courier", "Shipments", "In transit", "Delivered", "Avg. days to deliver", "Flagged"]}
          align={["left", "right", "right", "right", "right", "right"]}
          rows={byProvider.map((r) => [
            <span key="p" className="font-medium">{r.p}</span>, r.total, r.open, r.delivered, r.avg ? r.avg.toFixed(1) : "—",
            r.flagged ? <span key="f" className="text-bad">{r.flagged}</span> : 0,
          ])}
        />
        <p className="border-t border-line px-4 py-2.5 text-xs text-muted">Tracking refreshes every 2 hours from each courier&apos;s API. Last refresh {fmtDate(TODAY)}, 10:00.</p>
      </Card>

      <DataTable
        rows={rows}
        columns={columns}
        exportName={`shipments-${TODAY}`}
        initialSort={{ key: "shipped", dir: "desc" }}
        rowClassName={(s) => flagTone(shipmentFlag(s))}
        toolbar={
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Search AWB, order, city" />
            <Select label="Courier" value={provider} onChange={setProvider} options={[{ value: "all", label: "All couriers" }, ...PROVIDERS]} />
            <Select label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "All shipments" }, { value: "open", label: "Not delivered" }, { value: "flagged", label: "Flagged" }, { value: "delivered", label: "Delivered" }]} />
          </>
        }
      />
    </>
  );
}
