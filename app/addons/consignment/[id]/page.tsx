import Link from "next/link";
import { AddonBanner, Card, KeyValues, PageHeader, SimpleTable, Stat, StatusBadge, ProductThumb, Badge } from "@/components/ui";
import { HBars } from "@/components/charts";
import { stores, getStore, consignmentStock, consignmentReports, getProduct, inr, fmtDate, num } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return stores.map((s) => ({ id: s.id }));
}

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getStore(id)!;
  const items = consignmentStock.filter((c) => c.storeId === id).map((c) => ({ c, p: getProduct(c.productId)! }));
  const reports = consignmentReports.filter((r) => r.storeId === id);
  const sent = items.reduce((a, x) => a + x.c.sent, 0);
  const sold = items.reduce((a, x) => a + x.c.sold, 0);
  const rem = items.reduce((a, x) => a + x.c.remaining, 0);
  const slow = items.filter((x) => x.c.sold === 0 && x.c.remaining > 0);

  return (
    <>
      <PageHeader back={{ href: "/addons/consignment", label: "Consignment" }} title={s.name} subtitle={`${s.city} · ${s.terms}`} />
      <AddonBanner title="Consignment management" price="₹50,000">Part of the consignment add-on.</AddonBanner>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pieces sent" value={sent} />
        <Stat label="Sold" value={sold} hint={`${Math.round((sold / sent) * 100)}% sell-through`} />
        <Stat label="Remaining at store" value={rem} />
        <Stat label="Not sold yet" value={slow.length} hint="Styles with no sale" tone={slow.length ? "warn" : "good"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title="Stock at this store" pad={false}>
          <SimpleTable
            head={["Product", "Sent", "Sold", "Returned", "Remaining", "Last sent", ""]}
            align={["left", "right", "right", "right", "right", "left", "left"]}
            rows={items.map(({ c, p }) => [
              <Link key="p" href={`/products/${p.id}`} className="inline-flex items-center gap-2 hover:underline"><ProductThumb src={p.image} alt={p.name} size={22} />{p.name}</Link>,
              c.sent, c.sold, c.returned, c.remaining, fmtDate(c.lastSentOn),
              c.sold === 0 && c.remaining > 0 ? <Badge key="b" tone="warn">Slow</Badge> : c.sold / c.sent >= 0.6 ? <Badge key="b" tone="good">Bestseller</Badge> : "",
            ])}
          />
        </Card>
        <div className="space-y-6">
          <Card title="Best sellers here">
            <HBars rows={[...items].sort((a, b) => b.c.sold - a.c.sold).slice(0, 5).map((x) => ({ label: x.p.name, value: x.c.sold }))} format="sold" />
          </Card>
          <Card title="Store details">
            <KeyValues rows={[["Terms", s.terms], ["Partner since", fmtDate(s.since)], ["Stock value", inr(items.reduce((a, x) => a + x.c.remaining * x.p.price, 0))]]} />
          </Card>
        </div>
      </div>
      <Card title="Weekly sales reports" className="mt-6" pad={false}>
        <SimpleTable
          head={["Week ending", "File", "Uploaded", "Units sold", "Value", "Status", "Issues"]}
          align={["left", "left", "left", "right", "right", "left", "left"]}
          rows={reports.map((r) => [
            fmtDate(r.weekEnding), <span key="f" className="text-muted">{r.file}</span>, fmtDate(r.uploadedOn), r.unitsSold, inr(r.value), <StatusBadge key="s" status={r.status} />,
            r.discrepancies.length ? <span key="d" className="text-sm text-warn">{r.discrepancies.map((d) => d.issue).join("; ")}</span> : <span key="d" className="text-muted">{num(0)}</span>,
          ])}
        />
      </Card>
    </>
  );
}
