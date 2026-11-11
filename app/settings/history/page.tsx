import { Card, PageHeader, SimpleTable, Badge } from "@/components/ui";
import { changeLog, movements, fmtDate, getMaterial, getProduct, num } from "@/lib/data";

export const metadata = { title: "Change history" };

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="Change history" subtitle="A permanent record of important changes: prices, minimum levels, BOM uploads, due dates and user access." />
      <Card title="Important changes" pad={false} className="mb-6">
        <SimpleTable
          head={["When", "Who", "Action", "Detail"]}
          rows={changeLog.map((c) => [c.time, c.user, <Badge key="a">{c.action}</Badge>, <span key="d" className="text-muted">{c.detail}</span>])}
        />
      </Card>
      <Card title="Latest stock changes" pad={false}>
        <SimpleTable
          head={["Date", "Entry", "Type", "Item", "Qty", "By"]}
          align={["left", "left", "left", "left", "right", "left"]}
          rows={movements.slice(0, 15).map((m) => [
            fmtDate(m.date), m.id, m.type,
            m.itemType === "Material" ? getMaterial(m.itemId)?.name : getProduct(m.itemId)?.name,
            `${m.qty > 0 ? "+" : ""}${num(m.qty, 1)} ${m.unit}`, m.by,
          ])}
        />
      </Card>
    </>
  );
}
