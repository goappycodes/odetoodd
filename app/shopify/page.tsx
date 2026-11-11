import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Card, PageHeader, Stat, StatusBadge, SimpleTable, Button } from "@/components/ui";
import { syncLog, orders } from "@/lib/data";

export const metadata = { title: "Shopify sync" };

export default function ShopifyPage() {
  const failed = syncLog.filter((s) => s.status === "Failed");
  const retried = syncLog.filter((s) => s.status === "Retried");
  const shopOrders = orders.filter((o) => o.channel === "Shopify");
  return (
    <>
      <PageHeader
        title="Shopify sync"
        subtitle="New Shopify orders are pulled into the ERP within a minute, with all order details. Failed syncs are flagged here and on the dashboard."
        actions={<Button variant="secondary"><RefreshCw className="size-4" />Sync now</Button>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Connection" value={<span className="text-2xl">odetoodd.myshopify.com</span>} hint="Connected · orders read access" tone="good" />
        <Stat label="Orders imported, 90 days" value={shopOrders.length} />
        <Stat label="Need attention" value={failed.length} tone={failed.length ? "bad" : "good"} hint="Failed and not yet fixed" />
        <Stat label="Recovered automatically" value={retried.length} hint="Retried after a timeout" />
      </div>
      {failed.length > 0 && (
        <Card title="Needs attention" className="mb-6" pad={false}>
          <ul className="divide-y divide-line/70">
            {failed.map((s) => (
              <li key={s.time} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <StatusBadge status={s.status} />
                <span className="font-medium">{s.ref}</span>
                <span className="min-w-0 flex-1 text-muted">{s.message}</span>
                <button className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-sand">Retry</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card title="Sync log" pad={false}>
        <SimpleTable
          head={["Time", "Event", "Shopify order", "Status", "Detail"]}
          rows={syncLog.map((s) => {
            const o = orders.find((x) => x.ref === s.ref);
            return [
              s.time.replace("T", " "),
              s.event,
              o ? <Link href={`/orders/${o.id}`} className="hover:underline">{s.ref}</Link> : s.ref,
              <StatusBadge key="s" status={s.status} />,
              <span key="m" className="text-muted">{s.message}</span>,
            ];
          })}
        />
      </Card>
      <p className="mt-4 text-sm text-muted">
        Stock levels flow one way in the base system: Shopify orders come in, and the team updates stock in Shopify. Automatic stock updates back to Shopify are part of the{" "}
        <Link href="/addons/shopify-sync" className="text-ink underline">two-way sync add-on</Link>.
      </p>
    </>
  );
}
