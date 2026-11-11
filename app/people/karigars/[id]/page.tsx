import Link from "next/link";
import { Card, KeyValues, PageHeader, Stat, Badge, StatusBadge, SimpleTable } from "@/components/ui";
import { StackedBars } from "@/components/charts";
import { karigars, getKarigar, output, productionOrders, getProduct, stageName, fmtDate, fmtShort, addDays, TODAY, num } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return karigars.map((k) => ({ id: k.id }));
}

export default async function KarigarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = getKarigar(id)!;
  const mine = output.filter((o) => o.karigarId === id);
  const days = Array.from({ length: 28 }, (_, i) => addDays(TODAY, -27 + i));
  const daily = days.map((d) => {
    const e = mine.filter((o) => o.date === d);
    return { label: fmtShort(d), values: { done: e.reduce((a, o) => a + o.completed, 0), rejected: e.reduce((a, o) => a + o.rejected, 0) } };
  });
  const week = mine.filter((o) => o.date >= addDays(TODAY, -6));
  const done28 = mine.filter((o) => o.date >= days[0]).reduce((a, o) => a + o.completed, 0);
  const rej28 = mine.filter((o) => o.date >= days[0]).reduce((a, o) => a + o.rejected, 0);
  const workDays = new Set(mine.filter((o) => o.date >= days[0]).map((o) => o.date)).size;
  const assigned = productionOrders.filter((p) => p.status !== "Completed" && p.stages.some((s) => (s.assignee?.id === id || ("operator" in (s.assignee ?? {}) && (s.assignee as { operator?: string }).operator === id)) && s.pending > 0));

  return (
    <>
      <PageHeader back={{ href: "/people/karigars", label: "Karigars" }} title={k.name} subtitle={<span className="inline-flex items-center gap-2">{k.role} · {stageName(k.stage)} <StatusBadge status={k.status} /></span>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pieces, last 7 days" value={week.reduce((a, o) => a + o.completed, 0)} />
        <Stat label="Pieces, last 28 days" value={done28} hint={`${workDays} days worked`} />
        <Stat label="Average per day" value={num(workDays ? done28 / workDays : 0, 1)} hint={`Target ${num(k.dailyTarget, 1)}`} tone={workDays && done28 / workDays >= k.dailyTarget * 0.95 ? "good" : "warn"} />
        <Stat label="Rejected, 28 days" value={rej28} hint={done28 ? `${num((rej28 / done28) * 100, 1)}% of output` : undefined} tone={rej28 ? "warn" : "good"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Daily output, last 4 weeks" className="xl:col-span-2">
          <StackedBars
            data={daily}
            series={[{ key: "done", label: "Completed", color: "var(--color-s1)" }, { key: "rejected", label: "Rejected", color: "var(--color-s2)" }]}
            format="num"
            labelEvery={4}
          />
        </Card>
        <Card title="Details">
          <KeyValues rows={[["ID", k.id], ["Role", k.role], ["Main stage", stageName(k.stage)], ["Joined", fmtDate(k.joined)], ["Phone", k.phone], ["Daily target", `${num(k.dailyTarget, 1)} pieces`]]} />
        </Card>
      </div>
      <Card title="Work assigned now" className="mt-6" pad={false}>
        <SimpleTable
          head={["Production order", "Product", "Stage", "Assigned", "Done", "Pending", "Due"]}
          align={["left", "left", "left", "right", "right", "right", "left"]}
          rows={assigned.map((p) => {
            const s = p.stages.find((x) => (x.assignee?.id === id || (x.assignee as { operator?: string } | null)?.operator === id) && x.pending > 0)!;
            return [
              <Link key="p" href={`/production/${p.id}`} className="hover:underline">{p.id}</Link>,
              `${getProduct(p.productId)?.name} · ${p.size}`,
              <Badge key="s">{stageName(s.stage)}</Badge>,
              s.assigned, s.completed, s.pending, fmtDate(p.dueDate),
            ];
          })}
        />
        {assigned.length === 0 && <p className="p-4 text-sm text-muted">No open work assigned.</p>}
      </Card>
    </>
  );
}
