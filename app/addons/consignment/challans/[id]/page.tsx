import Link from "next/link";
import { Button, PageHeader, StatusBadge } from "@/components/ui";
import { challans, getChallan, getStore, getProduct, shipmentForOrder, inr, fmtDate } from "@/lib/data";
import PrintButton from "./PrintButton";

export const dynamicParams = false;
export function generateStaticParams() {
  return challans.map((c) => ({ id: c.id }));
}

export default async function ChallanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getChallan(id)!;
  const store = getStore(c.storeId)!;
  const sh = shipmentForOrder(c.orderId);
  const provider = sh?.provider ?? c.transport.provider;
  const awb = sh?.awb ?? c.transport.awb;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          back={{ href: "/addons/consignment/challans", label: "Challans" }}
          title={c.id}
          subtitle={<span className="inline-flex flex-wrap items-center gap-2">To {store.name}, {store.city} · {fmtDate(c.date)} <StatusBadge status={c.status} /></span>}
          actions={
            <>
              <Button variant="secondary" href={`/orders/${c.orderId}`}>Open {c.orderId}</Button>
              <PrintButton />
            </>
          }
        />
      </div>

      <article className="mx-auto max-w-4xl rounded-xl border border-line bg-card p-6 text-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink/80 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full border border-ink/70 font-serif text-xl leading-none">O</span>
            <div>
              <p className="font-serif text-2xl leading-tight">Ode To Odd</p>
              <p className="text-xs text-muted">Studio, Jaipur, Rajasthan · GSTIN 08XXXXX0000X1ZX</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl leading-tight">Delivery challan</p>
            <p className="text-xs text-muted">Not a tax invoice</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-line py-5 sm:grid-cols-3">
          <div>
            <p className="text-xs tracking-[0.12em] text-muted uppercase">Challan no.</p>
            <p className="mt-1 font-medium tabular">{c.id}</p>
            <p className="mt-3 text-xs tracking-[0.12em] text-muted uppercase">Date</p>
            <p className="mt-1">{fmtDate(c.date)}</p>
            <p className="mt-3 text-xs tracking-[0.12em] text-muted uppercase">Order ref.</p>
            <p className="mt-1 tabular">{c.orderId}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.12em] text-muted uppercase">Consignor</p>
            <p className="mt-1 font-medium">Ode To Odd</p>
            <p className="text-muted">Studio, Jaipur, Rajasthan</p>
            <p className="text-muted">GSTIN 08XXXXX0000X1ZX</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.12em] text-muted uppercase">Consignee</p>
            <p className="mt-1 font-medium">{store.name}</p>
            <p className="text-muted">{store.city}</p>
            <p className="text-muted">Terms: {store.terms}</p>
          </div>
        </section>

        <p className="border-b border-line py-3 text-sm"><span className="text-muted">Purpose:</span> {c.purpose}</p>

        <div className="scroll-x py-4">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-ink/60 text-left text-xs text-muted">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">SKU</th>
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Size</th>
                <th className="py-2 pr-3 text-right font-medium">Qty</th>
                <th className="py-2 pr-3 text-right font-medium">MRP</th>
                <th className="py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {c.lines.map((l, i) => {
                const p = getProduct(l.productId)!;
                return (
                  <tr key={i} className="border-b border-line/70">
                    <td className="py-2 pr-3 text-muted">{i + 1}</td>
                    <td className="py-2 pr-3">{p.sku}</td>
                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3">{l.size}</td>
                    <td className="py-2 pr-3 text-right">{l.qty}</td>
                    <td className="py-2 pr-3 text-right">{inr(l.mrp)}</td>
                    <td className="py-2 text-right">{inr(l.qty * l.mrp)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="tabular">
              <tr className="border-t border-ink/60 font-medium">
                <td colSpan={4} className="py-2 pr-3">Total</td>
                <td className="py-2 pr-3 text-right">{c.totalQty}</td>
                <td className="py-2 pr-3" />
                <td className="py-2 text-right">{inr(c.value)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="grid gap-6 border-t border-line py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs tracking-[0.12em] text-muted uppercase">Transport</p>
            {c.transport.mode === "Hand delivery" ? (
              <p className="mt-1">Hand delivery by studio staff</p>
            ) : (
              <p className="mt-1">
                Courier: {provider}
                <br />
                AWB: {awb ? (sh ? <Link href={`/addons/shipments/${sh.id}`} className="tabular hover:underline print:no-underline">{awb}</Link> : awb) : "to be added at dispatch"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs tracking-[0.12em] text-muted uppercase">Received</p>
            <p className="mt-1">{c.receivedOn ? `${fmtDate(c.receivedOn)} by ${store.name}` : "Not yet received"}</p>
          </div>
        </section>

        <section className="grid gap-6 pt-8 sm:grid-cols-2">
          {[["Prepared by", c.preparedBy], ["Received by", "Name, signature and store stamp"]].map(([label, hint]) => (
            <div key={label}>
              <div className="h-16 border-b border-ink/60" />
              <p className="mt-2 font-medium">{label}</p>
              <p className="text-xs text-muted">{hint}</p>
            </div>
          ))}
        </section>

        <p className="mt-8 text-xs text-muted">
          Goods are sent on consignment and remain the property of Ode To Odd until sold. Unsold pieces are returned against this challan number.
        </p>
      </article>
    </>
  );
}
