import Link from "next/link";
import { AlertTriangle, Check, Store, Truck } from "lucide-react";
import { Card, KeyValues, PageHeader, ProductThumb, StatusBadge, UrgencyBadge, Badge, Progress, Button } from "@/components/ui";
import {
  orders, getOrder, getProduct, productionOrders, stageName, fmtDate, inr, orderUrgency, addDays, daysBetween, stages, TODAY,
  sourceOf, shipmentForOrder, shipmentFlag, daysSinceScan,
} from "@/lib/data";
import AddAwb from "./AddAwb";

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
  const src = sourceOf(o.channel);
  const ship = shipmentForOrder(o.id);
  const flag = ship ? shipmentFlag(ship) : null;
  const shopifyRef = "shopifyRef" in o ? o.shopifyRef : null;
  const challanId = "challanId" in o ? o.challanId : null;
  const handedOver = "handedOver" in o && o.handedOver;
  const courier = "courier" in o ? o.courier : null;
  const awb = "awb" in o ? o.awb : null;
  const stepDate = (i: number) => (i === 0 ? o.date : i === 4 && o.dispatchedOn ? o.dispatchedOn : addDays(o.date, Math.round((span * [0, 0.1, 0.75, 0.9, 1][i]))));

  return (
    <>
      <PageHeader
        back={{ href: "/orders", label: "Orders" }}
        title={`${o.ref}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone={src.tone}>{src.prefix} · {src.label}</Badge>
            {shopifyRef && <span>Shopify {shopifyRef} ·</span>}
            {o.customer}, {o.city} · received {fmtDate(o.date)} <StatusBadge status={o.status} /> {o.status !== "Dispatched" && <UrgencyBadge u={u} />}
            {o.custom && <Badge tone="rose">Custom +10%</Badge>}
            {o.market === "International" && <Badge tone="info">International</Badge>}
          </span>
        }
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
                      <p>{it.qty} × {"priceUsd" in it && it.priceUsd ? <>${it.priceUsd} <span className="text-xs text-muted">({inr(it.price)})</span></> : inr(it.price)}</p>
                      <p className="text-xs text-muted">{inr(it.qty * it.price)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-4 py-3 text-sm tabular">
              {o.custom && (
                <>
                  <div className="flex justify-between text-muted"><dt>Subtotal</dt><dd>{inr(o.subtotal)}</dd></div>
                  <div className="flex justify-between text-rose"><dt>Custom order markup (10%)</dt><dd>+ {inr(o.markup)}</dd></div>
                </>
              )}
              <div className="flex justify-between font-medium"><dt>{o.channel === "Consignment" ? "Value at retail (settles as the store sells)" : "Order total"}</dt><dd>{inr(o.total)}</dd></div>
              {o.market === "International" && o.channel !== "Wholesale" && <p className="text-xs text-muted">Priced from the international price list in US$.</p>}
            </dl>
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
          {challanId && (
            <Card title="Consignment challan">
              <Link href={`/addons/consignment/challans/${challanId}`} className="flex items-center gap-3 text-sm hover:underline">
                <Store className="size-4 shrink-0 text-muted" />
                <span><span className="font-medium">{challanId}</span><span className="block text-xs text-muted">Stock sent to {o.customer} on sale or return. Open the challan to print it.</span></span>
              </Link>
            </Card>
          )}
          <Card title="Shipment" action={ship ? <Link href={`/addons/shipments/${ship.id}`} className="text-xs text-muted hover:text-ink">Tracking →</Link> : undefined}>
            {ship ? (
              <div className="space-y-3">
                {flag && (
                  <p className="flex items-start gap-2 rounded-lg bg-bad-soft/70 px-3 py-2 text-sm text-bad">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {flag === "Not moving" ? `No scan for ${daysSinceScan(ship)} days` : flag === "Delayed" ? `Past expected delivery (${fmtDate(ship.expectedBy)})` : ship.lastScan.text}
                  </p>
                )}
                <KeyValues
                  rows={[
                    ["Courier", ship.provider],
                    ["AWB", <span key="a" className="tabular">{ship.awb}</span>],
                    ["Status", <StatusBadge key="s" status={ship.status} />],
                    ["Last scan", `${ship.lastScan.text}, ${ship.lastScan.location} · ${fmtDate(ship.lastScan.date)} ${ship.lastScan.time}`],
                    [ship.deliveredOn ? "Delivered" : "Expected by", fmtDate(ship.deliveredOn ?? ship.expectedBy)],
                    ...(ship.shopifySync !== "Not applicable" ? [["AWB on Shopify", <StatusBadge key="y" status={ship.shopifySync} />] as [string, React.ReactNode]] : []),
                  ]}
                />
              </div>
            ) : handedOver ? (
              <p className="flex items-start gap-2 text-sm text-muted"><Truck className="mt-0.5 size-4 shrink-0" />Handed over at the event, nothing to ship.</p>
            ) : o.status === "Ready to dispatch" ? (
              <AddAwb international={o.market === "International"} shopify={o.channel === "Shopify"} />
            ) : o.status === "Dispatched" ? (
              <p className="text-sm text-muted">{awb ? `${courier} ${awb}. ` : ""}Dispatched {o.dispatchedOn ? fmtDate(o.dispatchedOn) : ""} and delivered.</p>
            ) : (
              <p className="text-sm text-muted">The AWB is added once the order is packed and ready to dispatch.</p>
            )}
          </Card>
          <Card title="Order details">
            <KeyValues
              rows={[
                ["Source", `${src.label} (${src.prefix})` + ("source" in o && o.source ? ` · ${o.source}` : "")],
                ...(shopifyRef ? [["Shopify order", shopifyRef] as [string, React.ReactNode]] : []),
                ["Market", o.market],
                ["Custom order", o.custom ? "Yes, 10% markup" : "No"],
                ["Customer", o.customer],
                ["City", o.city],
                ["Payment", o.payment],
                ["Fulfilment", o.fulfilment],
                ["Due date", fmtDate(o.dueDate)],
                ["Dispatched", o.dispatchedOn ? `${fmtDate(o.dispatchedOn)}${handedOver ? " · handed over" : courier && awb ? ` · ${courier} ${awb}` : ""}` : "Not yet"],
              ]}
            />
          </Card>
          <Card title="Activity">
            <ul className="space-y-3 text-sm">
              <li><p>{o.channel === "Consignment" ? `Created from challan ${challanId}` : `Order received${o.channel === "Shopify" ? ` from Shopify (${shopifyRef})` : ""}`}</p><p className="text-xs text-muted">{fmtDate(o.date)}</p></li>
              {pos.length > 0 && <li><p>{pos.length} production order{pos.length > 1 ? "s" : ""} created, materials checked</p><p className="text-xs text-muted">{fmtDate(addDays(o.date, 1))}</p></li>}
              {o.status !== "New" && <li><p>Status moved to {o.status}</p><p className="text-xs text-muted">{fmtDate(stepDate(Math.max(1, reached)))}</p></li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
