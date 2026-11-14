import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AddonBanner, Card, KeyValues, PageHeader, StatusBadge, Button } from "@/components/ui";
import { shipments, shipmentFlag, daysSinceScan, getOrder, fmtDate, daysBetween, STUCK_DAYS } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return shipments.map((s) => ({ id: s.id }));
}

const getShipment = (id: string) => shipments.find((s) => s.id === id);

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getShipment(id)!;
  const o = getOrder(s.orderId);
  const flag = shipmentFlag(s);
  const scanAge = daysSinceScan(s);
  const reason =
    flag === "Exception" ? `The courier reported a problem: ${s.lastScan.text.toLowerCase()}.`
      : flag === "Not moving" ? `No scan for ${scanAge} days. Shipments are flagged after ${STUCK_DAYS} days without movement.`
      : flag === "Delayed" ? `Expected by ${fmtDate(s.expectedBy)} and not delivered yet.`
      : null;
  const message = "shopifyMessage" in s ? (s.shopifyMessage as string) : null;

  return (
    <>
      <PageHeader
        back={{ href: "/addons/shipments", label: "Shipment tracking" }}
        title={`${s.provider} ${s.awb}`}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{s.id} · {s.orderRef} to {s.destination} <StatusBadge status={s.status} /> {flag && <StatusBadge status={flag} />}</span>}
        actions={<Button variant="secondary"><RefreshCw className="size-4" />Refresh tracking</Button>}
      />
      <AddonBanner title="Shipment tracking" price="₹35,000">Part of the shipment tracking add-on.</AddonBanner>

      {reason && (
        <div className={`mb-6 rounded-xl border p-3 text-sm ${flag === "Delayed" ? "border-warn/25 bg-warn-soft/70" : "border-bad/25 bg-bad-soft/70"}`}>
          {reason} Call the courier or the customer, and note the outcome on the order.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Tracking" className="xl:col-span-2">
          <ol className="relative space-y-5 border-l border-line pl-6">
            {s.events.map((e, i) => (
              <li key={i} className="relative">
                <span className={`absolute top-1 -left-[29px] size-2.5 rounded-full ${i === 0 ? (flag && flag !== "Delayed" ? "bg-bad" : s.status === "Delivered" ? "bg-good" : "bg-ink") : "bg-line"}`} />
                <p className={`text-sm ${i === 0 ? "font-medium" : ""}`}>{e.text}</p>
                <p className="text-xs text-muted">{e.location} · {fmtDate(e.date)}, {e.time}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-3 text-xs text-muted">Tracking refreshes every 2 hours from the {s.provider} API. Last scan {scanAge === 0 ? "today" : `${scanAge} day${scanAge > 1 ? "s" : ""} ago`}.</p>
        </Card>

        <div className="space-y-6">
          <Card title="Shipment">
            <KeyValues
              rows={[
                ["Order", <Link key="o" href={`/orders/${s.orderId}`} className="hover:underline">{s.orderRef}</Link>],
                ["Customer", o ? o.customer : "Not found"],
                ["Channel", s.channel],
                ["Destination", s.destination],
                ["Market", s.market],
                ["Courier", s.provider],
                ["AWB", s.awb],
                ["Shipped", fmtDate(s.shippedOn)],
                ["Expected by", fmtDate(s.expectedBy)],
                ["Delivered", s.deliveredOn ? `${fmtDate(s.deliveredOn)} (${daysBetween(s.shippedOn, s.deliveredOn)} days)` : "Not yet"],
              ]}
            />
          </Card>
          <Card title="Shopify sync">
            {s.shopifySync === "Not applicable" ? (
              <p className="text-sm text-muted">{s.channel} order, so there is nothing to update in Shopify.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <StatusBadge status={s.shopifySync} />
                {s.shopifySync === "Failed" ? (
                  <>
                    <p className="text-bad">{message ?? "The AWB could not be added to the Shopify order."}</p>
                    <Button>Retry sync</Button>
                  </>
                ) : s.shopifySync === "Pending" ? (
                  <p className="text-muted">Queued. The AWB goes to Shopify within a few minutes.</p>
                ) : (
                  <p className="text-muted">AWB added to the Shopify fulfilment, customer notified.</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
