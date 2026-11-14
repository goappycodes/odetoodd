import { ArrowLeftRight, CircleCheck } from "lucide-react";
import { AddonBanner, Card, PageHeader, SimpleTable, Badge, ProductThumb } from "@/components/ui";
import { products, finishedUnits, productionOrders, TODAY } from "@/lib/data";

export const metadata = { title: "Two-way Shopify sync" };

const rules: [string, string][] = [
  ["Ready-to-ship styles (free size, in stock)", "Shopify quantity = finished stock in the ERP"],
  ["Made-to-order styles", "Kept available in Shopify, with the made-to-order lead time shown"],
  ["Order cancelled in Shopify", "Releases reserved stock and cancels production orders that haven't started"],
  ["Return received", "Adds the piece back to finished stock after QC"],
  ["Out of stock and no production planned", "Sets the variant to sold out in Shopify"],
];

export default function ShopifySyncAddon() {
  const sample = products.filter((p) => p.sizes.length === 1).slice(0, 10);
  return (
    <>
      <PageHeader title="Two-way Shopify sync" subtitle="Stock levels update in Shopify automatically, and cancellations and returns flow back into the ERP." />
      <AddonBanner title="Two-way Shopify sync" price="₹15,000">In the base system, orders come into the ERP and your team updates stock in Shopify. This add-on keeps Shopify in step automatically.</AddonBanner>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Sync rules">
          <ul className="space-y-3 text-sm">
            {rules.map(([when, then]) => (
              <li key={when} className="flex gap-3">
                <ArrowLeftRight className="mt-0.5 size-4 shrink-0 text-muted" />
                <span><span className="font-medium">{when}</span><span className="block text-muted">{then}</span></span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent activity">
          <ul className="space-y-2.5 text-sm">
            {[
              ["10:14", "Stock pushed for Sampler Shirt: 3 → 2 after order #OTO4371"],
              ["09:52", "Return received for #OTO4302, Old Charm Shirt added back to stock"],
              ["09:31", "Cancellation of #OTO4355, production order released"],
              ["08:00", "Nightly check: 48 products, 0 differences between ERP and Shopify"],
            ].map(([t, m]) => (
              <li key={t} className="flex gap-3"><span className="w-12 shrink-0 text-muted tabular">{t}</span><span className="flex-1">{m}</span><CircleCheck className="size-4 shrink-0 text-good" /></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Sample entries for {TODAY}.</p>
        </Card>
      </div>
      <Card title="Stock in ERP and Shopify" pad={false}>
        <SimpleTable
          head={["Product", "SKU", "ERP stock", "Shopify stock", "In production", "Status"]}
          align={["left", "left", "right", "right", "right", "left"]}
          rows={sample.map((p) => {
            const erp = finishedUnits(p);
            return [
              <span key="p" className="inline-flex items-center gap-2"><ProductThumb src={p.image} alt={p.name} size={22} />{p.name}</span>,
              p.sku, erp, erp,
              productionOrders.filter((x) => x.productId === p.id && x.status !== "Completed").reduce((a, x) => a + x.qty, 0),
              <Badge key="s" tone="good">In sync</Badge>,
            ];
          })}
        />
      </Card>
    </>
  );
}
