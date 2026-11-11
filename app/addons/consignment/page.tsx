import Link from "next/link";
import { Upload } from "lucide-react";
import { AddonBanner, Card, PageHeader, SimpleTable, Stat, StatusBadge, Button, Progress } from "@/components/ui";
import { stores, consignmentStock, consignmentReports, getProduct, inr, inrShort, fmtDate } from "@/lib/data";

export const metadata = { title: "Consignment" };

export default function Consignment() {
  const rows = stores.map((s) => {
    const items = consignmentStock.filter((c) => c.storeId === s.id);
    const sum = (k: "sent" | "sold" | "returned" | "remaining") => items.reduce((a, c) => a + c[k], 0);
    const value = items.reduce((a, c) => a + c.remaining * (getProduct(c.productId)?.price ?? 0), 0);
    const latest = consignmentReports.filter((r) => r.storeId === s.id).sort((a, b) => (a.weekEnding < b.weekEnding ? 1 : -1))[0];
    return { s, sent: sum("sent"), sold: sum("sold"), returned: sum("returned"), remaining: sum("remaining"), value, latest };
  });
  const tot = (k: "sent" | "sold" | "remaining" | "value") => rows.reduce((a, r) => a + r[k], 0);
  const review = consignmentReports.filter((r) => r.status === "Needs review");

  return (
    <>
      <PageHeader title="Consignment" subtitle="Stock at partner stores: pieces sent, sold, returned and remaining, reconciled against weekly sales reports." actions={<Button href="/addons/consignment/reconcile"><Upload className="size-4" />Upload weekly report</Button>} />
      <AddonBanner title="Consignment management" price="₹50,000">Store-wise stock, weekly sales uploads, automatic reconciliation with discrepancy flags, and bestsellers by store.</AddonBanner>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Stores" value={stores.length} />
        <Stat label="Pieces at stores" value={tot("remaining")} hint={`${inrShort(tot("value"))} at retail`} />
        <Stat label="Sell-through" value={`${Math.round((tot("sold") / tot("sent")) * 100)}%`} hint={`${tot("sold")} of ${tot("sent")} pieces sent`} />
        <Stat label="Reports needing review" value={review.length} tone={review.length ? "warn" : "good"} href="/addons/consignment/reconcile" />
      </div>
      <Card title="Stores" pad={false}>
        <SimpleTable
          head={["Store", "City", "Sent", "Sold", "Returned", "Remaining", "Sell-through", "Stock value", "Latest report"]}
          align={["left", "left", "right", "right", "right", "right", "left", "right", "left"]}
          rows={rows.map((r) => [
            <Link key="s" href={`/addons/consignment/${r.s.id}`} className="font-medium hover:underline">{r.s.name}</Link>,
            r.s.city, r.sent, r.sold, r.returned, r.remaining,
            <span key="p" className="flex w-28 items-center gap-2"><Progress value={r.sold} max={r.sent} tone="good" /><span className="text-xs text-muted">{Math.round((r.sold / r.sent) * 100)}%</span></span>,
            inr(r.value),
            <span key="l" className="inline-flex items-center gap-2 whitespace-nowrap">{fmtDate(r.latest.weekEnding)} <StatusBadge status={r.latest.status} /></span>,
          ])}
        />
      </Card>
    </>
  );
}
