import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  Boxes,
  IndianRupee,
  PackagePlus,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  Card,
  EmptyState,
  OrderStatusBadge,
  ProductThumb,
  StatCard,
  Td,
  Th,
  buttonStyles,
} from "@/components/ui";
import { OrdersSparkBar, RevenueAreaChart, StatusDonut } from "@/components/charts";
import {
  getDashboardStats,
  getLowStockProducts,
  getOrderStatusBreakdown,
  getRecentOrders,
  getRevenueSeries,
  getSettings,
  getTopProducts,
} from "@/lib/queries";
import {
  ORDER_STATUS_META,
  PAYMENT_METHOD_LABEL,
  formatCompactINR,
  formatINR,
  formatNumber,
  percentChange,
  timeAgo,
} from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = Number(
    new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  await ensureSeeded();
  const sp = await searchParams;
  const [stats, series, statusBreakdown, recentOrders, topProducts, lowStock, settings] =
    await Promise.all([
      getDashboardStats(),
      getRevenueSeries(30),
      getOrderStatusBreakdown(),
      getRecentOrders(8),
      getTopProducts(5),
      getLowStockProducts(6),
      getSettings(),
    ]);

  const revenueChange = percentChange(stats.revenue30, stats.revenuePrev30);
  const ordersChange = percentChange(stats.orders30, stats.ordersPrev30);
  const customersChange = percentChange(stats.customers.new30, stats.customers.prev30);
  const totalOrders = statusBreakdown.reduce((s, r) => s + r.count, 0);
  const maxTopRevenue = Math.max(1, ...topProducts.map((p) => p.revenue));

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="space-y-5">
      {sp.reset && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Demo data has been reset to its original state.
        </div>
      )}

      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-md bg-gradient-to-r from-fk-blue via-fk-blue to-[#1a4fb8] p-5 text-white shadow-card sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-fk-yellow/20" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/80">
              {today}
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              {greeting()}, {settings.ownerName || "Seller"} 👋
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/85">
              Here&apos;s what&apos;s happening at <strong>{settings.storeName}</strong> today.
              You have <strong>{stats.ordersPending}</strong> orders waiting to be processed and{" "}
              <strong>{stats.products.lowStock + stats.products.outOfStock}</strong> products need restocking.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/orders?status=pending" className={buttonStyles.secondary}>
              <Truck className="h-4 w-4" />
              Process orders
            </Link>
            <Link href="/products/new" className={buttonStyles.primary}>
              <PackagePlus className="h-4 w-4" />
              Add product
            </Link>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Today's orders", value: formatNumber(stats.ordersToday) },
            { label: "Today's revenue", value: formatINR(stats.revenueToday) },
            { label: "Avg. order value", value: formatINR(stats.aov) },
            { label: "COD to collect", value: formatINR(stats.codPending) },
          ].map((m) => (
            <div key={m.label} className="rounded-md bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wide text-white/75">{m.label}</p>
              <p className="mt-0.5 text-lg font-semibold">{m.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (30 days)"
          value={formatCompactINR(stats.revenue30)}
          change={revenueChange}
          changeLabel="vs previous 30 days"
          icon={<IndianRupee className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Orders (30 days)"
          value={formatNumber(stats.orders30)}
          change={ordersChange}
          changeLabel="vs previous 30 days"
          icon={<ShoppingBag className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="New customers"
          value={formatNumber(stats.customers.new30)}
          change={customersChange}
          changeLabel={`${formatNumber(stats.customers.total)} total customers`}
          icon={<Users className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Stock alerts"
          value={formatNumber(stats.products.lowStock + stats.products.outOfStock)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="red"
          hint={`${stats.products.outOfStock} out of stock · ${stats.products.lowStock} running low`}
        />
      </section>

      {/* Revenue + status */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Revenue trend"
          subtitle="Daily revenue from delivered & in-progress orders, last 30 days"
          action={
            <Link href="/analytics" className={buttonStyles.ghost}>
              View analytics <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <RevenueAreaChart data={series} />
        </Card>

        <Card title="Orders by status" subtitle="Lifetime order distribution">
          <StatusDonut data={statusBreakdown} />
          <ul className="mt-2 space-y-1.5">
            {statusBreakdown
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((s) => (
                <li key={s.status}>
                  <Link
                    href={`/orders?status=${s.status}`}
                    className="flex items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: ORDER_STATUS_META[s.status].color }}
                      />
                      {ORDER_STATUS_META[s.status].label}
                    </span>
                    <span className="text-fk-muted">
                      <span className="font-semibold text-fk-text">{s.count}</span>{" "}
                      · {totalOrders ? Math.round((s.count / totalOrders) * 100) : 0}%
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      </section>

      {/* Recent orders + top products */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          padded={false}
          title="Recent orders"
          subtitle="Latest orders placed on your store"
          action={
            <Link href="/orders" className={buttonStyles.ghost}>
              All orders <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders will show up here as customers buy." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Customer</Th>
                    <Th>Payment</Th>
                    <Th>Status</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fk-border/60">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70">
                      <Td>
                        <Link href={`/orders/${o.id}`} className="font-semibold text-fk-blue hover:underline">
                          {o.orderNumber}
                        </Link>
                        <p className="text-[11px] text-fk-muted">
                          {o.itemCount} item{o.itemCount > 1 ? "s" : ""} · {timeAgo(o.createdAt)}
                        </p>
                      </Td>
                      <Td>
                        <p className="font-medium">{o.customerName}</p>
                        <p className="text-[11px] text-fk-muted">{o.customerCity}</p>
                      </Td>
                      <Td>
                        <span className="text-xs">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</span>
                      </Td>
                      <Td>
                        <OrderStatusBadge status={o.status} />
                      </Td>
                      <Td align="right" className="font-semibold">
                        {formatINR(o.total)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Top selling products"
          subtitle="By revenue, all time"
          action={
            <Link href="/products" className={buttonStyles.ghost}>
              Catalogue <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <ul className="space-y-4">
            {topProducts.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="w-4 text-xs font-bold text-fk-muted">#{i + 1}</span>
                <ProductThumb emoji={p.emoji} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${p.id}/edit`}
                    className="block truncate text-sm font-medium hover:text-fk-blue"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-fk-blue"
                      style={{ width: `${Math.max(6, (p.revenue / maxTopRevenue) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-fk-muted">
                    {p.unitsSold} sold · {p.categoryName}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCompactINR(p.revenue)}</span>
              </li>
            ))}
            {topProducts.length === 0 && (
              <li className="text-sm text-fk-muted">No sales recorded yet.</li>
            )}
          </ul>
        </Card>
      </section>

      {/* Low stock + orders per day + quick actions */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          padded={false}
          title="Low stock alerts"
          subtitle="Restock these before they go out of stock"
          action={
            <Link href="/inventory?filter=low" className={buttonStyles.ghost}>
              Inventory <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          {lowStock.length === 0 ? (
            <EmptyState title="All stocked up" description="No products are below their reorder level." />
          ) : (
            <ul className="divide-y divide-fk-border/60">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <ProductThumb emoji={p.emoji} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-[11px] text-fk-muted">
                      {p.sku} · {p.categoryName}
                    </p>
                  </div>
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs font-bold ${
                      p.stock === 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {p.stock === 0 ? "0 left" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Orders per day" subtitle="Order volume, last 30 days">
          <OrdersSparkBar data={series} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-sm bg-slate-50 p-2">
              <p className="text-[11px] text-fk-muted">Shipped</p>
              <p className="text-base font-semibold">{stats.ordersShipped}</p>
            </div>
            <div className="rounded-sm bg-slate-50 p-2">
              <p className="text-[11px] text-fk-muted">Returned</p>
              <p className="text-base font-semibold">{stats.ordersReturned}</p>
            </div>
            <div className="rounded-sm bg-slate-50 p-2">
              <p className="text-[11px] text-fk-muted">Cancelled</p>
              <p className="text-base font-semibold">{stats.ordersCancelled}</p>
            </div>
          </div>
        </Card>

        <Card title="Quick actions" subtitle="Everyday seller tasks">
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/products/new", label: "List a product", icon: PackagePlus, color: "bg-fk-blue-light text-fk-blue" },
              { href: "/orders?status=processing", label: "Ship orders", icon: Truck, color: "bg-orange-50 text-fk-orange" },
              { href: "/inventory", label: "Update stock", icon: Boxes, color: "bg-amber-50 text-amber-600" },
              { href: "/payments", label: "Settlements", icon: Wallet, color: "bg-green-50 text-fk-green" },
              { href: "/customers", label: "Customers", icon: Users, color: "bg-purple-50 text-purple-600" },
              { href: "/analytics", label: "Reports", icon: BadgeIndianRupee, color: "bg-sky-50 text-sky-600" },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className="flex flex-col items-start gap-2 rounded-md border border-fk-border/70 p-3 transition hover:border-fk-blue hover:shadow-card"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-md ${a.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{a.label}</span>
                </Link>
              );
            })}
          </div>
          <p className="mt-4 rounded-sm bg-slate-50 px-3 py-2 text-xs text-fk-muted">
            Inventory value:{" "}
            <span className="font-semibold text-fk-text">
              {formatINR(stats.products.inventoryValue)}
            </span>{" "}
            across {stats.products.active} active listings.
          </p>
        </Card>
      </section>
    </div>
  );
}
