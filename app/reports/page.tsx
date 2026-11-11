"use client";

import { useMemo, useState } from "react";
import DataTable, { Column, Select } from "@/components/DataTable";
import { PageHeader } from "@/components/ui";
import { StackedBars, type Fmt } from "@/components/charts";
import { useQueryParam } from "@/lib/useQuery";
import {
  TODAY, addDays, fmtDate, fmtShort, inr, num, orders, output, products, getProduct, getKarigar, getMachine,
  stages, stageName, materials, materialStatus, getSupplier, karigars,
} from "@/lib/data";

type Row = Record<string, string | number>;
const RANGES = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function Reports() {
  const [report, setReport] = useQueryParam("report", "production");
  const [range, setRange] = useState("7");
  const [groupBy, setGroupBy] = useState("karigar");
  const [stage, setStage] = useState("all");
  const [channel, setChannel] = useState("all");
  const [product, setProduct] = useState("all");
  const start = addDays(TODAY, -(Number(range) - 1));

  const { rows, columns, chart, chartSeries, chartFormat } = useMemo((): {
    rows: Row[];
    columns: Column<Row>[];
    chart: { label: string; values: Record<string, number> }[] | null;
    chartSeries: { key: string; label: string; color: string }[];
    chartFormat: Fmt;
  } => {
    if (report === "production") {
      const entries = output.filter((o) => o.date >= start && (stage === "all" || o.stage === stage));
      const keyOf = (o: (typeof output)[number]) =>
        groupBy === "karigar" ? getKarigar(o.karigarId)!.name : groupBy === "machine" ? (o.machineId ? getMachine(o.machineId)!.name : "No machine (hand work)") : groupBy === "stage" ? stageName(o.stage) : fmtDate(o.date);
      const map = new Map<string, Row>();
      for (const o of entries) {
        const k = keyOf(o);
        const r = map.get(k) ?? { key: k, entries: 0, completed: 0, rejected: 0, sortDate: o.date };
        r.entries = Number(r.entries) + 1;
        r.completed = Number(r.completed) + o.completed;
        r.rejected = Number(r.rejected) + o.rejected;
        map.set(k, r);
      }
      const rows: Row[] = [...map.values()].map((r) => ({ ...r, rate: Number(r.completed) ? Math.round((Number(r.rejected) / Number(r.completed)) * 1000) / 10 : 0 }));
      const days = Array.from({ length: Math.min(Number(range), 30) }, (_, i) => addDays(TODAY, -Math.min(Number(range), 30) + 1 + i));
      const chart = days.map((d) => ({ label: fmtShort(d), values: { completed: entries.filter((o) => o.date === d).reduce((a, o) => a + o.completed, 0) } }));
      const label = { karigar: "Karigar", machine: "Machine", stage: "Stage", day: "Date" }[groupBy] ?? "Group";
      const columns: Column<Row>[] = [
        { key: "key", label, value: (r) => (groupBy === "day" ? String(r.sortDate) : String(r.key)), render: (r) => String(r.key) },
        { key: "entries", label: "Entries", align: "right", value: (r) => Number(r.entries) },
        { key: "completed", label: "Pieces completed", align: "right", value: (r) => Number(r.completed) },
        { key: "rejected", label: "Rejected", align: "right", value: (r) => Number(r.rejected) },
        { key: "rate", label: "Rejection %", align: "right", value: (r) => Number(r.rate), render: (r) => `${r.rate}%` },
      ];
      return { rows, columns, chart, chartSeries: [{ key: "completed", label: "Pieces completed", color: "var(--color-s1)" }], chartFormat: "num" };
    }
    if (report === "sales") {
      const list = orders.filter((o) => o.date >= start && (channel === "all" || o.channel === channel));
      const lines = list.flatMap((o) => o.items.filter((i) => product === "all" || i.productId === product).map((i) => ({ o, i })));
      const rows: Row[] = lines.map(({ o, i }) => {
        const p = getProduct(i.productId)!;
        return { date: o.date, order: o.ref, channel: o.channel, customer: o.customer, product: p.name, sku: p.sku, size: i.size, qty: i.qty, value: i.qty * i.price };
      });
      const days = Array.from({ length: Math.min(Number(range), 30) }, (_, i) => addDays(TODAY, -Math.min(Number(range), 30) + 1 + i));
      const chart = days.map((d) => {
        const v: Record<string, number> = { Shopify: 0, Wholesale: 0, Offline: 0 };
        for (const r of rows) if (r.date === d) v[String(r.channel)] += Number(r.value);
        return { label: fmtShort(d), values: v };
      });
      const columns: Column<Row>[] = [
        { key: "date", label: "Date", value: (r) => String(r.date), render: (r) => fmtDate(String(r.date)) },
        { key: "order", label: "Order", value: (r) => String(r.order) },
        { key: "channel", label: "Channel", value: (r) => String(r.channel) },
        { key: "customer", label: "Customer", value: (r) => String(r.customer) },
        { key: "product", label: "Product", value: (r) => String(r.product) },
        { key: "sku", label: "SKU", value: (r) => String(r.sku) },
        { key: "size", label: "Size", value: (r) => String(r.size) },
        { key: "qty", label: "Qty", align: "right", value: (r) => Number(r.qty) },
        { key: "value", label: "Value (₹)", align: "right", value: (r) => Number(r.value), render: (r) => inr(Number(r.value)) },
      ];
      return {
        rows, columns, chart,
        chartSeries: [
          { key: "Shopify", label: "Shopify", color: "var(--color-s1)" },
          { key: "Wholesale", label: "Wholesale", color: "var(--color-s2)" },
          { key: "Offline", label: "Offline", color: "var(--color-s3)" },
        ],
        chartFormat: "inr",
      };
    }
    // stock
    const rows: Row[] = materials.map((m) => ({ code: m.id, name: m.name, category: m.category, stock: m.stock, unit: m.unit, min: m.minLevel, status: materialStatus(m), value: Math.round(m.stock * m.cost), supplier: getSupplier(m.supplierId)?.name ?? "" }));
    const columns: Column<Row>[] = [
      { key: "code", label: "Code", value: (r) => String(r.code) },
      { key: "name", label: "Material", value: (r) => String(r.name) },
      { key: "category", label: "Category", value: (r) => String(r.category) },
      { key: "stock", label: "In stock", align: "right", value: (r) => Number(r.stock), render: (r) => `${num(Number(r.stock), 1)} ${r.unit}` },
      { key: "min", label: "Minimum", align: "right", value: (r) => Number(r.min) },
      { key: "status", label: "Status", value: (r) => String(r.status) },
      { key: "value", label: "Value (₹)", align: "right", value: (r) => Number(r.value), render: (r) => inr(Number(r.value)) },
      { key: "supplier", label: "Supplier", value: (r) => String(r.supplier) },
    ];
    return { rows, columns, chart: null, chartSeries: [], chartFormat: "num" };
  }, [report, range, groupBy, stage, channel, product, start]);

  const total = report === "production" ? rows.reduce((a, r) => a + Number(r.completed), 0) : report === "sales" ? rows.reduce((a, r) => a + Number(r.value), 0) : rows.reduce((a, r) => a + Number(r.value), 0);

  return (
    <>
      <PageHeader title="Reports and exports" subtitle="Filter by date, product, channel and production stage. Every report exports to Excel-ready CSV." />
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-line bg-card p-3">
        <Select label="Report" value={report} onChange={setReport} options={[{ value: "production", label: "Production output" }, { value: "sales", label: "Sales by channel" }, { value: "stock", label: "Raw material stock" }]} />
        {report !== "stock" && <Select label="Date range" value={range} onChange={setRange} options={RANGES} />}
        {report === "production" && (
          <>
            <Select label="Group by" value={groupBy} onChange={setGroupBy} options={[{ value: "karigar", label: "By karigar" }, { value: "machine", label: "By machine" }, { value: "stage", label: "By stage" }, { value: "day", label: "By day" }]} />
            <Select label="Stage" value={stage} onChange={setStage} options={[{ value: "all", label: "All stages" }, ...stages.map((s) => ({ value: s.id, label: s.name }))]} />
          </>
        )}
        {report === "sales" && (
          <>
            <Select label="Channel" value={channel} onChange={setChannel} options={[{ value: "all", label: "All channels" }, "Shopify", "Wholesale", "Offline"]} />
            <Select label="Product" value={product} onChange={setProduct} options={[{ value: "all", label: "All products" }, ...products.map((p) => ({ value: p.id, label: p.name }))]} />
          </>
        )}
        <span className="ml-auto self-center text-sm text-muted">
          {report === "production" ? `${num(total)} pieces · ${karigars.length} karigars` : report === "sales" ? `${inr(total)} total` : `${inr(total)} stock value`}
        </span>
      </div>
      {chart && (
        <div className="mb-4 rounded-xl border border-line bg-card p-4">
          <StackedBars data={chart} series={chartSeries} format={chartFormat} labelEvery={chart.length > 14 ? 5 : 1} height={180} />
        </div>
      )}
      <DataTable rows={rows} columns={columns} exportName={`${report}-report-${TODAY}`} initialSort={report === "sales" ? { key: "date", dir: "desc" } : report === "production" ? { key: "completed", dir: "desc" } : undefined} />
    </>
  );
}
