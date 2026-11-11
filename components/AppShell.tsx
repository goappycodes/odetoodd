"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingBag, PlusCircle, RefreshCw, Factory, ClipboardPen, Users, Cog, Truck,
  Shirt, Layers, PackageCheck, ArrowLeftRight, PackagePlus, Building2, BarChart3, Calculator,
  TrendingUp, Repeat, Store, UserCog, ListOrdered, Upload, History, Mail, Menu, X, Search, Bell,
} from "lucide-react";

type Item = { href: string; label: string; icon: React.ElementType; addon?: boolean };
const NAV: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/", label: "Owner dashboard", icon: LayoutDashboard }] },
  {
    title: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/orders/new", label: "New offline order", icon: PlusCircle },
      { href: "/shopify", label: "Shopify sync", icon: RefreshCw },
    ],
  },
  {
    title: "Production",
    items: [
      { href: "/production", label: "Production orders", icon: Factory },
      { href: "/production/daily-entry", label: "Daily output entry", icon: ClipboardPen },
      { href: "/people/karigars", label: "Karigars", icon: Users },
      { href: "/people/machines", label: "Machines", icon: Cog },
      { href: "/people/vendors", label: "Vendors", icon: Truck },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/products", label: "Products and BOMs", icon: Shirt },
      { href: "/inventory/materials", label: "Raw materials", icon: Layers },
      { href: "/inventory/finished", label: "Finished goods", icon: PackageCheck },
      { href: "/inventory/movements", label: "Stock movements", icon: ArrowLeftRight },
      { href: "/inventory/entry", label: "Stock entry", icon: PackagePlus },
      { href: "/suppliers", label: "Suppliers", icon: Building2 },
    ],
  },
  { title: "Reports", items: [{ href: "/reports", label: "Reports and exports", icon: BarChart3 }] },
  {
    title: "Add-ons",
    items: [
      { href: "/addons/material-planning", label: "Material planning", icon: Calculator, addon: true },
      { href: "/addons/analytics", label: "Sales and productivity", icon: TrendingUp, addon: true },
      { href: "/addons/shopify-sync", label: "Two-way Shopify sync", icon: Repeat, addon: true },
      { href: "/addons/consignment", label: "Consignment", icon: Store, addon: true },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings/users", label: "Users and roles", icon: UserCog },
      { href: "/settings/stages", label: "Production stages", icon: ListOrdered },
      { href: "/settings/imports", label: "Excel/CSV imports", icon: Upload },
      { href: "/settings/history", label: "Change history", icon: History },
      { href: "/settings/daily-summary", label: "Daily summary email", icon: Mail },
    ],
  },
];

const ALL = NAV.flatMap((g) => g.items);
function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  // pick the longest nav href that matches, so /orders/new doesn't also light up /orders
  const best = ALL.filter((i) => i.href !== "/" && (path === i.href || path.startsWith(i.href + "/"))).sort((a, b) => b.href.length - a.href.length)[0];
  return best?.href === href;
}

function Sidebar({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pt-6 pb-5">
        <span className="grid size-9 place-items-center rounded-full border border-ink/70 font-serif text-lg leading-none">O</span>
        <span>
          <span className="block font-serif text-xl leading-tight">Ode To Odd</span>
          <span className="block text-[11px] tracking-[0.18em] text-muted uppercase">Studio ERP</span>
        </span>
      </Link>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {NAV.map((g) => (
          <div key={g.title}>
            <p className="px-2 pb-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(path, it.href);
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14px] transition-colors ${
                        active ? "bg-ink text-paper" : "text-ink/80 hover:bg-sand"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.addon && (
                        <span className={`rounded px-1.5 py-px text-[10px] font-medium ${active ? "bg-paper/20 text-paper" : "bg-rose-soft text-rose"}`}>
                          Add-on
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line px-5 py-4 text-xs text-muted">
        Prototype by <span className="text-ink">Appycodes</span>. All data is sample data.
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-card lg:block">
        <Sidebar path={path} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card shadow-xl">
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute top-5 right-3 rounded-md p-1.5 hover:bg-sand">
              <X className="size-5" />
            </button>
            <Sidebar path={path} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:px-6">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="-ml-1 rounded-md p-1.5 hover:bg-sand lg:hidden">
            <Menu className="size-5" />
          </button>
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input
              placeholder="Search orders, SKUs, karigars…"
              className="w-full rounded-lg border border-line bg-card py-2 pr-3 pl-9 text-sm outline-none placeholder:text-faint focus:border-ink/40"
            />
          </div>
          <span className="ml-auto hidden rounded-full border border-rose/30 bg-rose-soft px-2.5 py-1 text-xs text-rose sm:inline">Prototype · sample data</span>
          <button aria-label="Notifications" className="relative rounded-md p-1.5 hover:bg-sand">
            <Bell className="size-5" strokeWidth={1.75} />
            <span className="absolute top-1 right-1 size-2 rounded-full bg-bad" />
          </button>
          <span className="grid size-8 place-items-center rounded-full bg-ink text-xs text-paper">OW</span>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
