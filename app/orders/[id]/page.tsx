import Link from "next/link";
import { Check } from "lucide-react";
import { Card, KeyValues, PageHeader, ProductThumb, StatusBadge, UrgencyBadge, Badge, Progress, Button } from "@/components/ui";
import { orders, getOrder, getProduct, productionOrders, stageName, fmtDate, inr, orderUrgency, addDays, daysBetween, stages, TODAY } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return orders.map((o) => ({ id: o.id }));
}

const FLOW = ["Received", "In production", "Quality check", "Ready to dispatch", "Dispatched"];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = getOrder(id)!;
  const pos = productionOrders.filter((p) => p.orderId === o.id);
  const u = orderUrgency(o);
  const reached = o.status === "New" ? 0 : FLOW.indexOf(o.status);
  const span = Math.max(1, daysBetween(o.date, o.dispatchedOn ?? TODAY));
  const stepDate = (i: number) => (i === 0 ? o.date : i === 4 && o.dispatchedOn ? o.dispatchedOn : addDays(o.date, Math.round((span * [0, 0.1, 0.75, 0.9, 1][i]))));

  return (
    <>
      <PageHeader
        back={{ href: "/orders", label: "Orders" }}
        title={`${o.ref}`}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{o.channel} order from {o.customer}, {o.city} · received {fmtDate(o.date)} <StatusBadge status={o.status} /> {o.status !== "Dispatched" && <UrgencyBadge u={u} />}</span>}
        actions={
          <>
            <Button variant="secondary">Print job card</Button>
            {o.status === "Ready to dispatch" ? <Button>Mark dispatched</Button> : <Button variant="secondary">Edit order</Button>}
          </>
        }
      />

      <Card className="mb-6">
        <ol className="grid gap-4 sm:grid-cols-5">
          {FLOW.map((step, i) => {
            const done = i <= reached;
            const current = i === reached && o.status !== "Dispatched";
            return (
              <li key={step} className="flex items-start gap-3 sm:flex-col sm:gap-2">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs ${done ? "border-ink bg-ink text-paper" : "border-line text-muted"} ${current ? "ring-4 ring-ink/10" : ""}`}>
                  {done && !current ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="text-sm">
                  <span className={done ? "font-medium" : "text-muted"}>{step}</span>
                  <span className="block text-xs text-muted">{done ? fmtDate(stepDate(i)) : i === 4 ? `Due ${fmtDate(o.dueDate)}` : "Pending"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Items" pad={false}>
            <ul className="divide-y divide-line/70">
              {o.items.map((it, i) => {
                const p = getProduct(it.productId)!;
                return (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <ProductThumb src={p.image} alt={p.name} size={44} />
                    <div className="min-w-0 flex-1 text-sm">
                      <Link href={`/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                      <p className="text-xs text-muted">{p.sku} · Size {it.size} · {p.fabric}, {p.colour}</p>
                      {"note" in it && it.note && <p className="mt-0.5 text-xs text-rose">{it.note}</p>}
                    </div>
                    <div className="text-right text-sm tabular">
                      <p>{it.qty} × {inr(it.price)}</p>
                      <p className="text-xs text-muted">{inr(it.qty * it.price)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-between border-t border-line px-4 py-3 text-sm font-medium tabular">
              <span>Order total</span>
              <span>{inr(o.total)}</span>
            </div>
          </Card>

          <Card title="Production for this order" pad={false}>
            {pos.length === 0 ? (
              <p className="p-4 text-sm text-muted">Fulfilled from finished stock. No production needed.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {pos.map((p) => {
                  const prod = getProduct(p.productId)!;
                  const doneStages = p.stages.filter((s) => s.assigned > 0 && s.pending === 0).length;
                  return (
                    <li key={p.id}>
                      <Link href={`/production/${p.id}`} className="block px-4 py-3 hover:bg-sand/50">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium">{p.id} · {prod.name} · {p.size} × {p.qty}</span>
                          <span className="flex items-center gap-2"><Badge>{stageName(p.currentStage)}</Badge><StatusBadge status={p.status} /></span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <Progress value={p.status === "Completed" ? stages.length : doneStages} max={stages.length} tone={p.status === "Completed" ? "good" : "ink"} />
                          <span className="text-xs text-muted whitespace-nowrap tabular">{p.status === "Completed" ? stages.length : doneStages}/{stages.length} stages</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Order details">
            <KeyValues
              rows={[
                ["Channel", o.channel + ("source" in o && o.source ? ` · ${o.source}` : "")],
                ["Customer", o.customer],
                ["City", o.city],
                ["Payment", o.payment],
                ["Fulfilment", o.fulfilment],
                ["Due date", fmtDate(o.dueDate)],
                ["Dispatched", o.dispatchedOn ? `${fmtDate(o.dispatchedOn)} · ${o.awb}` : "Not yet"],
              ]}
            />
          </Card>
          <Card title="Activity">
            <ul className="space-y-3 text-sm">
              <li><p>Order received{o.channel === "Shopify" ? " from Shopify" : ""}</p><p className="text-xs text-muted">{fmtDate(o.date)}</p></li>
              {pos.length > 0 && <li><p>{pos.length} production order{pos.length > 1 ? "s" : ""} created, materials checked</p><p className="text-xs text-muted">{fmtDate(addDays(o.date, 1))}</p></li>}
              {o.status !== "New" && <li><p>Status moved to {o.status}</p><p className="text-xs text-muted">{fmtDate(stepDate(Math.max(1, reached)))}</p></li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
