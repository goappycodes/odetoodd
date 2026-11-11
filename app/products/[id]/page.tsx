import Link from "next/link";
import { Card, KeyValues, PageHeader, SimpleTable, StatusBadge, Badge, Button } from "@/components/ui";
import { products, getProduct, getBom, getMaterial, getSupplier, inr, num, fmtDate, sizeStock, orders, productionOrders, stageName, materialStatus } from "@/lib/data";

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
  const sold = orders.flatMap((o) => o.items.filter((i) => i.productId === id).map((i) => ({ o, i })));
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={p.name} className="aspect-[3/4] w-full rounded-xl border border-line bg-sand object-cover" />
          <Card title="Details">
            <KeyValues rows={[["Price", inr(p.price)], ["Material cost", `${inr(cost)} (${num((cost / p.price) * 100, 0)}% of price)`], ["Lead time", `${p.leadTimeDays} days`], ["Made to order", p.madeToOrder ? "Yes" : "No"], ["Sizes", p.sizes.join(", ")], ["Min. finished stock", p.minStock || "None"], ["Status", <StatusBadge key="s" status={p.status} />]]} />
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Finished stock by size">
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
        </div>
      </div>
    </>
  );
}
