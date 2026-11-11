import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, PageHeader, SimpleTable, Badge, Button } from "@/components/ui";
import { karigars, output, productionOrders, stageName, addDays, TODAY, num } from "@/lib/data";

export const metadata = { title: "Karigars" };

export default function KarigarsPage() {
  const weekStart = addDays(TODAY, -6);
  const prevStart = addDays(TODAY, -13);
  const rows = karigars.map((k) => {
    const mine = output.filter((o) => o.karigarId === k.id);
    const today = mine.filter((o) => o.date === TODAY).reduce((a, o) => a + o.completed, 0);
    const week = mine.filter((o) => o.date >= weekStart);
    const weekDone = week.reduce((a, o) => a + o.completed, 0);
    const prevDone = mine.filter((o) => o.date >= prevStart && o.date < weekStart).reduce((a, o) => a + o.completed, 0);
    const rejected = week.reduce((a, o) => a + o.rejected, 0);
    const pending = productionOrders.filter((p) => p.status !== "Completed").reduce((a, p) => {
      const s = p.stages.find((x) => x.assignee?.kind === "karigar" && x.assignee.id === k.id && x.pending > 0);
      return a + (s ? s.pending : 0);
    }, 0);
    return { k, today, weekDone, prevDone, rejected, pending };
  });

  return (
    <>
      <PageHeader title="Karigars and workers" subtitle="Records for everyone on the floor, with output from the daily entries." actions={<Button><Plus className="size-4" />Add karigar</Button>} />
      <Card pad={false}>
        <SimpleTable
          head={["Name", "Role", "Main stage", "Today", "Last 7 days", "Week before", "Rejected (7 days)", "Pending work", "Daily target"]}
          align={["left", "left", "left", "right", "right", "right", "right", "right", "right"]}
          rows={rows.map(({ k, today, weekDone, prevDone, rejected, pending }) => [
            <Link key="n" href={`/people/karigars/${k.id}`} className="font-medium hover:underline">{k.name}</Link>,
            k.role,
            <Badge key="s">{stageName(k.stage)}</Badge>,
            today,
            <span key="w" className={weekDone < prevDone ? "text-bad" : ""}>{weekDone}</span>,
            prevDone,
            rejected ? <span key="r" className="text-bad">{rejected}</span> : 0,
            pending ? `${pending} pcs` : "—",
            `${num(k.dailyTarget, 1)} pcs`,
          ])}
        />
      </Card>
      <p className="mt-3 text-sm text-muted">Side-by-side comparisons of turnaround time and rework rates are in the <Link href="/addons/analytics" className="text-ink underline">analytics add-on</Link>.</p>
    </>
  );
}
