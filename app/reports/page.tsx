"use client";

import { useMemo, useState } from "react";
import DataTable, { Column, Select } from "@/components/DataTable";
import { PageHeader } from "@/components/ui";
import { StackedBars, type Fmt } from "@/components/charts";
import { useQueryParam } from "@/lib/useQuery";
import {
  TODAY, addDays, fmtDate, fmtShort, inr, num, orders, output, products, getProduct, getKarigar, getMachine,
  stages, stageName, materials, materialStatus, getSupplier, karigars, stores, consignmentReports, sourceOf,
} from "@/lib/data";

type Row = Record<string, string | number>;
const SALES_CHANNELS = ["Shopify", "Wholesale", "Events", "Offline"] as const;
const SALES_SERIES = [
  { key: "Shopify", label: "Shopify", color: "var(--color-s1)" },
  { key: "Wholesale", label: "Wholesale", color: "var(--color-s2)" },
  { key: "Offline", label: "Studio and offline", color: "var(--color-s3)" },
  { key: "Events", label: "Events", color: "var(--color-s4)" },
];
const VIEWS = [
  { value: "lines", label: "Line items" },
  { value: "channel", label: "By channel" },
  { value: "category", label: "By category" },
  { value: "sku", label: "By SKU" },
  { value: "store", label: "By store" },
];
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
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
  const [view, setView] = useQueryParam("view", "lines");
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
      // consignment orders only move stock to a store; store sales come in through the weekly reports
      const list = orders.filter((o) => o.channel !== "Consignment" && o.date >= start && (channel === "all" || o.channel === channel));
      const lines = list.flatMap((o) => o.items.filter((i) => product === "all" || i.productId === product).map((i) => ({ o, i })));
      const days = Array.from({ length: Math.min(Number(range), 30) }, (_, i) => addDays(TODAY, -Math.min(Number(range), 30) + 1 + i));
      const chart = days.map((d) => {
        const v: Record<string, number> = { Shopify: 0, Wholesale: 0, Events: 0, Offline: 0 };
        for (const { o, i } of lines) if (o.date === d) v[o.channel] += i.qty * i.price;
        return { label: fmtShort(d), values: v };
      });
      const sumCols: Column<Row>[] = [
        { key: "orders", label: "Orders", align: "right", value: (r) => Number(r.orders) },
        { key: "qty", label: "Units", align: "right", value: (r) => Number(r.qty) },
        { key: "value", label: "Value (₹)", align: "right", value: (r) => Number(r.value), render: (r) => inr(Number(r.value)) },
        { key: "share", label: "Share", align: "right", value: (r) => Number(r.share), render: (r) => `${r.share}%` },
      ];
      const group = (keyOf: (x: (typeof lines)[number]) => string, extra?: (x: (typeof lines)[number]) => Row) => {
        const map = new Map<string, { r: Row; ids: Set<string> }>();
        for (const x of lines) {
          const k = keyOf(x);
          const g = map.get(k) ?? { r: { key: k, qty: 0, value: 0, ...(extra?.(x) ?? {}) }, ids: new Set<string>() };
          g.r.qty = Number(g.r.qty) + x.i.qty;
          g.r.value = Number(g.r.value) + x.i.qty * x.i.price;
          g.ids.add(x.o.id);
          map.set(k, g);
        }
        const total = [...map.values()].reduce((a, g) => a + Number(g.r.value), 0);
        return [...map.values()].map(({ r, ids }) => ({ ...r, orders: ids.size, share: pct(Number(r.value), total) }));
      };
      const base = { chart, chartSeries: SALES_SERIES, chartFormat: "inr" as Fmt };

      if (view === "channel") {
        const rows = group((x) => x.o.channel, (x) => ({ prefix: sourceOf(x.o.channel).prefix }));
        return { ...base, rows, columns: [
          { key: "key", label: "Channel", value: (r) => String(r.key), render: (r) => `${sourceOf(String(r.key)).label} (${r.prefix})` },
          ...sumCols,
        ] };
      }
      if (view === "category") {
        const rows = group((x) => getProduct(x.i.productId)!.type);
        return { ...base, rows, columns: [{ key: "key", label: "Category", value: (r) => String(r.key) }, ...sumCols] };
      }
      if (view === "sku") {
        const rows = group((x) => getProduct(x.i.productId)!.sku, (x) => ({ product: getProduct(x.i.productId)!.name, category: getProduct(x.i.productId)!.type }));
        return { ...base, rows, columns: [
          { key: "key", label: "SKU", value: (r) => String(r.key) },
          { key: "product", label: "Product", value: (r) => String(r.product) },
          { key: "category", label: "Category", value: (r) => String(r.category) },
          ...sumCols,
        ] };
      }
      if (view === "store") {
        // consignment sales from the weekly store reports, plus outright wholesale purchases by the same stores
        const map = new Map<string, Row>();
        for (const s of stores) map.set(s.name, { key: s.name, city: s.city, consignUnits: 0, consignValue: 0, wholesaleUnits: 0, wholesaleValue: 0 });
        for (const r of consignmentReports.filter((x) => x.weekEnding >= start && (channel === "all" || channel === "Consignment"))) {
          const s = stores.find((x) => x.id === r.storeId)!;
          const row = map.get(s.name)!;
          for (const l of r.lines.filter((l) => product === "all" || l.productId === product)) {
            row.consignUnits = Number(row.consignUnits) + l.reportedSold;
            row.consignValue = Number(row.consignValue) + l.reportedSold * l.price;
          }
        }
        for (const { o, i } of lines.filter((x) => x.o.channel === "Wholesale")) {
          const row = map.get(o.customer) ?? { key: o.customer, city: o.city, consignUnits: 0, consignValue: 0, wholesaleUnits: 0, wholesaleValue: 0 };
          row.wholesaleUnits = Number(row.wholesaleUnits) + i.qty;
          row.wholesaleValue = Number(row.wholesaleValue) + i.qty * i.price;
          map.set(o.customer, row);
        }
        const all = [...map.values()].map((r) => ({ ...r, qty: Number(r.consignUnits) + Number(r.wholesaleUnits), value: Number(r.consignValue) + Number(r.wholesaleValue) }));
        const total = all.reduce((a, r) => a + r.value, 0);
        const rows: Row[] = all.map((r) => ({ ...r, share: pct(r.value, total) }));
        return { ...base, chart: null, rows, columns: [
          { key: "key", label: "Store", value: (r) => String(r.key) },
          { key: "city", label: "City", value: (r) => String(r.city) },
          { key: "consignUnits", label: "Sold on consignment", align: "right", value: (r) => Number(r.consignUnits) },
          { key: "wholesaleUnits", label: "Bought wholesale", align: "right", value: (r) => Number(r.wholesaleUnits) },
          { key: "qty", label: "Units sold", align: "right", value: (r) => Number(r.qty) },
          { key: "value", label: "Value (₹)", align: "right", value: (r) => Number(r.value), render: (r) => inr(Number(r.value)) },
          { key: "share", label: "Share", align: "right", value: (r) => Number(r.share), render: (r) => `${r.share}%` },
        ] };
      }
      const rows: Row[] = lines.map(({ o, i }) => {
        const p = getProduct(i.productId)!;
        return { date: o.date, order: o.ref, channel: sourceOf(o.channel).label, customer: o.customer, product: p.name, sku: p.sku, category: p.type, size: i.size, qty: i.qty, custom: o.custom ? "Yes" : "", value: i.qty * i.price };
      });
      const columns: Column<Row>[] = [
        { key: "date", label: "Date", value: (r) => String(r.date), render: (r) => fmtDate(String(r.date)) },
        { key: "order", label: "Order", value: (r) => String(r.order) },
        { key: "channel", label: "Channel", value: (r) => String(r.channel) },
        { key: "customer", label: "Customer", value: (r) => String(r.customer) },
        { key: "product", label: "Product", value: (r) => String(r.product) },
        { key: "sku", label: "SKU", value: (r) => String(r.sku) },
        { key: "category", label: "Category", value: (r) => String(r.category) },
        { key: "size", label: "Size", value: (r) => String(r.size) },
        { key: "qty", label: "Qty", align: "right", value: (r) => Number(r.qty) },
        { key: "custom", label: "Custom", value: (r) => String(r.custom) },
        { key: "value", label: "Value (₹)", align: "right", value: (r) => Number(r.value), render: (r) => inr(Number(r.value)) },
      ];
      return { ...base, rows, columns };
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
  }, [report, range, groupBy, stage, channel, product, start, view]);

  const total = report === "production" ? rows.reduce((a, r) => a + Number(r.completed), 0) : rows.reduce((a, r) => a + Number(r.value), 0);

  return (
    <>
      <PageHeader title="Reports and exports" subtitle="Sales by store, category, channel and SKU, production output and stock. Filter by date, product, channel and stage. Every report exports to Excel-ready CSV." />
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-line bg-card p-3">
        <Select label="Report" value={report} onChange={setReport} options={[{ value: "production", label: "Production output" }, { value: "sales", label: "Sales" }, { value: "stock", label: "Raw material stock" }]} />
        {report !== "stock" && <Select label="Date range" value={range} onChange={setRange} options={RANGES} />}
        {report === "production" && (
          <>
            <Select label="Group by" value={groupBy} onChange={setGroupBy} options={[{ value: "karigar", label: "By karigar" }, { value: "machine", label: "By machine" }, { value: "stage", label: "By stage" }, { value: "day", label: "By day" }]} />
            <Select label="Stage" value={stage} onChange={setStage} options={[{ value: "all", label: "All stages" }, ...stages.map((s) => ({ value: s.id, label: s.name }))]} />
          </>
        )}
        {report === "sales" && (
          <>
            <Select label="View" value={view} onChange={setView} options={VIEWS} />
            <Select label="Channel" value={channel} onChange={setChannel} options={[{ value: "all", label: "All channels" }, ...SALES_CHANNELS.map((c) => ({ value: c, label: `${sourceOf(c).label} (${sourceOf(c).prefix})` })), ...(view === "store" ? [{ value: "Consignment", label: "Consignment store sales" }] : [])]} />
            <Select label="Product" value={product} onChange={setProduct} options={[{ value: "all", label: "All products" }, ...products.map((p) => ({ value: p.id, label: p.name }))]} />
          </>
        )}
        <span className="ml-auto self-center text-sm text-muted">
          {report === "production" ? `${num(total)} pieces · ${karigars.length} karigars` : report === "sales" ? `${inr(total)} total${view === "store" ? " at stores" : ""}` : `${inr(total)} stock value`}
        </span>
      </div>
      {chart && (
        <div className="mb-4 rounded-xl border border-line bg-card p-4">
          <StackedBars data={chart} series={chartSeries} format={chartFormat} labelEvery={chart.length > 14 ? 5 : 1} height={180} />
        </div>
      )}
      {report === "sales" && view === "store" && (
        <p className="mb-4 text-sm text-muted">Store sales combine pieces sold on consignment, from the weekly store reports, with outright wholesale purchases by the same store. Consignment figures need the consignment add-on.</p>
      )}
      <DataTable key={`${report}-${view}`} rows={rows} columns={columns} exportName={`${report}${report === "sales" ? `-${view}` : ""}-report-${TODAY}`} initialSort={report === "sales" ? (view === "lines" ? { key: "date", dir: "desc" } : { key: "value", dir: "desc" }) : report === "production" ? { key: "completed", dir: "desc" } : undefined} />
    </>
  );
}
