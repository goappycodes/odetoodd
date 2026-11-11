"use client";

import { useState } from "react";
import { AlertTriangle, CircleCheck, FileSpreadsheet, Upload } from "lucide-react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { downloadCsv } from "@/components/DataTable";
import { products, materials, boms } from "@/lib/data";

type Kind = "bom" | "products" | "stock";
const KINDS: { id: Kind; label: string; hint: string; header: string[] }[] = [
  { id: "bom", label: "Bills of materials", hint: "One row per material per product", header: ["product_sku", "material_code", "qty_per_piece"] },
  { id: "products", label: "Products", hint: "Create or update products and SKUs", header: ["sku", "name", "type", "fabric", "colour", "price", "sizes"] },
  { id: "stock", label: "Opening stock", hint: "Raw material stock from a physical count", header: ["material_code", "stock", "min_level"] },
];

function parseCsv(text: string) {
  const rows: string[][] = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === "," && !q) { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

const skus = new Set(products.map((p) => p.sku));
const matCodes = new Set(materials.map((m) => m.id));

function validate(kind: Kind, row: string[]): string | null {
  if (kind === "bom") {
    if (!skus.has(row[0])) return `SKU ${row[0] || "(blank)"} is not in the product master`;
    if (!matCodes.has(row[1])) return `Material ${row[1] || "(blank)"} not found`;
    if (!(Number(row[2]) > 0)) return "Quantity must be a number above 0";
  }
  if (kind === "products") {
    if (!row[0]) return "SKU is required";
    if (!(Number(row[5]) > 0)) return "Price must be a number";
  }
  if (kind === "stock") {
    if (!matCodes.has(row[0])) return `Material ${row[0] || "(blank)"} not found`;
    if (Number.isNaN(Number(row[1]))) return "Stock must be a number";
  }
  return null;
}

function sample(kind: Kind): string[][] {
  if (kind === "bom") {
    const rows = boms.slice(0, 3).flatMap((b) => b.lines.slice(0, 4).map((l) => [products.find((p) => p.id === b.productId)!.sku, l.materialId, String(l.qty)]));
    rows.push(["TP1599/OW", "RM001", "2.4"], ["ST1508/NB", "RM099", "1"], ["SK1504/OW", "RM014", "abc"]);
    return rows;
  }
  if (kind === "products") return products.slice(0, 6).map((p) => [p.sku, p.name, p.type, p.fabric, p.colour, String(p.price), p.sizes.join(" ")]).concat([["", "Untitled shirt", "Shirt", "Poplin", "White", "x", "Free size"]]);
  return materials.slice(0, 8).map((m) => [m.id, String(m.stock), String(m.minLevel)]).concat([["RM404", "12", "10"]]);
}

export default function Imports() {
  const [kind, setKind] = useState<Kind>("bom");
  const [file, setFile] = useState<string | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [done, setDone] = useState(false);
  const k = KINDS.find((x) => x.id === kind)!;
  const checked = rows.map((r) => ({ r, err: validate(kind, r) }));
  const bad = checked.filter((c) => c.err).length;

  const load = (name: string, data: string[][]) => { setFile(name); setRows(data); setDone(false); };

  return (
    <>
      <PageHeader title="Excel/CSV imports" subtitle="Upload products, BOMs and opening stock in bulk. Every row is checked before anything is saved." />
      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        {KINDS.map((x) => (
          <button key={x.id} onClick={() => { setKind(x.id); setFile(null); setRows([]); }} className={`rounded-xl border p-3 text-left text-sm ${kind === x.id ? "border-ink bg-ink text-paper" : "border-line bg-card hover:bg-sand"}`}>
            <span className="block font-medium">{x.label}</span>
            <span className={`text-xs ${kind === x.id ? "text-paper/70" : "text-muted"}`}>{x.hint}</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center">
          <FileSpreadsheet className="size-8 text-muted" />
          <p className="text-sm">Drop a CSV file here, or</p>
          <div className="flex flex-wrap justify-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-paper">
              <Upload className="size-4" />Choose file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const parsed = parseCsv(await f.text());
                load(f.name, parsed.slice(1));
              }} />
            </label>
            <button onClick={() => load(`sample-${kind}.csv`, sample(kind))} className="rounded-lg border border-line bg-card px-3.5 py-2 text-sm hover:bg-sand">Try a sample file</button>
            <button onClick={() => downloadCsv(`${kind}-template`, k.header, sample(kind).slice(0, 3))} className="rounded-lg border border-line bg-card px-3.5 py-2 text-sm hover:bg-sand">Download template</button>
          </div>
          <p className="text-xs text-muted">Columns: {k.header.join(", ")}. The live system also reads .xlsx files.</p>
        </div>
      </Card>

      {file && (
        <Card
          className="mt-6"
          title={<span className="inline-flex items-center gap-2">{file} <Badge>{rows.length} rows</Badge>{bad ? <Badge tone="bad">{bad} with errors</Badge> : <Badge tone="good">All rows valid</Badge>}</span>}
          action={
            done ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-good"><CircleCheck className="size-4" />Imported {rows.length - bad} rows</span>
            ) : (
              <button onClick={() => setDone(true)} className="rounded-lg bg-ink px-3 py-1.5 text-sm text-paper">Import {rows.length - bad} valid rows</button>
            )
          }
          pad={false}
        >
          <div className="scroll-x">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Row</th>
                  {k.header.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                  <th className="px-3 py-2 font-medium">Check</th>
                </tr>
              </thead>
              <tbody>
                {checked.map(({ r, err }, i) => (
                  <tr key={i} className={`border-b border-line/70 ${err ? "bg-bad-soft/40" : ""}`}>
                    <td className="px-3 py-2 text-muted tabular">{i + 2}</td>
                    {k.header.map((_, j) => <td key={j} className="px-3 py-2">{r[j]}</td>)}
                    <td className="px-3 py-2">{err ? <span className="inline-flex items-center gap-1 text-xs text-bad"><AlertTriangle className="size-3.5" />{err}</span> : <CircleCheck className="size-4 text-good" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
