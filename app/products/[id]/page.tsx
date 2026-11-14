import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import { Card, KeyValues, PageHeader, SimpleTable, StatusBadge, Badge, Button } from "@/components/ui";
import {
  products, getProduct, getBom, getMaterial, getSupplier, inr, num, fmtDate, sizeStock, sampleStock, orders, productionOrders, stageName,
  materialStatus, fgCategoryMin, prLoans, prStatus, USD_RATE,
} from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = getProduct(id)!;
  const bom = getBom(id)!;
  const lines = bom.lines.map((l) => ({ l, m: getMaterial(l.materialId)! }));
  const cost = lines.reduce((a, { l, m }) => a + l.qty * m.cost, 0);
  const stock = sizeStock(p);
  const sold = orders.filter((o) => o.channel !== "Consignment").flatMap((o) => o.items.filter((i) => i.productId === id).map((i) => ({ o, i })));
  const samples = sampleStock(p);
  const loans = prLoans.filter((l) => l.productId === id);
  const outFromSample = (size: string) => loans.filter((l) => !l.returnedOn && l.stockType === "Sample" && l.size === size).reduce((a, l) => a + l.qty, 0);
  const catMin = fgCategoryMin(p.type);
  const pos = productionOrders.filter((x) => x.productId === id && x.status !== "Completed");

  return (
    <>
      <PageHeader
        back={{ href: "/products", label: "Products" }}
        title={p.name}
        subtitle={`${p.sku} · ${p.type} · ${p.fabric}, ${p.colour} · ${p.collection}`}
        actions={<><Button variant="secondary" href="/settings/imports">Replace BOM from Excel</Button><Button variant="secondary">Edit product</Button></>}
      />
      <div className="grid gap-6 md:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr]">
        <div className="space-y-6">
          <ImageUpload src={p.image} alt={p.name} />
          <Card title="Details">
            <KeyValues
              rows={[
                ["Domestic price", inr(p.price)],
                ["International price", <span key="i">US${p.priceIntl.toLocaleString("en-US")} <span className="text-xs text-muted">≈ {inr(p.priceIntl * USD_RATE)}</span></span>],
                ["Material cost", `${inr(cost)} (${num((cost / p.price) * 100, 0)}% of domestic price)`],
                ["Lead time", `${p.leadTimeDays} days`],
                ["Made to order", p.madeToOrder ? "Yes" : "No"],
                ["Sizes", p.sizes.join(", ")],
                ["Low-stock level", <span key="m">{catMin ? `${catMin} ready per style` : "None"} <Link href="/settings/stock-levels" className="text-xs text-muted hover:text-ink hover:underline">({p.type} category)</Link></span>],
                ["Status", <StatusBadge key="s" status={p.status} />],
              ]}
            />
          </Card>
        </div>
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card title="Main stock by size">
            <div className="flex flex-wrap gap-2">
              {Object.entries(stock).map(([size, n]) => (
                <div key={size} className={`min-w-16 rounded-lg border px-3 py-2 text-center ${n > 0 ? "border-good/30 bg-good-soft/60" : "border-line"}`}>
                  <p className="text-xs text-muted">{size}</p>
                  <p className="font-serif text-2xl tabular">{n}</p>
                </div>
              ))}
              {p.sizes.includes("Custom") && <div className="rounded-lg border border-dashed border-line px-3 py-2 text-center text-xs text-muted">Custom<br />made to measure</div>}
            </div>
          </Card>
          <Card title="Sample stock" action={<Link href="/inventory/finished?view=sample" className="text-xs text-muted hover:text-ink">All samples →</Link>}>
            {Object.keys(samples).length === 0 ? (
              <p className="text-sm text-muted">No sample pieces for this style.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(samples).map(([size, n]) => {
                  const out = outFromSample(size);
                  return (
                    <div key={size} className="min-w-16 rounded-lg border border-rose/30 bg-rose-soft/50 px-3 py-2 text-center">
                      <p className="text-xs text-muted">{size}</p>
                      <p className="font-serif text-2xl tabular">{n}</p>
                      {out > 0 && <p className="text-[11px] text-rose">{out} out on PR</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          </div>
          <Card title={`Bill of materials · ${bom.version}`} action={<span className="text-xs text-muted">Updated {fmtDate(bom.updatedOn)}</span>} pad={false}>
            <SimpleTable
              head={["Material", "Qty per piece", "Unit cost", "Cost", "In stock", "Supplier"]}
              align={["left", "right", "right", "right", "left", "left"]}
              rows={lines.map(({ l, m }) => [
                <Link key="m" href={`/inventory/materials/${m.id}`} className="hover:underline">{m.name}</Link>,
                `${num(l.qty, 2)} ${m.unit}`,
                inr(m.cost),
                inr(l.qty * m.cost),
                <span key="s" className="inline-flex items-center gap-2">{num(m.stock, 1)} {m.unit} {materialStatus(m) !== "OK" && <StatusBadge status={materialStatus(m)} />}</span>,
                <span key="sup" className="text-muted">{getSupplier(m.supplierId)?.name}</span>,
              ])}
            />
            <div className="flex justify-between border-t border-line px-4 py-3 text-sm font-medium tabular"><span>Material cost per piece</span><span>{inr(cost)}</span></div>
          </Card>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="In production now" pad={false}>
              <ul className="divide-y divide-line/70 text-sm">
                {pos.map((x) => (
                  <li key={x.id}><Link href={`/production/${x.id}`} className="flex justify-between gap-3 px-4 py-2.5 hover:bg-sand/50"><span>{x.id} · {x.size} × {x.qty}</span><Badge>{stageName(x.currentStage)}</Badge></Link></li>
                ))}
                {pos.length === 0 && <li className="px-4 py-4 text-muted">Nothing in production.</li>}
              </ul>
            </Card>
            <Card title={`Orders, last 90 days · ${sold.reduce((a, s) => a + s.i.qty, 0)} pcs`} pad={false}>
              <ul className="divide-y divide-line/70 text-sm">
                {sold.slice(0, 8).map(({ o, i }, k) => (
                  <li key={k}><Link href={`/orders/${o.id}`} className="flex justify-between gap-3 px-4 py-2.5 hover:bg-sand/50"><span>{o.ref} · {o.customer}</span><span className="text-xs text-muted">{i.size} × {i.qty} · {fmtDate(o.date)}</span></Link></li>
                ))}
                {sold.length === 0 && <li className="px-4 py-4 text-muted">No orders yet.</li>}
              </ul>
            </Card>
          </div>
          <Card title={`PR history · ${loans.length} loan${loans.length === 1 ? "" : "s"}`} action={<Link href="/addons/pr-tracker" className="text-xs text-muted hover:text-ink">PR tracker →</Link>} pad={false}>
            <ul className="divide-y divide-line/70 text-sm">
              {loans.map((l) => (
                <li key={l.id}>
                  <Link href="/addons/pr-tracker" className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 hover:bg-sand/50">
                    <span className="min-w-0">
                      <span className="font-medium">{l.id}</span> · {l.recipient}
                      <span className="block text-xs text-muted">{l.purpose} · {l.size} from {l.stockType.toLowerCase()} stock · given {fmtDate(l.issuedOn)}</span>
                    </span>
                    <StatusBadge status={prStatus(l)} />
                  </Link>
                </li>
              ))}
              {loans.length === 0 && <li className="px-4 py-4 text-muted">Never given out for PR.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
