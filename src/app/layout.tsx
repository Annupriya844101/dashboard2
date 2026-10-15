import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav, Sidebar } from "@/components/layout/Sidebar";
import { ensureSeeded } from "@/lib/seed";
import { getActivity, getSettings } from "@/lib/queries";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Youmang Ka Vyapaar · Seller Hub",
    template: "%s · Youmang Ka Vyapaar",
  },
  description:
    "Youmang Ka Vyapaar – a Flipkart-style e-commerce business management dashboard for orders, products, inventory, customers, analytics and payments.",
};

async function getShellCounts() {
  const [[o], [p]] = await Promise.all([
    db
      .select({
        pending: sql<number>`count(*) filter (where ${orders.status} in ('pending','processing'))::int`,
      })
      .from(orders),
    db
      .select({
        low: sql<number>`count(*) filter (where ${products.stock} <= ${products.lowStockThreshold} and ${products.status} = 'active')::int`,
      })
      .from(products),
  ]);
  return { pendingOrders: o?.pending ?? 0, lowStock: p?.low ?? 0 };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  const [settings, activity, counts] = await Promise.all([
    getSettings(),
    getActivity(8),
    getShellCounts(),
  ]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-fk-bg font-sans text-fk-text antialiased">
        <Topbar settings={settings} activity={activity} />
        <MobileNav counts={counts} />
        <div className="mx-auto flex max-w-[1600px]">
          <Sidebar counts={counts} storeName={settings.storeName} />
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
            {children}
            <footer className="mt-10 border-t border-fk-border/70 pt-4 text-center text-xs text-fk-muted">
              © {new Date().getFullYear()} {settings.storeName} · Seller Hub · Built with
              Next.js, Drizzle ORM &amp; PostgreSQL
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
