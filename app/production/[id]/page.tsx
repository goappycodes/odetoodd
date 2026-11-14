import Link from "next/link";
import { AlertTriangle, CircleCheck } from "lucide-react";
import { Card, KeyValues, PageHeader, ProductThumb, StatusBadge, UrgencyBadge, Badge, SimpleTable, Button, MaterialLink } from "@/components/ui";
import {
  productionOrders, getProduct, stages, stageName, poUrgency, fmtDate, assigneeName, poRequirements, num, output,
  getKarigar, daysBetween, TODAY,
} from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return productionOrders.map((p) => ({ id: p.id }));
}

export default async function ProductionOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = productionOrders.find((x) => x.id === id)!;
  const prod = getProduct(p.productId)!;
  const reqs = poRequirements(p);
  const short = reqs.filter((r) => r.short > 0);
  const log = output.filter((o) => o.poId === p.id).slice(-10).reverse();
  const u = poUrgency(p);
  const days = daysBetween(TODAY, p.dueDate);

  return (
    <>
      <PageHeader
        back={{ href: "/production", label: "Production orders" }}
        title={`${p.id} · ${prod.name}`}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{p.qty} × size {p.size} for <Link href={`/orders/${p.orderId}`} className="underline">{p.orderRef}</Link> <StatusBadge status={p.status} /> {u !== "done" && <UrgencyBadge u={u} />}</span>}
        actions={
          <>
            <Button variant="secondary">Print job card</Button>
            <Button href="/production/daily-entry">Update output</Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Stages" pad={false}>
            <SimpleTable
              head={["Stage", "Assigned to", "Assigned", "Completed", "Rejected", "Pending", ""]}
              align={["left", "left", "right", "right", "right", "right", "left"]}
              rows={p.stages.map((s) => {
                const isCurrent = s.stage === p.currentStage;
                const done = s.assigned > 0 && s.pending === 0;
                return [
                  <span key="n" className={isCurrent ? "font-medium" : ""}>{stageName(s.stage)}</span>,
                  <span key="a" className="block max-w-56 truncate">{assigneeName(s.assignee)}{s.assignee?.kind === "vendor" && <span className="ml-1.5"><Badge tone="rose">Vendor</Badge></span>}</span>,
                  s.assigned || "—",
                  s.completed || "—",
                  s.rejected ? <span key="r" className="text-bad">{s.rejected}</span> : "—",
                  s.pending || "—",
                  done ? <Badge key="b" tone="good">Done</Badge> : isCurrent ? <Badge key="b" tone="info">In progress</Badge> : <span key="b" className="text-xs text-muted">Waiting</span>,
                ];
              })}
            />
          </Card>

          <Card title="Material requirement" action={short.length ? <Badge tone="warn">{short.length} short</Badge> : <Badge tone="good">All available</Badge>} pad={false}>
            <SimpleTable
              head={["Material", "Per piece", `Needed for ${p.qty}`, "In stock", ""]}
              align={["left", "right", "right", "right", "left"]}
              rows={reqs.map((r) => [
                <MaterialLink key="m" m={r.material} />,
                `${num(r.perPiece, 2)} ${r.material.unit}`,
                `${num(r.required, 2)} ${r.material.unit}`,
                `${num(r.available, 1)} ${r.material.unit}`,
                r.short > 0 ? <span key="s" className="inline-flex items-center gap-1 text-xs text-bad"><AlertTriangle className="size-3.5" />Short {num(r.short, 1)}</span> : <CircleCheck key="s" className="size-4 text-good" />,
              ])}
            />
            <p className="border-t border-line px-4 py-3 text-xs text-muted">Calculated from the product BOM ({prod.sku}) and current stock.</p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex gap-3">
              <ProductThumb src={prod.image} alt={prod.name} size={64} />
              <div className="text-sm">
                <Link href={`/products/${prod.id}`} className="font-medium hover:underline">{prod.name}</Link>
                <p className="text-muted">{prod.sku}</p>
                <p className="text-muted">{prod.fabric}, {prod.colour}</p>
              </div>
            </div>
            {p.note && <p className="mt-3 rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{p.note}</p>}
          </Card>
          <Card title="Timeline">
            <KeyValues
              rows={[
                ["Started", fmtDate(p.startDate)],
                ["Due", `${fmtDate(p.dueDate)}${u === "done" ? "" : days < 0 ? ` · ${-days} days late` : ` · ${days} days left`}`],
                ["Completed", p.completedOn ? fmtDate(p.completedOn) : "Not yet"],
                ["Priority", p.priority],
                ["Channel", p.channel],
                ["Current stage", stageName(p.currentStage)],
                ["Typical time", `${stages.reduce((a, s) => a + s.avgDays, 0)} working days`],
              ]}
            />
          </Card>
          <Card title="Recent output entries">
            {log.length === 0 ? (
              <p className="text-sm text-muted">No entries yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {log.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{getKarigar(l.karigarId)?.name} <span className="text-xs text-muted">· {stageName(l.stage)}</span></span>
                    <span className="text-xs text-muted tabular">{fmtDate(l.date)} · {l.completed} done{l.rejected ? `, ${l.rejected} rejected` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
