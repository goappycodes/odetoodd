"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CircleCheck, Send } from "lucide-react";
import DataTable, { Column, SearchBox } from "@/components/DataTable";
import { AddonBanner, Card, PageHeader, Stat, StatusBadge, Badge, ProductThumb } from "@/components/ui";
import { useQueryParam } from "@/lib/useQuery";
import { prLoans, prStatus, getProduct, products, sampleStock, sizeStock, fmtDate, daysBetween, addDays, TODAY, type PrLoan, type PrStatus } from "@/lib/data";

const input = "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink/40";
const STATUSES = ["All", "Out", "Overdue", "Returned"] as const;
const NEXT_ID = `PR-${String(prLoans.length + 1).padStart(3, "0")}`;

type Row = PrLoan & { status: PrStatus; returnedLocal: boolean };

export default function PrTracker() {
  const [status, setStatus] = useQueryParam("status", "All");
  const [q, setQ] = useState("");
  const [returned, setReturned] = useState<Set<string>>(new Set());

  const all: Row[] = useMemo(
    () =>
      prLoans.map((l) =>
        returned.has(l.id)
          ? { ...l, returnedOn: TODAY, condition: "Good", status: "Returned" as const, returnedLocal: true }
          : { ...l, status: prStatus(l), returnedLocal: false },
      ),
    [returned],
  );
  const count = (s: PrStatus) => all.filter((r) => r.status === s).length;
  const open = all.filter((r) => r.status !== "Returned");
  const monthStart = TODAY.slice(0, 8) + "01";
  const rows = all.filter((r) => {
    if (status !== "All" && r.status !== status) return false;
    if (!q) return true;
    const p = getProduct(r.productId);
    return `${r.id} ${p?.name} ${p?.sku} ${r.recipient} ${r.purpose}`.toLowerCase().includes(q.toLowerCase());
  });

  // give-out form
  const [productId, setProductId] = useState(() => products.find((p) => Object.keys(sampleStock(p)).length)?.id ?? products[0].id);
  const product = getProduct(productId)!;
  const [stockType, setStockType] = useState<"Sample" | "Main">("Sample");
  const sizesFor = (type: "Sample" | "Main") => Object.keys(type === "Sample" ? sampleStock(product) : sizeStock(product));
  const [size, setSize] = useState(() => sizesFor("Sample")[0] ?? product.sizes[0]);
  const [saved, setSaved] = useState(false);
  const outFor = (type: "Sample" | "Main", sz: string) => open.filter((l) => l.productId === productId && l.stockType === type && l.size === sz).reduce((a, l) => a + l.qty, 0);
  const available = (type: "Sample" | "Main", sz: string) => Math.max(0, ((type === "Sample" ? sampleStock(product) : sizeStock(product))[sz] ?? 0) - outFor(type, sz));
  const totalAvailable = (type: "Sample" | "Main") => sizesFor(type).reduce((a, s) => a + available(type, s), 0);
  const pickProduct = (id: string) => {
    const p = getProduct(id)!;
    const type = Object.keys(sampleStock(p)).length ? "Sample" : "Main";
    setProductId(id);
    setStockType(type);
    setSize(Object.keys(type === "Sample" ? sampleStock(p) : sizeStock(p))[0] ?? p.sizes[0]);
    setSaved(false);
  };

  const columns: Column<Row>[] = [
    { key: "id", label: "PR", value: (r) => r.id, render: (r) => <span className="font-medium">{r.id}</span> },
    { key: "product", label: "Piece", value: (r) => getProduct(r.productId)?.name, render: (r) => {
      const p = getProduct(r.productId)!;
      return <Link href={`/products/${p.id}`} className="flex items-center gap-2 hover:underline"><ProductThumb src={p.image} alt={p.name} size={26} /><span>{p.name}<span className="block text-xs text-muted">{p.sku} · {r.size}</span></span></Link>;
    } },
    { key: "stock", label: "From", value: (r) => r.stockType, render: (r) => <Badge tone={r.stockType === "Sample" ? "rose" : "neutral"}>{r.stockType} stock</Badge> },
    { key: "to", label: "Given to", value: (r) => r.recipient, render: (r) => <span>{r.recipient}<span className="block text-xs text-muted">{r.purpose}</span></span> },
    { key: "issued", label: "Given out", value: (r) => r.issuedOn, render: (r) => fmtDate(r.issuedOn) },
    { key: "due", label: "Due back", value: (r) => r.dueBack, render: (r) => fmtDate(r.dueBack) },
    { key: "back", label: "Returned", value: (r) => r.returnedOn ?? "", render: (r) => {
      if (r.returnedOn) return fmtDate(r.returnedOn);
      const late = daysBetween(r.dueBack, TODAY);
      return late > 0 ? <span className="text-bad">{late} day{late === 1 ? "" : "s"} overdue</span> : <span className="text-muted">Due in {-late} day{late === -1 ? "" : "s"}</span>;
    } },
    { key: "condition", label: "Condition", value: (r) => r.condition ?? "", render: (r) => r.condition ?? <span className="text-faint">Not back yet</span> },
    { key: "coverage", label: "Coverage", value: (r) => r.coverage ?? "", render: (r) => r.coverage ?? <span className="text-faint">None logged</span> },
    { key: "status", label: "Status", value: (r) => r.status, render: (r) => (
      <span className="flex items-center gap-2 whitespace-nowrap">
        <StatusBadge status={r.status} />
        {r.status !== "Returned" && (
          <button onClick={() => setReturned((s) => new Set(s).add(r.id))} className="rounded-md border border-line bg-card px-2 py-0.5 text-xs hover:bg-sand">Mark returned</button>
        )}
      </span>
    ) },
  ];

  return (
    <>
      <PageHeader title="PR tracker" subtitle="Pieces given out for shoots, editorials and creators: where each one is and whether it has come back." />
      <AddonBanner title="PR tracker" price="₹15,000">Log every piece given out for PR from sample or main stock, track returns and condition, and flag anything not back on time on the dashboard.</AddonBanner>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Out now" value={open.length} hint={`${count("Out")} within their due date`} />
        <Stat label="Overdue" value={count("Overdue")} tone={count("Overdue") ? "bad" : "good"} hint="Flagged on the dashboard" />
        <Stat label="Returned this month" value={all.filter((r) => r.returnedOn && r.returnedOn >= monthStart).length} />
        <Stat label="Out from sample / main" value={`${open.filter((r) => r.stockType === "Sample").length} / ${open.filter((r) => r.stockType === "Main").length}`} hint="Main stock pieces aren't available to sell" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="mb-3 inline-flex flex-wrap gap-1 rounded-xl border border-line bg-card p-1">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-lg px-3 py-1.5 text-sm ${status === s ? "bg-ink text-paper" : "text-ink/80 hover:bg-sand"}`}>
                {s === "All" ? "All" : s} <span className={`tabular ${status === s ? "text-paper/70" : "text-muted"}`}>{s === "All" ? all.length : count(s)}</span>
              </button>
            ))}
          </div>
          <DataTable
            rows={rows}
            columns={columns}
            exportName={`pr-tracker-${TODAY}`}
            initialSort={{ key: "issued", dir: "desc" }}
            rowClassName={(r) => (r.status === "Overdue" ? "bg-bad-soft/40" : r.returnedLocal ? "bg-good-soft/40" : "")}
            toolbar={<SearchBox value={q} onChange={setQ} placeholder="Search piece, person, PR number" />}
          />
        </div>

        <Card title="Give out a piece">
          {saved ? (
            <div className="py-4 text-center text-sm">
              <CircleCheck className="mx-auto size-10 text-good" />
              <p className="mt-3 font-medium">{NEXT_ID} created</p>
              <p className="mt-1 text-muted">
                {product.name} ({size}) moves out of {stockType.toLowerCase()} stock until it comes back. The team gets a reminder before it is due. This prototype doesn&apos;t save data.
              </p>
              <button onClick={() => setSaved(false)} className="mt-4 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-sand">Give out another</button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSaved(true); }} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Piece</span>
                <select className={input} value={productId} onChange={(e) => pickProduct(e.target.value)}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["Sample", "Main"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setStockType(t); setSize(sizesFor(t)[0] ?? product.sizes[0]); }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${stockType === t ? "border-ink bg-ink text-paper" : "border-line hover:bg-sand"}`}
                  >
                    <span className="block font-medium">{t} stock</span>
                    <span className={`text-xs ${stockType === t ? "text-paper/70" : "text-muted"}`}>{totalAvailable(t)} available</span>
                  </button>
                ))}
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Size</span>
                <select className={input} value={size} onChange={(e) => setSize(e.target.value)}>
                  {(sizesFor(stockType).length ? sizesFor(stockType) : product.sizes).map((s) => (
                    <option key={s} value={s}>{s} · {available(stockType, s)} available</option>
                  ))}
                </select>
              </label>
              {available(stockType, size) === 0 && <p className="text-xs text-warn">No {stockType.toLowerCase()} piece free in this size. Pick another size or stock type.</p>}
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Given to</span>
                <input className={input} required placeholder="Stylist, creator or publication" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Purpose</span>
                <input className={input} placeholder="Editorial shoot, reel, lookbook" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Due back</span>
                <input type="date" className={input} defaultValue={addDays(TODAY, 7)} />
              </label>
              <button type="submit" disabled={available(stockType, size) === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-40">
                <Send className="size-4" />Give out and log {NEXT_ID}
              </button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
