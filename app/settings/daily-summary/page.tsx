import { Card, PageHeader, KeyValues } from "@/components/ui";
import {
  TODAY, addDays, fmtDate, inr, salesInRange, openOrders, orderUrgency, lowStockMaterials, outputBetween, stages,
  productionOrders, poUrgency, orders, num, syncLog, prOverdue, flaggedShipments, products, belowCategoryMin,
} from "@/lib/data";

export const metadata = { title: "Daily summary email" };

export default function DailySummary() {
  const y = addDays(TODAY, -1);
  const sales = salesInRange(1, 1);
  const newOrders = orders.filter((o) => o.date === y);
  const dispatched = orders.filter((o) => o.dispatchedOn === y);
  const out = outputBetween(y, y);
  const open = openOrders();
  const overdue = open.filter((o) => orderUrgency(o) === "overdue");
  const dueSoon = open.filter((o) => orderUrgency(o) === "due-soon");
  const low = lowStockMaterials();
  const late = productionOrders.filter((p) => p.status !== "Completed" && poUrgency(p) === "overdue");
  const failed = syncLog.filter((s) => s.status === "Failed");
  const prLate = prOverdue();
  const shipFlags = flaggedShipments();
  const fgLow = products.filter(belowCategoryMin);

  return (
    <>
      <PageHeader title="Daily summary email" subtitle="Sent to the owner every morning at 8:00 with yesterday's activity and what needs attention today." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="mx-auto w-full max-w-2xl rounded-xl border border-line bg-white shadow-sm">
          <div className="border-b border-line px-6 py-4 text-sm">
            <p><span className="text-muted">From:</span> Ode To Odd ERP &lt;erp@odetoodd.com&gt;</p>
            <p><span className="text-muted">Subject:</span> Daily summary for {fmtDate(y)}</p>
          </div>
          <div className="space-y-6 px-6 py-6 text-[15px] leading-relaxed">
            <p className="font-serif text-3xl">Good morning.</p>
            <p>Here is what happened yesterday, {fmtDate(y)}, and what needs your attention today.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Sales", inr(sales.Shopify + sales.Wholesale + sales.Events + sales.Offline)],
                ["New orders", newOrders.length],
                ["Dispatched", dispatched.length],
                ["Pieces made", out.reduce((a, o) => a + o.completed, 0)],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded-lg bg-paper p-3">
                  <p className="text-xs text-muted">{l}</p>
                  <p className="text-xl tabular">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1 font-medium">Needs attention</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><span className="text-bad">{overdue.length} overdue orders</span>: {overdue.slice(0, 3).map((o) => o.ref).join(", ")}{overdue.length > 3 ? " and more" : ""}</li>
                <li><span className="text-warn">{dueSoon.length} orders due this week</span></li>
                <li>{late.length} production orders behind schedule</li>
                <li>{low.length} materials below minimum: {low.slice(0, 3).map((m) => m.name).join(", ")}</li>
                <li>{fgLow.length} styles below their category's minimum ready stock</li>
                {failed.length > 0 && <li>{failed.length} Shopify syncs failed</li>}
                {shipFlags.length > 0 && <li><span className="text-bad">{shipFlags.length} shipments delayed or not moving</span>: {shipFlags.slice(0, 3).map((s) => `${s.orderRef} (${s.provider})`).join(", ")}</li>}
                {prLate.length > 0 && <li><span className="text-bad">{prLate.length} PR pieces not returned on time</span></li>}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium">Production yesterday</p>
              <table className="w-full text-sm">
                <tbody className="tabular">
                  {stages.map((s) => (
                    <tr key={s.id} className="border-b border-line/70">
                      <td className="py-1.5">{s.name}</td>
                      <td className="py-1.5 text-right">{num(out.filter((o) => o.stage === s.id).reduce((a, o) => a + o.completed, 0))} pcs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted">Open the dashboard for the full picture.</p>
          </div>
        </div>
        <Card title="Settings">
          <KeyValues rows={[["Send to", "owner@odetoodd.com"], ["Time", "8:00 every morning"], ["Days", "Monday to Saturday"], ["Includes", "Sales, orders, production, stock alerts, sync issues, shipments, PR returns"]]} />
        </Card>
      </div>
    </>
  );
}
