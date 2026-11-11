"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download } from "lucide-react";

export type Column<T> = {
  key: string;
  label: string;
  /** value used for sorting and CSV export */
  value: (row: T) => string | number | null | undefined;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ onClick, label = "Export CSV" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm hover:bg-sand">
      <Download className="size-4" /> {label}
    </button>
  );
}

export default function DataTable<T>({
  rows, columns, exportName, rowClassName, initialSort, pageSize = 25, toolbar, empty = "Nothing matches these filters.",
}: {
  rows: T[];
  columns: Column<T>[];
  exportName?: string;
  rowClassName?: (row: T) => string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  pageSize?: number;
  toolbar?: React.ReactNode;
  empty?: string;
}) {
  const [sort, setSort] = useState(initialSort);
  const [limit, setLimit] = useState(pageSize);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.value(a), vb = col.value(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb))) * dir;
    });
  }, [rows, columns, sort]);

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const exportCsv = () =>
    downloadCsv(exportName ?? "export", columns.map((c) => c.label), sorted.map((r) => columns.map((c) => c.value(r))));

  return (
    <div className="rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        {toolbar}
        <span className="ml-auto text-xs text-muted tabular">{sorted.length} rows</span>
        {exportName && <ExportButton onClick={exportCsv} />}
      </div>
      <div className="scroll-x">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2.5 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                  <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-ink">
                    {c.label}
                    {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {sorted.slice(0, limit).map((r, i) => (
              <tr key={i} className={`border-b border-line/70 last:border-0 hover:bg-sand/50 ${rowClassName?.(r) ?? ""}`}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2.5 align-middle ${c.align === "right" ? "text-right" : ""} ${c.className ?? ""}`}>
                    {c.render ? c.render(r) : (c.value(r) ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > limit && (
        <div className="border-t border-line p-3 text-center">
          <button onClick={() => setLimit((l) => l + pageSize)} className="text-sm text-muted hover:text-ink">
            Show more ({sorted.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; label: string }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-card px-2.5 py-2 text-sm outline-none focus:border-ink/40"
      >
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </label>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-40 rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-ink/40 sm:w-60"
    />
  );
}
