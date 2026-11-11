import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, Factory, Layers, RefreshCw, XCircle } from "lucide-react";
import { Card, PageHeader, Stat, StatusBadge, UrgencyBadge, Button, ProductThumb } from "@/components/ui";
import { StackedBars, HBars } from "@/components/charts";
import {
  TODAY, addDays, fmtDate, fmtShort, inr, inrShort, num, salesDaily, salesInRange, openOrders, orderUrgency,
  lowStockMaterials, materialStatus, productionOrders, poUrgency, piecesInProduction, outputBetween, stages,
  karigars, getKarigar, syncLog, getProduct, products, finishedUnits, daysBetween,
} from "@/lib/data";

export const metadata = { title: "Owner dashboard" };

const SALES_SERIES = [
  { key: "Shopify", label: "Shopify", color: "var(--color-s1)" },
  { key: "Wholesale", label: "Wholesale", color: "var(--color-s2)" },
  { key: "Offline", label: "Offline", color: "var(--color-s3)" },
];

export default function Dashboard() {
  const today = salesInRange(1);
  const week = salesInRange(7);
  const lastWeek = salesInRange(7, 7);
  const monthDays = Number(TODAY.slice(8, 10));
  const month = salesInRange(monthDays);
  const base = (s: { Shopify: number; Wholesale: number; Offline: number }) => s.Shopify + s.Wholesale + s.Offline;
  const weekChange = base(lastWeek) ? Math.round(((base(week) - base(lastWeek)) / base(lastWeek)) * 100) : 0;

  const open = openOrders();
  const overdue = open.filter((o) => orderUrgency(o) === "overdue");
  const dueSoon = open.filter((o) => orderUrgency(o) === "due-soon");
  const low = lowStockMaterials();
  const activePOs = productionOrders.filter((p) => p.status !== "Completed");
  const latePOs = activePOs.filter((p) => poUrgency(p) === "overdue");
  const failedSyncs = syncLog.filter((s) => s.status === "Failed");

  const last30 = salesDaily.slice(-30).map((r) => ({ label: fmtShort(r.date), values: { Shopify: r.Shopify, Wholesale: r.Wholesale, Offline: r.Offline } }));

  const todayOut = outputBetween(TODAY, TODAY);
  const weekStart = addDays(TODAY, -6);
  const weekOut = outputBetween(weekStart, TODAY);
  const byStage = stages.map((s) => ({
    label: s.name,
    today: todayOut.filter((o) => o.stage === s.id).reduce((a, o) => a + o.completed, 0),
    week: weekOut.filter((o) => o.stage === s.id).reduce((a, o) => a + o.completed, 0),
    wip: activePOs.filter((p) => p.currentStage === s.id).reduce((a, p) => a + p.qty, 0),
  }));
  const byKarigar = karigars
    .map((k) => ({ k, week: weekOut.filter((o) => o.karigarId === k.id).reduce((a, o) => a + o.completed, 0) }))
    .sort((a, b) => b.week - a.week)
    .slice(0, 8);

  const dueList = [...overdue, ...dueSoon].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).slice(0, 8);
  const fgUnits = products.reduce((a, p) => a + finishedUnits(p), 0);
  const fgValue = products.reduce((a, p) => a + finishedUnits(p) * p.price, 0);
  const weekday = new Date(TODAY + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });

  const alerts = [
    { tone: "bad", icon: XCircle, text: `${overdue.length} orders are overdue`, href: "/orders?due=overdue" },
    { tone: "warn", icon: Clock, text: `${dueSoon.length} orders are due in the next 7 days`, href: "/orders?due=due-soon" },
    { tone: "bad", icon: Layers, text: `${low.length} raw materials are below minimum stock`, href: "/inventory/materials?status=below" },
    { tone: "warn", icon: Factory, text: `${latePOs.length} production orders are behind their due date`, href: "/production?due=overdue" },
    { tone: "bad", icon: RefreshCw, text: `${failedSyncs.length} Shopify syncs need attention`, href: "/shopify" },
  ] as const;

  return (
    <>
      <PageHeader
        title="Good morning"
        subtitle={`${weekday}, ${fmtDate(TODAY)} · Here is where the studio stands today.`}
        actions={
          <>
            <Button variant="secondary" href="/settings/daily-summary">Daily summary</Button>
            <Button href="/reports">Reports</Button>
          </>
        }
      />

      <section className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {alerts.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.text}
              href={a.href}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors ${
                a.tone === "bad" ? "border-bad/25 bg-bad-soft/70 hover:bg-bad-soft" : "border-warn/25 bg-warn-soft/70 hover:bg-warn-soft"
              }`}
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${a.tone === "bad" ? "text-bad" : "text-warn"}`} />
              <span>{a.text}</span>
            </Link>
          );
        })}
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales today" value={inrShort(base(today))} hint={`${inr(today.Shopify)} Shopify`} />
        <Stat label="Sales, last 7 days" value={inrShort(base(week))} hint={`${weekChange >= 0 ? "+" : ""}${weekChange}% on the week before`} tone={weekChange >= 0 ? "good" : "bad"} />
        <Stat label={`Sales, ${fmtShort(addDays(TODAY, -(monthDays - 1)))} to date`} value={inrShort(base(month))} hint={`${inrShort(month.Wholesale)} wholesale`} />
        <Stat label="Pending orders" value={open.length} hint={`${num(piecesInProduction())} pieces in production`} href="/orders" />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Sales by channel, last 30 days" className="xl:col-span-2" action={<Link href="/reports?report=sales" className="text-xs text-muted hover:text-ink">Open report →</Link>}>
          <StackedBars data={last30} series={SALES_SERIES} format="inr" labelEvery={5} />
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
            {SALES_SERIES.map((s) => (
              <div key={s.key}>
                <p className="text-xs text-muted">{s.label}, this month</p>
                <p className="tabular">{inr(month[s.key as "Shopify"])}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Orders due and overdue" pad={false} action={<Link href="/orders" className="text-xs text-muted hover:text-ink">All orders →</Link>}>
          <ul className="divide-y divide-line/70">
            {dueList.map((o) => {
              const u = orderUrgency(o);
              const d = daysBetween(TODAY, o.dueDate);
              return (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-sand/60 ${u === "overdue" ? "border-l-4 border-bad" : "border-l-4 border-[#e0b100]"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{o.ref} · {o.customer}</p>
                      <p className="truncate text-xs text-muted">{o.items.map((i) => getProduct(i.productId)?.name).join(", ")}</p>
                    </div>
                    <div className="text-right text-xs">
                      <UrgencyBadge u={u} />
                      <p className="mt-1 text-muted tabular">{d < 0 ? `${-d} days late` : d === 0 ? "Due today" : `Due in ${d} days`}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Production output by stage" action={<Link href="/production" className="text-xs text-muted hover:text-ink">Production →</Link>}>
          <div className="scroll-x">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 text-right font-medium">Today</th>
                  <th className="pb-2 text-right font-medium">7 days</th>
                  <th className="pb-2 text-right font-medium">In progress</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {byStage.map((s) => (
                  <tr key={s.label} className="border-t border-line/70">
                    <td className="py-2">{s.label}</td>
                    <td className="py-2 text-right">{s.today}</td>
                    <td className="py-2 text-right">{s.week}</td>
                    <td className="py-2 text-right">{s.wip} pcs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">Embroidery is counted in finished pieces. Hand embroidery takes 7 to 10 days a piece.</p>
        </Card>

        <Card title="Karigar output, last 7 days" action={<Link href="/people/karigars" className="text-xs text-muted hover:text-ink">Karigars →</Link>}>
          <HBars
            rows={byKarigar.map(({ k, week }) => ({ label: <Link href={`/people/karigars/${k.id}`} className="hover:underline">{k.name} <span className="text-xs text-muted">· {k.role}</span></Link>, value: week }))}
            format="pcs"
          />
        </Card>

        <Card title="Raw materials below minimum" pad={false} action={<Link href="/inventory/materials" className="text-xs text-muted hover:text-ink">Materials →</Link>}>
          <ul className="divide-y divide-line/70">
            {low.slice(0, 7).map((m) => (
              <li key={m.id}>
                <Link href={`/inventory/materials/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-sand/60">
                  <AlertTriangle className={`size-4 shrink-0 ${materialStatus(m) === "Critical" ? "text-bad" : "text-warn"}`} />
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  <span className="text-right text-xs tabular">
                    <span className="font-medium">{num(m.stock)} {m.unit}</span>
                    <span className="text-muted"> / min {num(m.minLevel)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Production orders running late" pad={false}>
          <ul className="divide-y divide-line/70">
            {latePOs.slice(0, 6).map((p) => {
              const prod = getProduct(p.productId)!;
              const stage = p.stages.find((s) => s.stage === p.currentStage);
              return (
                <li key={p.id}>
                  <Link href={`/production/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-sand/60">
                    <ProductThumb src={prod.image} alt={prod.name} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.id} · {prod.name} ({p.size})</p>
                      <p className="truncate text-xs text-muted">At {stages.find((s) => s.id === p.currentStage)?.name} with {stage?.assignee ? (stage.assignee.kind === "karigar" ? getKarigar(stage.assignee.id)?.name : stage.assignee.id) : "nobody"}</p>
                    </div>
                    <span className="text-xs text-bad tabular">{-daysBetween(TODAY, p.dueDate)} days late</span>
                  </Link>
                </li>
              );
            })}
            {latePOs.length === 0 && <li className="px-4 py-6 text-sm text-muted">Nothing is running late.</li>}
          </ul>
        </Card>
        <Card title="Finished goods and sync status">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Finished pieces in stock" value={num(fgUnits)} hint={`${inrShort(fgValue)} at retail price`} href="/inventory/finished" />
            <Stat label="Shopify sync" value={<span className="text-2xl">{failedSyncs.length ? `${failedSyncs.length} failed` : "Healthy"}</span>} hint={`Last order synced ${syncLog[0].time.replace("T", " at ")}`} tone={failedSyncs.length ? "bad" : "good"} href="/shopify" />
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {failedSyncs.map((s) => (
              <li key={s.time} className="flex gap-2">
                <StatusBadge status={s.status} />
                <span className="text-muted">{s.ref}: {s.message}</span>
              </li>
            ))}
          </ul>
          <Link href="/settings/daily-summary" className="mt-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            See today&apos;s summary email <ArrowRight className="size-3.5" />
          </Link>
        </Card>
      </div>
    </>
  );
}
