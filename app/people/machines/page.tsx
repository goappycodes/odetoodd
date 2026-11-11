import { Card, PageHeader, SimpleTable, StatusBadge, Badge } from "@/components/ui";
import { machines, output, stageName, addDays, TODAY, getKarigar } from "@/lib/data";

export const metadata = { title: "Machines" };

export default function MachinesPage() {
  const weekStart = addDays(TODAY, -6);
  return (
    <>
      <PageHeader title="Machines and workstations" subtitle="Output is recorded against the machine whenever a stitching entry names one." />
      <Card pad={false}>
        <SimpleTable
          head={["ID", "Machine", "Type", "Stage", "Status", "Pieces today", "Pieces, 7 days", "Operators this week"]}
          align={["left", "left", "left", "left", "left", "right", "right", "left"]}
          rows={machines.map((m) => {
            const e = output.filter((o) => o.machineId === m.id);
            const week = e.filter((o) => o.date >= weekStart);
            const ops = [...new Set(week.map((o) => getKarigar(o.karigarId)?.name))].join(", ");
            return [
              m.id, m.name, m.type, <Badge key="s">{stageName(m.stage)}</Badge>, <StatusBadge key="st" status={m.status} />,
              e.filter((o) => o.date === TODAY).reduce((a, o) => a + o.completed, 0),
              week.reduce((a, o) => a + o.completed, 0),
              <span key="o" className="text-muted">{ops || "—"}</span>,
            ];
          })}
        />
      </Card>
    </>
  );
}
