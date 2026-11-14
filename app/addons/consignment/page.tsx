import Link from "next/link";
import { FileText, Send, Upload } from "lucide-react";
import { AddonBanner, Badge, Card, PageHeader, SimpleTable, Stat, StatusBadge, Button, Progress, ProductThumb } from "@/components/ui";
import { stores, consignmentStock, consignmentReports, challans, getProduct, getStore, inr, inrShort, fmtDate } from "@/lib/data";

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

  // what's moving: every product across all stores
  const byProduct = new Map<string, { sent: number; sold: number; remaining: number; stores: number }>();
  for (const c of consignmentStock) {
    const r = byProduct.get(c.productId) ?? { sent: 0, sold: 0, remaining: 0, stores: 0 };
    r.sent += c.sent;
    r.sold += c.sold;
    r.remaining += c.remaining;
    r.stores += 1;
    byProduct.set(c.productId, r);
  }
  const moving = [...byProduct.entries()]
    .map(([id, r]) => ({ p: getProduct(id)!, ...r }))
    .sort((a, b) => b.sold - a.sold || b.sold / b.sent - a.sold / a.sent)
    .slice(0, 12);
  const recent = challans.slice(0, 5);

  return (
    <>
      <PageHeader
        title="Consignment"
        subtitle="Stock at partner stores: what was sent, what sold and what is still on the rail, reconciled against weekly sales reports."
        actions={
          <>
            <Button variant="secondary" href="/addons/consignment/reconcile"><Upload className="size-4" />Upload weekly report</Button>
            <Button href="/addons/consignment/challans/new"><Send className="size-4" />Send stock to a store</Button>
          </>
        }
      />
      <AddonBanner title="Consignment management" price="₹20,000">
        Store-wise stock, a delivery challan for every movement to a store, weekly sales uploads, reconciliation with discrepancy flags, and bestsellers by store.
      </AddonBanner>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Stores" value={stores.length} />
        <Stat label="Pieces at stores" value={tot("remaining")} hint={`${inrShort(tot("value"))} at retail`} />
        <Stat label="Sell-through" value={`${Math.round((tot("sold") / tot("sent")) * 100)}%`} hint={`${tot("sold")} of ${tot("sent")} pieces sent`} />
        <Stat label="Reports needing review" value={review.length} tone={review.length ? "warn" : "good"} href="/addons/consignment/reconcile" />
      </div>

      <Card title="Stores" pad={false} className="mb-6">
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

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card title="What's moving, across all stores" pad={false}>
          <SimpleTable
            head={["Product", "Stores", "Sent", "Sold", "At stores", "Sell-through", ""]}
            align={["left", "right", "right", "right", "right", "left", "left"]}
            rows={moving.map((m) => [
              <Link key="p" href={`/products/${m.p.id}`} className="inline-flex items-center gap-2 hover:underline">
                <ProductThumb src={m.p.image} alt={m.p.name} size={22} />
                <span>{m.p.name}<span className="block text-xs text-muted">{m.p.sku}</span></span>
              </Link>,
              m.stores, m.sent, m.sold, m.remaining,
              <span key="st" className="flex w-24 items-center gap-2"><Progress value={m.sold} max={m.sent} tone="good" /><span className="text-xs text-muted">{Math.round((m.sold / m.sent) * 100)}%</span></span>,
              m.sold / m.sent >= 0.6 ? <Badge key="b" tone="good">Bestseller</Badge> : m.sold === 0 ? <Badge key="b" tone="warn">Slow</Badge> : "",
            ])}
          />
        </Card>

        <Card title="Recent challans" pad={false} action={<Link href="/addons/consignment/challans" className="text-xs text-muted hover:text-ink">All challans →</Link>}>
          <ul className="divide-y divide-line/70">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/addons/consignment/challans/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-sand/60">
                  <FileText className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.id} · {getStore(c.storeId)?.name}</p>
                    <p className="truncate text-xs text-muted tabular">{fmtDate(c.date)} · {c.totalQty} pcs · {inr(c.value)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
