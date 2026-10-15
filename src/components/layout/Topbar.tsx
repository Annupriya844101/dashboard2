import Link from "next/link";
import { Bell, ChevronDown, Plus, Search, Store } from "lucide-react";
import type { ActivityLog, StoreSettings } from "@/db/schema";
import { timeAgo } from "@/lib/format";

const ACTIVITY_ICON: Record<ActivityLog["type"], string> = {
  order: "🛒",
  product: "🏷️",
  inventory: "📦",
  customer: "👤",
  settings: "⚙️",
  payment: "💰",
};

export function Topbar({
  settings,
  activity,
}: {
  settings: StoreSettings;
  activity: ActivityLog[];
}) {
  const initials = (settings.ownerName || settings.storeName)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-14 bg-fk-blue text-white shadow-md">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-4 sm:gap-5">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 flex-col leading-none">
          <span className="text-[17px] font-bold italic tracking-tight sm:text-lg">
            Youmang Ka Vyapaar
          </span>
          <span className="flex items-center gap-1 text-[10px] italic text-white/90">
            Seller Hub
            <span className="brand-plus font-bold not-italic">✦ Plus</span>
          </span>
        </Link>

        {/* Search */}
        <form
          action="/search"
          className="hidden flex-1 items-center md:flex"
          role="search"
        >
          <div className="flex w-full max-w-xl items-center rounded-sm bg-white shadow-sm">
            <input
              type="search"
              name="q"
              placeholder="Search orders, products, customers…"
              className="h-9 w-full rounded-l-sm bg-transparent px-4 text-sm text-fk-text placeholder:text-fk-muted focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              className="flex h-9 w-11 items-center justify-center rounded-r-sm text-fk-blue"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <Link
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-sm hover:bg-white/10 md:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>

          <Link
            href="/products/new"
            className="hidden items-center gap-1.5 rounded-sm bg-white px-4 py-1.5 text-sm font-semibold text-fk-blue shadow-sm transition hover:bg-slate-50 sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>

          {/* Notifications */}
          <details className="group relative">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-sm hover:bg-white/10 [&::-webkit-details-marker]:hidden">
              <span className="relative">
                <Bell className="h-5 w-5" />
                {activity.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fk-orange px-1 text-[10px] font-bold text-white">
                    {Math.min(activity.length, 9)}
                  </span>
                )}
              </span>
            </summary>
            <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-md border border-fk-border/70 bg-white text-fk-text shadow-xl">
              <div className="flex items-center justify-between border-b border-fk-border/70 px-4 py-2.5">
                <p className="text-sm font-semibold">Notifications</p>
                <span className="text-xs text-fk-muted">{activity.length} recent</span>
              </div>
              <ul className="max-h-80 divide-y divide-fk-border/60 overflow-y-auto">
                {activity.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-fk-muted">
                    You&apos;re all caught up.
                  </li>
                )}
                {activity.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={a.href || "/"}
                      className="flex gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <span className="text-lg leading-none">{ACTIVITY_ICON[a.type]}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{a.message}</span>
                        <span className="text-[11px] text-fk-muted">
                          {timeAgo(a.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          {/* Profile */}
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-white/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fk-yellow text-xs font-bold text-fk-text">
              {initials || <Store className="h-4 w-4" />}
            </span>
            <span className="hidden flex-col leading-tight lg:flex">
              <span className="text-sm font-semibold">
                {settings.ownerName || "Seller"}
              </span>
              <span className="text-[11px] text-white/80">
                {settings.city || "India"}
              </span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-white/80 lg:block" />
          </Link>
        </div>
      </div>
    </header>
  );
}
