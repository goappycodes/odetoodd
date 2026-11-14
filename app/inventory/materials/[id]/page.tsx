import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import { Card, KeyValues, PageHeader, SimpleTable, StatusBadge, Stat, Button, Badge } from "@/components/ui";
import { materials, getMaterial, getSupplier, movements, boms, getProduct, materialStatus, num, inr, fmtDate, productionOrders, poRequirements } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return materials.map((m) => ({ id: m.id }));
}

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = getMaterial(id)!;
  const sup = getSupplier(m.supplierId)!;
  const moves = movements.filter((x) => x.itemType === "Material" && x.itemId === id);
  const usedIn = boms.filter((b) => b.lines.some((l) => l.materialId === id));
  const needed = productionOrders
    .filter((p) => p.status !== "Completed" && (p.currentStage === "cutting" || p.currentStage === "embroidery"))
    .reduce((a, p) => a + (poRequirements(p).find((r) => r.material.id === id)?.required ?? 0), 0);
  const st = materialStatus(m);

  return (
    <>
      <PageHeader back={{ href: "/inventory/materials", label: "Raw materials" }} title={m.name} subtitle={<span className="inline-flex items-center gap-2">{m.id} · {m.category} <StatusBadge status={st} /></span>} actions={<><Button variant="secondary" href="/inventory/entry">Issue or return</Button><Button href="/inventory/entry">Receive stock</Button></>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="In stock" value={`${num(m.stock, 1)} ${m.unit}`} tone={st === "OK" ? "default" : st === "Low" ? "warn" : "bad"} />
        <Stat label="Minimum level" value={`${num(m.minLevel)} ${m.unit}`} />
        <Stat label="Needed for upcoming production" value={`${num(needed, 1)} ${m.unit}`} hint="Orders not yet past embroidery" tone={needed > m.stock ? "bad" : "default"} />
        <Stat label="Stock value" value={inr(m.stock * m.cost)} hint={`${inr(m.cost)} per ${m.unit}`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Movement history" className="xl:col-span-2" pad={false}>
          <SimpleTable
            head={["Date", "Type", "Qty", "Reference", "By"]}
            align={["left", "left", "right", "left", "left"]}
            rows={moves.map((x) => [
              fmtDate(x.date),
              <Badge key="t" tone={x.qty > 0 ? "good" : "neutral"}>{x.type}</Badge>,
              <span key="q" className={x.qty > 0 ? "text-good" : ""}>{x.qty > 0 ? "+" : ""}{num(x.qty, 1)} {x.unit}</span>,
              x.ref.startsWith("PO-") ? <Link key="r" href={`/production/${x.ref}`} className="hover:underline">{x.ref}</Link> : x.ref,
              <span key="b" className="text-muted">{x.by}</span>,
            ])}
          />
          {moves.length === 0 && <p className="p-4 text-sm text-muted">No movements in the last 30 days.</p>}
        </Card>
        <div className="space-y-6">
          <Card title="Photo">
            <ImageUpload alt={m.name} aspect="4/3" />
          </Card>
          <Card title="Supplier">
            <KeyValues rows={[["Name", sup.name], ["City", sup.city], ["Contact", sup.contact], ["Phone", sup.phone], ["Lead time", `${sup.leadTimeDays} days`]]} />
          </Card>
          <Card title={`Used in ${usedIn.length} BOMs`} pad={false}>
            <ul className="max-h-80 divide-y divide-line/70 overflow-y-auto text-sm">
              {usedIn.map((b) => {
                const p = getProduct(b.productId)!;
                const l = b.lines.find((x) => x.materialId === id)!;
                return <li key={b.productId}><Link href={`/products/${p.id}`} className="flex justify-between gap-3 px-4 py-2 hover:bg-sand/50"><span className="truncate">{p.name}</span><span className="text-xs text-muted tabular">{num(l.qty, 2)} {m.unit}</span></Link></li>;
              })}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
