import company from "@/data/company.json";
import products from "@/data/products.json";
import materials from "@/data/materials.json";
import suppliers from "@/data/suppliers.json";
import boms from "@/data/boms.json";
import stages from "@/data/stages.json";
import karigars from "@/data/karigars.json";
import machines from "@/data/machines.json";
import vendors from "@/data/vendors.json";
import orders from "@/data/orders.json";
import productionOrders from "@/data/productionOrders.json";
import output from "@/data/output.json";
import movements from "@/data/movements.json";
import syncLog from "@/data/syncLog.json";
import stores from "@/data/stores.json";
import consignmentStock from "@/data/consignmentStock.json";
import consignmentReports from "@/data/consignmentReports.json";
import salesDaily from "@/data/salesDaily.json";
import roles from "@/data/roles.json";
import users from "@/data/users.json";
import permissions from "@/data/permissions.json";
import changeLog from "@/data/changeLog.json";

export {
  company, products, materials, suppliers, boms, stages, karigars, machines, vendors, orders,
  productionOrders, output, movements, syncLog, stores, consignmentStock, consignmentReports,
  salesDaily, roles, users, permissions, changeLog,
};

export type Product = (typeof products)[number];
export type Material = (typeof materials)[number];
export type Order = (typeof orders)[number];
export type ProductionOrder = (typeof productionOrders)[number];
export type Karigar = (typeof karigars)[number];

export const TODAY = company.today;
export const CHANNELS = ["Shopify", "Wholesale", "Offline", "Consignment"] as const;

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const productMap = byId(products);
const materialMap = byId(materials);
const supplierMap = byId(suppliers);
const karigarMap = byId(karigars);
const machineMap = byId(machines);
const vendorMap = byId(vendors);
const stageMap = byId(stages);
const orderMap = byId(orders);
const storeMap = byId(stores);

export const getProduct = (id: string) => productMap.get(id);
export const getMaterial = (id: string) => materialMap.get(id);
export const getSupplier = (id: string) => supplierMap.get(id);
export const getKarigar = (id: string) => karigarMap.get(id);
export const getMachine = (id: string) => machineMap.get(id);
export const getVendor = (id: string) => vendorMap.get(id);
export const getOrder = (id: string) => orderMap.get(id);
export const getStore = (id: string) => storeMap.get(id);
export const stageName = (id: string) => (id === "done" ? "Completed" : stageMap.get(id)?.name ?? id);
export const getBom = (productId: string) => boms.find((b) => b.productId === productId);

export function assigneeName(a: { kind: string; id: string; operator?: string } | null | undefined) {
  if (!a) return "Unassigned";
  if (a.kind === "karigar") return getKarigar(a.id)?.name ?? a.id;
  if (a.kind === "vendor") return getVendor(a.id)?.name ?? a.id;
  if (a.kind === "machine") return `${getMachine(a.id)?.name ?? a.id}${a.operator ? ` (${getKarigar(a.operator)?.name})` : ""}`;
  return a.id;
}

export { inr, inrShort, num, fmtDate, fmtShort, daysBetween, addDays } from "./format";
import { daysBetween, addDays } from "./format";

// ---------- business rules ----------
export type Urgency = "overdue" | "due-soon" | "on-track" | "done";
export function urgency(dueDate: string, done: boolean): Urgency {
  if (done) return "done";
  const d = daysBetween(TODAY, dueDate);
  if (d < 0) return "overdue";
  if (d <= 7) return "due-soon";
  return "on-track";
}
export const openOrders = () => orders.filter((o) => o.status !== "Dispatched");
export const orderUrgency = (o: Order) => urgency(o.dueDate, o.status === "Dispatched");
export const poUrgency = (p: ProductionOrder) => urgency(p.dueDate, p.status === "Completed");

export const lowStockMaterials = () => materials.filter((m) => m.stock < m.minLevel);
export const materialStatus = (m: Material) => (m.stock < m.minLevel * 0.5 ? "Critical" : m.stock < m.minLevel ? "Low" : "OK");
export const sizeStock = (p: Product) => p.stock as unknown as Record<string, number>;
export const finishedUnits = (p: Product) => Object.values(sizeStock(p)).reduce((a, b) => a + b, 0);

/** Material needed for one production order, from its product BOM */
export function poRequirements(po: ProductionOrder) {
  const bom = getBom(po.productId);
  if (!bom) return [];
  return bom.lines.map((l) => {
    const m = getMaterial(l.materialId)!;
    const required = Math.round(l.qty * po.qty * 100) / 100;
    return { material: m, perPiece: l.qty, required, available: m.stock, short: Math.max(0, required - m.stock) };
  });
}

export function salesInRange(days: number, endOffset = 0) {
  const end = addDays(TODAY, -endOffset);
  const start = addDays(end, -(days - 1));
  const rows = salesDaily.filter((r) => r.date >= start && r.date <= end);
  const by = { Shopify: 0, Wholesale: 0, Offline: 0, Consignment: 0 };
  for (const r of rows) for (const c of CHANNELS) by[c] += r[c];
  return { ...by, total: by.Shopify + by.Wholesale + by.Offline + by.Consignment };
}

export function outputBetween(start: string, end: string) {
  return output.filter((o) => o.date >= start && o.date <= end);
}

export const piecesInProduction = () =>
  productionOrders.filter((p) => p.status !== "Completed").reduce((a, p) => a + p.qty, 0);

export function unitsSold() {
  const units = new Map<string, number>();
  for (const o of orders) for (const it of o.items) units.set(it.productId, (units.get(it.productId) ?? 0) + it.qty);
  return units;
}
