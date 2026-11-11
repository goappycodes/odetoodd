import Link from "next/link";
import { AlertTriangle, CircleCheck } from "lucide-react";
import { AddonBanner, Card, PageHeader, SimpleTable, Stat, Badge, Button } from "@/components/ui";
import { productionOrders, poRequirements, materials, getSupplier, num, inr, addDays, TODAY, fmtDate } from "@/lib/data";

export const metadata = { title: "Material planning" };

export default function MaterialPlanning() {
  // everything not yet cut or embroidered still needs its material
  const upcoming = productionOrders.filter((p) => p.status !== "Completed" && (p.currentStage === "cutting" || p.currentStage === "embroidery"));
  const need = new Map<string, { required: number; pos: Set<string> }>();
  for (const p of upcoming)
    for (const r of poRequirements(p)) {
      const e = need.get(r.material.id) ?? { required: 0, pos: new Set<string>() };
      e.required += r.required;
      e.pos.add(p.id);
      need.set(r.material.id, e);
    }
  const rows = materials
    .map((m) => {
      const n = need.get(m.id) ?? { required: 0, pos: new Set<string>() };
      const reserved = Math.min(m.stock, n.required);
      const free = m.stock - reserved;
      const short = Math.max(0, n.required - m.stock);
      const reorder = short > 0 || free < m.minLevel ? Math.ceil(short + Math.max(0, m.minLevel - free)) : 0;
      return { m, required: n.required, pos: n.pos.size, reserved, free, short, reorder };
    })
    .filter((r) => r.required > 0)
    .sort((a, b) => b.short - a.short || b.reorder - a.reorder);
  const shortRows = rows.filter((r) => r.short > 0);
  const reorderValue = rows.reduce((a, r) => a + r.reorder * r.m.cost, 0);

  return (
    <>
      <PageHeader title="Material planning" subtitle="Combined material needs across all upcoming production, with stock reserved for confirmed orders." actions={<Button>Create purchase list</Button>} />
      <AddonBanner title="Material planning" price="₹15,000">The base system already checks material for each production order. This add-on adds the combined view across every order, reservations and a reorder list.</AddonBanner>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Production orders planned" value={upcoming.length} hint="Not yet past embroidery" />
        <Stat label="Materials needed" value={rows.length} />
        <Stat label="Short for planned work" value={shortRows.length} tone={shortRows.length ? "bad" : "good"} />
        <Stat label="Suggested reorder value" value={inr(reorderValue)} />
      </div>
      <Card title="Requirement against stock" pad={false}>
        <SimpleTable
          head={["Material", "Needed", "For POs", "In stock", "Reserved", "Free after reserving", "Short", "Reorder", "Supplier", "Arrives by"]}
          align={["left", "right", "right", "right", "right", "right", "right", "right", "left", "left"]}
          rows={rows.map((r) => {
            const sup = getSupplier(r.m.supplierId)!;
            return [
              <Link key="m" href={`/inventory/materials/${r.m.id}`} className="hover:underline">{r.m.name}</Link>,
              `${num(r.required, 1)} ${r.m.unit}`,
              r.pos,
              num(r.m.stock, 1),
              num(r.reserved, 1),
              <span key="f" className={r.free < r.m.minLevel ? "text-warn" : ""}>{num(r.free, 1)}</span>,
              r.short > 0 ? <span key="s" className="inline-flex items-center gap-1 text-bad"><AlertTriangle className="size-3.5" />{num(r.short, 1)}</span> : <CircleCheck key="s" className="ml-auto size-4 text-good" />,
              r.reorder ? <Badge key="r" tone="warn">{num(r.reorder)} {r.m.unit}</Badge> : "—",
              <span key="sup" className="text-muted">{sup.name}</span>,
              r.reorder ? fmtDate(addDays(TODAY, sup.leadTimeDays)) : "—",
            ];
          })}
        />
      </Card>
    </>
  );
}
