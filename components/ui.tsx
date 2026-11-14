import Link from "next/link";
import { AlertTriangle, CircleCheck, Clock, Sparkles, XCircle } from "lucide-react";
import type { Urgency } from "@/lib/data";

export function PageHeader({
  title, subtitle, actions, back,
}: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-sm text-muted hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className = "", pad = true }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`rounded-xl border border-line bg-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-medium">{title}</h2>
          {action}
        </div>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default", href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "default" | "bad" | "warn" | "good"; href?: string }) {
  const toneCls = { default: "", bad: "text-bad", warn: "text-warn", good: "text-good" }[tone];
  const body = (
    <div className={`h-full rounded-xl border border-line bg-card p-4 ${href ? "transition-colors hover:border-ink/30" : ""}`}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className={`mt-1 font-serif text-3xl tabular ${toneCls}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const BADGE = {
  neutral: "bg-sand text-ink/80",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  rose: "bg-rose-soft text-rose",
} as const;
export type Tone = keyof typeof BADGE;

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE[tone]}`}>{children}</span>;
}

export function UrgencyBadge({ u, dueDate }: { u: Urgency; dueDate?: string }) {
  if (u === "overdue") return <Badge tone="bad"><XCircle className="size-3" />Overdue</Badge>;
  if (u === "due-soon") return <Badge tone="warn"><Clock className="size-3" />Due in 7 days</Badge>;
  if (u === "done") return <Badge tone="good"><CircleCheck className="size-3" />Done</Badge>;
  return <Badge>On track{dueDate ? "" : ""}</Badge>;
}

const STATUS_TONE: Record<string, Tone> = {
  New: "info", "In production": "neutral", "Quality check": "rose", "Ready to dispatch": "good", Dispatched: "good",
  "Not started": "info", "In progress": "neutral", Completed: "good",
  OK: "good", Low: "warn", Critical: "bad",
  Synced: "good", Retried: "warn", Failed: "bad",
  Reconciled: "good", "Needs review": "warn",
  Running: "good", "Under repair": "warn", Active: "good",
  Returned: "good", Out: "info", Overdue: "bad",
  Delivered: "good", "In transit": "info", Exception: "bad", "Not moving": "bad", Delayed: "warn",
  Draft: "neutral", "Received by store": "good", Pending: "warn", "Not applicable": "neutral",
};
export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <Badge tone={tone}>
      {(status === "Low" || status === "Critical" || status === "Overdue" || status === "Not moving" || status === "Exception") && <AlertTriangle className="size-3" />}
      {status}
    </Badge>
  );
}

export function Progress({ value, max, tone = "ink" }: { value: number; max: number; tone?: "ink" | "good" | "warn" | "bad" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = { ink: "bg-ink", good: "bg-good", warn: "bg-[#c98a00]", bad: "bg-bad" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AddonBanner({ title, price, children }: { title: string; price: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-rose/30 bg-rose-soft/60 p-4">
      <Sparkles className="mt-0.5 size-5 shrink-0 text-rose" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-ink">
          {title} is an add-on <span className="font-normal text-muted">· about {price} + GST</span>
        </p>
        <p className="mt-0.5 text-muted">{children}</p>
      </div>
    </div>
  );
}

export function Button({ children, href, variant = "primary", type = "button" }: { children: React.ReactNode; href?: string; variant?: "primary" | "secondary"; type?: "button" | "submit" }) {
  const cls = `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
    variant === "primary" ? "bg-ink text-paper hover:bg-ink/85" : "border border-line bg-card text-ink hover:bg-sand"
  }`;
  return href ? <Link href={href} className={cls}>{children}</Link> : <button type={type} className={cls}>{children}</button>;
}

export function KeyValues({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SimpleTable({ head, rows, align }: { head: React.ReactNode[]; rows: React.ReactNode[][]; align?: ("left" | "right")[] }) {
  return (
    <div className="scroll-x">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            {head.map((h, i) => (
              <th key={i} className={`px-3 py-2 font-medium ${align?.[i] === "right" ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line/70 last:border-0">
              {r.map((c, ci) => (
                <td key={ci} className={`px-3 py-2 align-middle ${align?.[ci] === "right" ? "text-right" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductThumb({ src, alt, size = 40 }: { src: string; alt: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={Math.round(size * 1.3)} loading="lazy" className="shrink-0 rounded-md bg-sand object-cover" style={{ width: size, height: Math.round(size * 1.3) }} />
  );
}
