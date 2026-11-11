"use client";

import { useState } from "react";
import { AlertTriangle, CircleCheck, FileSpreadsheet } from "lucide-react";
import { AddonBanner, Card, PageHeader, Badge, StatusBadge } from "@/components/ui";
import { stores, consignmentStock, consignmentReports, getProduct, getStore, fmtDate, inr } from "@/lib/data";

type Line = { sku: string; name: string; reportedSold: number; reportedStock: number; erpRemaining: number | null; issue: string | null };

function buildSample(storeId: string): Line[] {
  const items = consignmentStock.filter((c) => c.storeId === storeId);
  const lines: Line[] = items.map((c, i) => {
    const p = getProduct(c.productId)!;
    const sold = i % 3 === 0 ? 1 : 0;
    const off = i === 1 ? 2 : 0; // one count mismatch so the check has something to flag
    const reportedStock = Math.max(0, c.remaining - sold + off);
    return {
      sku: p.sku, name: p.name, reportedSold: sold, reportedStock, erpRemaining: c.remaining - sold,
      issue: off ? `Store count ${reportedStock}, ERP expects ${c.remaining - sold}` : sold > c.remaining ? "More sold than the store holds" : null,
    };
  });
  lines.push({ sku: "TP1599/OW", name: "(unknown)", reportedSold: 1, reportedStock: 0, erpRemaining: null, issue: "SKU not found in ERP" });
  return lines;
}

export default function Reconcile() {
  const [store, setStore] = useState(stores[1].id);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [saved, setSaved] = useState(false);
  const issues = lines?.filter((l) => l.issue) ?? [];
  const recent = [...consignmentReports].sort((a, b) => (a.uploadedOn < b.uploadedOn ? 1 : -1)).slice(0, 8);

  return (
    <>
      <PageHeader back={{ href: "/addons/consignment", label: "Consignment" }} title="Weekly sales reports" subtitle="Upload a store's weekly sales report. Sales are matched against the store's stock and anything that doesn't add up is flagged." />
      <AddonBanner title="Consignment management" price="₹50,000">Part of the consignment add-on.</AddonBanner>
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Store</span>
            <select value={store} onChange={(e) => { setStore(e.target.value); setLines(null); setSaved(false); }} className="rounded-lg border border-line bg-card px-3 py-2 text-sm">
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}, {s.city}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Week ending</span>
            <input type="date" defaultValue="2026-11-09" className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
          </label>
          <button onClick={() => { setLines(buildSample(store)); setSaved(false); }} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-paper">
            <FileSpreadsheet className="size-4" />Upload sample report
          </button>
          <span className="text-xs text-muted">Excel or CSV, in the store&apos;s own format once mapped</span>
        </div>
      </Card>

      {lines && (
        <Card
          className="mb-6"
          title={<span className="inline-flex flex-wrap items-center gap-2">{getStore(store)?.name} · {lines.length} lines {issues.length ? <Badge tone="warn">{issues.length} discrepancies</Badge> : <Badge tone="good">Matches</Badge>}</span>}
          action={saved ? <span className="inline-flex items-center gap-1.5 text-sm text-good"><CircleCheck className="size-4" />Sales posted</span> : <button onClick={() => setSaved(true)} className="rounded-lg bg-ink px-3 py-1.5 text-sm text-paper">Post {lines.reduce((a, l) => a + (l.issue ? 0 : l.reportedSold), 0)} matched sales</button>}
          pad={false}
        >
          <div className="scroll-x">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Sold (store)</th>
                  <th className="px-3 py-2 text-right font-medium">Stock (store)</th>
                  <th className="px-3 py-2 text-right font-medium">Stock (ERP)</th>
                  <th className="px-3 py-2 font-medium">Check</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {lines.map((l, i) => (
                  <tr key={i} className={`border-b border-line/70 ${l.issue ? "bg-warn-soft/50" : ""}`}>
                    <td className="px-3 py-2">{l.sku}</td>
                    <td className="px-3 py-2">{l.name}</td>
                    <td className="px-3 py-2 text-right">{l.reportedSold}</td>
                    <td className="px-3 py-2 text-right">{l.reportedStock}</td>
                    <td className="px-3 py-2 text-right">{l.erpRemaining ?? "—"}</td>
                    <td className="px-3 py-2">{l.issue ? <span className="inline-flex items-center gap-1 text-xs text-warn"><AlertTriangle className="size-3.5" />{l.issue}</span> : <CircleCheck className="size-4 text-good" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Recent uploads" pad={false}>
        <ul className="divide-y divide-line/70 text-sm">
          {recent.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="min-w-40 font-medium">{getStore(r.storeId)?.name}</span>
              <span className="text-muted">Week ending {fmtDate(r.weekEnding)}</span>
              <span className="text-muted tabular">{r.unitsSold} sold · {inr(r.value)}</span>
              <span className="ml-auto"><StatusBadge status={r.status} /></span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
