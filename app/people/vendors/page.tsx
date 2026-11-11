import Link from "next/link";
import { Card, PageHeader, SimpleTable, Badge } from "@/components/ui";
import { vendors, productionOrders, getProduct, stageName, fmtDate, poUrgency } from "@/lib/data";

export const metadata = { title: "Vendors" };

export default function VendorsPage() {
  const jobs = productionOrders
    .filter((p) => p.status !== "Completed")
    .flatMap((p) => p.stages.filter((s) => s.assignee?.kind === "vendor" && s.pending > 0).map((s) => ({ p, s })));
  return (
    <>
      <PageHeader title="External vendors" subtitle="Job work sent outside the studio, tracked by stage like in-house work." />
      <Card pad={false} className="mb-6">
        <SimpleTable
          head={["Vendor", "Service", "Stage", "City", "Phone", "Open jobs"]}
          align={["left", "left", "left", "left", "left", "right"]}
          rows={vendors.map((v) => [<span key="n" className="font-medium">{v.name}</span>, v.service, <Badge key="s">{stageName(v.stage)}</Badge>, v.city, v.phone, v.activeJobs])}
        />
      </Card>
      <Card title="Work out with vendors" pad={false}>
        <SimpleTable
          head={["Production order", "Product", "Vendor", "Sent", "Pending", "Due", ""]}
          align={["left", "left", "left", "right", "right", "left", "left"]}
          rows={jobs.map(({ p, s }) => [
            <Link key="p" href={`/production/${p.id}`} className="hover:underline">{p.id}</Link>,
            `${getProduct(p.productId)?.name} · ${p.size}`,
            vendors.find((v) => v.id === s.assignee?.id)?.name,
            s.assigned, s.pending, fmtDate(p.dueDate),
            poUrgency(p) === "overdue" ? <Badge key="u" tone="bad">Late</Badge> : poUrgency(p) === "due-soon" ? <Badge key="u" tone="warn">Due soon</Badge> : "",
          ])}
        />
      </Card>
    </>
  );
}
