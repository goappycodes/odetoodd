"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import DataTable, { Column, SearchBox, Select } from "@/components/DataTable";
import { PageHeader, StatusBadge, UrgencyBadge, Badge, Progress, ProductThumb, Button } from "@/components/ui";
import { useQueryParam } from "@/lib/useQuery";
import { productionOrders, getProduct, stages, stageName, poUrgency, fmtDate, assigneeName, type ProductionOrder } from "@/lib/data";

function stageProgress(p: ProductionOrder) {
  if (p.status === "Completed") return stages.length;
  return p.stages.filter((s) => s.assigned > 0 && s.pending === 0).length;
}

export default function ProductionPage() {
  const [view, setView] = useState<"list" | "board">("board");
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("Active");
  const [due, setDue] = useQueryParam("due", "any");

  const rows = useMemo(
    () =>
      productionOrders.filter((p) => {
        if (status === "Active" && p.status === "Completed") return false;
        if (status === "Completed" && p.status !== "Completed") return false;
        if (stage !== "all" && p.currentStage !== stage) return false;
        if (due !== "any" && poUrgency(p) !== due) return false;
        if (q) {
          const prod = getProduct(p.productId)!;
          if (!`${p.id} ${p.orderRef} ${prod.name} ${prod.sku}`.toLowerCase().includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [q, stage, status, due],
  );

  const columns: Column<ProductionOrder>[] = [
    { key: "id", label: "Production order", value: (p) => p.id, render: (p) => <Link href={`/production/${p.id}`} className="font-medium hover:underline">{p.id}</Link> },
    { key: "product", label: "Product", value: (p) => getProduct(p.productId)!.name, render: (p) => {
      const prod = getProduct(p.productId)!;
      return <span className="flex items-center gap-2"><ProductThumb src={prod.image} alt={prod.name} size={26} /><span>{prod.name}<span className="block text-xs text-muted">{prod.sku} · {p.size}</span></span></span>;
    } },
    { key: "qty", label: "Qty", align: "right", value: (p) => p.qty },
    { key: "order", label: "For order", value: (p) => p.orderRef, render: (p) => <Link href={`/orders/${p.orderId}`} className="hover:underline">{p.orderRef}</Link> },
    { key: "stage", label: "Current stage", value: (p) => stageName(p.currentStage), render: (p) => <Badge>{stageName(p.currentStage)}</Badge> },
    { key: "with", label: "With", value: (p) => assigneeName(p.stages.find((s) => s.stage === p.currentStage)?.assignee), render: (p) => <span className="block max-w-48 truncate">{p.status === "Completed" ? "—" : assigneeName(p.stages.find((s) => s.stage === p.currentStage)?.assignee)}</span> },
    { key: "progress", label: "Progress", value: (p) => stageProgress(p), render: (p) => <span className="flex w-28 items-center gap-2"><Progress value={stageProgress(p)} max={stages.length} tone={p.status === "Completed" ? "good" : "ink"} /><span className="text-xs text-muted">{stageProgress(p)}/{stages.length}</span></span> },
    { key: "due", label: "Due", value: (p) => p.dueDate, render: (p) => <span className="flex items-center gap-2 whitespace-nowrap">{fmtDate(p.dueDate)} {poUrgency(p) !== "on-track" && poUrgency(p) !== "done" && <UrgencyBadge u={poUrgency(p)} />}</span> },
    { key: "status", label: "Status", value: (p) => p.status, render: (p) => <StatusBadge status={p.status} /> },
  ];

  const toolbar = (
    <>
      <SearchBox value={q} onChange={setQ} placeholder="Search PO, order, product" />
      <Select label="Stage" value={stage} onChange={setStage} options={[{ value: "all", label: "All stages" }, ...stages.map((s) => ({ value: s.id, label: s.name }))]} />
      <Select label="Status" value={status} onChange={setStatus} options={["Active", "Completed", "All"]} />
      <Select label="Due" value={due} onChange={setDue} options={[{ value: "any", label: "Any due date" }, { value: "overdue", label: "Late" }, { value: "due-soon", label: "Due in 7 days" }]} />
    </>
  );

  return (
    <>
      <PageHeader
        title="Production orders"
        subtitle="Every piece being made, stage by stage. Production orders are raised automatically from orders that can't be met from stock."
        actions={
          <>
            <div className="inline-flex rounded-lg border border-line bg-card p-0.5">
              <button onClick={() => setView("board")} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${view === "board" ? "bg-ink text-paper" : ""}`}><LayoutGrid className="size-4" />Board</button>
              <button onClick={() => setView("list")} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${view === "list" ? "bg-ink text-paper" : ""}`}><List className="size-4" />List</button>
            </div>
            <Button href="/production/daily-entry">Enter daily output</Button>
          </>
        }
      />

      {view === "list" ? (
        <DataTable rows={rows} columns={columns} exportName="production-orders" initialSort={{ key: "due", dir: "asc" }} toolbar={toolbar} rowClassName={(p) => (poUrgency(p) === "overdue" ? "bg-bad-soft/40" : "")} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">{toolbar}</div>
          <div className="scroll-x pb-2">
            <div className="grid min-w-[1100px] grid-cols-6 gap-3">
              {stages.map((s) => {
                const col = rows.filter((p) => p.currentStage === s.id);
                const pcs = col.reduce((a, p) => a + p.qty, 0);
                return (
                  <div key={s.id} className="rounded-xl border border-line bg-sand/50 p-2">
                    <div className="flex items-baseline justify-between px-1 pb-2">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted tabular">{col.length} POs · {pcs} pcs</p>
                    </div>
                    <div className="space-y-2">
                      {col.map((p) => {
                        const prod = getProduct(p.productId)!;
                        const st = p.stages.find((x) => x.stage === s.id)!;
                        const u = poUrgency(p);
                        return (
                          <Link key={p.id} href={`/production/${p.id}`} className={`block rounded-lg border bg-card p-2.5 text-sm hover:border-ink/30 ${u === "overdue" ? "border-bad/40" : u === "due-soon" ? "border-[#e0b100]/60" : "border-line"}`}>
                            <div className="flex gap-2">
                              <ProductThumb src={prod.image} alt={prod.name} size={30} />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{prod.name}</p>
                                <p className="text-xs text-muted">{p.id} · {p.size} × {p.qty}</p>
                              </div>
                            </div>
                            <p className="mt-2 truncate text-xs text-muted">{assigneeName(st.assignee)}</p>
                            <div className="mt-1.5 flex items-center justify-between text-xs">
                              <span className="tabular">{st.completed}/{st.assigned} done</span>
                              {u === "overdue" ? <span className="text-bad">Late</span> : u === "due-soon" ? <span className="text-warn">Due {fmtDate(p.dueDate).slice(0, -5)}</span> : <span className="text-muted">Due {fmtDate(p.dueDate).slice(0, -5)}</span>}
                            </div>
                          </Link>
                        );
                      })}
                      {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted">Nothing here</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
