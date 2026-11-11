import Link from "next/link";
import { AddonBanner, Card, PageHeader, SimpleTable, Stat, ProductThumb } from "@/components/ui";
import { StackedBars, HBars } from "@/components/charts";
import {
  products, orders, salesDaily, karigars, output, productionOrders, stages, stageName, inr, inrShort, num, fmtShort, daysBetween, addDays, TODAY,
} from "@/lib/data";

export const metadata = { title: "Sales and productivity analytics" };

export default function Analytics() {
  // product performance over 90 days
  const perf = products.map((p) => {
    const lines = orders.flatMap((o) => o.items.filter((i) => i.productId === p.id));
    return { p, units: lines.reduce((a, i) => a + i.qty, 0), revenue: lines.reduce((a, i) => a + i.qty * i.price, 0) };
  });
  const best = [...perf].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const slow = [...perf].sort((a, b) => a.units - b.units || a.revenue - b.revenue).slice(0, 8);

  // weekly sales by channel, 13 weeks
  const weeks = Array.from({ length: 13 }, (_, i) => {
    const end = addDays(TODAY, -7 * (12 - i));
    const start = addDays(end, -6);
    const rows = salesDaily.filter((r) => r.date >= start && r.date <= end);
    const v = { Shopify: 0, Wholesale: 0, Offline: 0, Consignment: 0 };
    for (const r of rows) for (const k of Object.keys(v) as (keyof typeof v)[]) v[k] += r[k];
    return { label: fmtShort(start), values: v };
  });

  // karigar comparison, last 28 days
  const since = addDays(TODAY, -27);
  const kRows = karigars.map((k) => {
    const e = output.filter((o) => o.karigarId === k.id && o.date >= since);
    const days = new Set(e.map((o) => o.date)).size;
    const done = e.reduce((a, o) => a + o.completed, 0);
    const rej = e.reduce((a, o) => a + o.rejected, 0);
    const finished = productionOrders.filter((p) => p.completedOn && p.stages.some((s) => s.stage === k.stage && s.assignee?.id === k.id));
    const turnaround = finished.length ? finished.reduce((a, p) => a + daysBetween(p.startDate, p.completedOn!), 0) / finished.length : 0;
    const pending = productionOrders.filter((p) => p.status !== "Completed").reduce((a, p) => a + (p.stages.find((s) => s.assignee?.id === k.id && s.pending > 0)?.pending ?? 0), 0);
    return { k, perDay: days ? done / days : 0, vsTarget: days ? done / days / k.dailyTarget : 0, rate: done ? (rej / done) * 100 : 0, turnaround, pending };
  });

  // stage turnaround and rework from completed POs
  const completed = productionOrders.filter((p) => p.completedOn);
  const avgLead = completed.reduce((a, p) => a + daysBetween(p.startDate, p.completedOn!), 0) / Math.max(1, completed.length);
  const rework = stages.map((s) => {
    const st = completed.map((p) => p.stages.find((x) => x.stage === s.id)!);
    const assigned = st.reduce((a, x) => a + x.assigned, 0);
    const rej = st.reduce((a, x) => a + x.rejected, 0);
    return { label: s.name, value: assigned ? Math.round((rej / assigned) * 1000) / 10 : 0 };
  });

  return (
    <>
      <PageHeader title="Sales and productivity analytics" subtitle="Which products sell, which don't, and how each karigar and stage is performing." />
      <AddonBanner title="Sales and productivity analytics" price="₹40,000">The base system has daily and weekly output and sales by channel. This add-on adds bestsellers, slow movers, trends and side-by-side karigar comparisons.</AddonBanner>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales, last 13 weeks" value={inrShort(weeks.reduce((a, w) => a + Object.values(w.values).reduce((x, y) => x + y, 0), 0))} />
        <Stat label="Products with no sale in 90 days" value={perf.filter((x) => x.units === 0).length} tone="warn" />
        <Stat label="Average order-to-ready time" value={`${num(avgLead, 1)} days`} hint={`${completed.length} completed production orders`} />
        <Stat label="QC rejection rate" value={`${rework.find((r) => r.label === "Quality check")?.value ?? 0}%`} />
      </div>

      <Card title="Weekly sales by channel" className="mb-6">
        <StackedBars
          data={weeks}
          series={[
            { key: "Shopify", label: "Shopify", color: "var(--color-s1)" },
            { key: "Wholesale", label: "Wholesale", color: "var(--color-s2)" },
            { key: "Offline", label: "Offline", color: "var(--color-s3)" },
            { key: "Consignment", label: "Consignment", color: "var(--color-s4)" },
          ]}
          format="inr"
        />
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Bestsellers, last 90 days">
          <HBars rows={best.map((b) => ({ label: <Link href={`/products/${b.p.id}`} className="inline-flex items-center gap-2 hover:underline"><ProductThumb src={b.p.image} alt={b.p.name} size={20} />{b.p.name}</Link>, value: b.revenue, note: `${b.units} pcs` }))} format="inr" />
        </Card>
        <Card title="Slowest sellers, last 90 days" pad={false}>
          <SimpleTable
            head={["Product", "Units", "Revenue", "Finished stock"]}
            align={["left", "right", "right", "right"]}
            rows={slow.map((s) => [
              <Link key="p" href={`/products/${s.p.id}`} className="inline-flex items-center gap-2 hover:underline"><ProductThumb src={s.p.image} alt={s.p.name} size={20} />{s.p.name}</Link>,
              s.units, inr(s.revenue), Object.values(s.p.stock as unknown as Record<string, number>).reduce((a, b) => a + b, 0),
            ])}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title="Karigar comparison, last 28 days" pad={false}>
          <SimpleTable
            head={["Karigar", "Stage", "Pieces per day", "Against target", "Rejection rate", "Avg turnaround", "Pending"]}
            align={["left", "left", "right", "right", "right", "right", "right"]}
            rows={kRows.map((r) => [
              <Link key="k" href={`/people/karigars/${r.k.id}`} className="hover:underline">{r.k.name}</Link>,
              stageName(r.k.stage),
              num(r.perDay, 1),
              <span key="t" className={r.vsTarget < 0.85 ? "text-bad" : r.vsTarget >= 1 ? "text-good" : ""}>{Math.round(r.vsTarget * 100)}%</span>,
              <span key="r" className={r.rate > 8 ? "text-bad" : ""}>{num(r.rate, 1)}%</span>,
              r.turnaround ? `${num(r.turnaround, 1)} days` : "—",
              r.pending || "—",
            ])}
          />
        </Card>
        <Card title="Rework rate by stage">
          <HBars rows={rework.map((r) => ({ label: r.label, value: r.value }))} format="pct" color="var(--color-s2)" />
          <p className="mt-3 text-xs text-muted">Share of pieces rejected and sent back at each stage, from completed production orders.</p>
        </Card>
      </div>
    </>
  );
}
