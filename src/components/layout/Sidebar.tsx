"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export function buildNav(counts: { pendingOrders: number; lowStock: number }): NavItem[] {
  return [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ShoppingCart, badge: counts.pendingOrders },
    { href: "/products", label: "Products", icon: Package },
    { href: "/inventory", label: "Inventory", icon: Boxes, badge: counts.lowStock },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/payments", label: "Payments", icon: Wallet },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  counts,
  storeName,
}: {
  counts: { pendingOrders: number; lowStock: number };
  storeName: string;
}) {
  const pathname = usePathname();
  const nav = buildNav(counts);

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r border-fk-border/70 bg-white lg:flex">
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-fk-muted">
          Manage
        </p>
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-sm border-l-[3px] px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "border-fk-blue bg-fk-blue-light text-fk-blue"
                  : "border-transparent text-fk-text hover:bg-slate-50 hover:text-fk-blue",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px]",
                  active ? "text-fk-blue" : "text-fk-muted group-hover:text-fk-blue",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    active
                      ? "bg-fk-blue text-white"
                      : "bg-fk-orange/10 text-fk-orange",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-fk-border/70 p-4">
        <div className="rounded-md bg-gradient-to-br from-fk-blue to-fk-blue-dark p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
            Seller Plus
          </p>
          <p className="mt-1 text-sm font-semibold">{storeName}</p>
          <p className="mt-1 text-xs text-white/80">
            Gold tier · 4.6 ★ seller rating
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full w-[72%] rounded-full bg-fk-yellow" />
          </div>
          <p className="mt-1.5 text-[11px] text-white/80">72% to Platinum tier</p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({
  counts,
}: {
  counts: { pendingOrders: number; lowStock: number };
}) {
  const pathname = usePathname();
  const nav = buildNav(counts);
  return (
    <nav className="scrollbar-thin sticky top-14 z-20 flex gap-1 overflow-x-auto border-b border-fk-border/70 bg-white px-2 lg:hidden">
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium",
              active
                ? "border-fk-blue text-fk-blue"
                : "border-transparent text-fk-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-fk-orange/10 px-1.5 text-[10px] font-bold text-fk-orange">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
