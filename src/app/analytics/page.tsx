import type { Metadata } from "next";
import { Clock, Percent, RotateCcw, Repeat, TrendingUp, Download } from "lucide-react";
import { Card, PageHeader, StatCard, Td, Th } from "@/components/ui";
import { CategoryPie, MonthlyBarChart, PaymentMethodBar, RevenueAreaChart } from "@/components/charts";
import {
  getDashboardStats,
  getFulfilmentMetrics,
  getMonthlyRevenue,
  getPaymentMethodBreakdown,
  getRevenueByCategory,
  getRevenueSeries,
  getTopCities,
  getTopProducts,
} from "@/lib/queries";
import {
  PAYMENT_METHOD_LABEL,
  formatCompactINR,
  formatINR,
  formatNumber,
  percentChange,
} from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await ensureSeeded();
  const [stats, monthly, byCategory, byPayment, cities, metrics, series, topProducts] =
    await Promise.all([
      getDashboardStats(),
      getMonthlyRevenue(6),
      getRevenueByCategory(),
      getPaymentMethodBreakdown(),
      getTopCities(8),
      getFulfilmentMetrics(),
      getRevenueSeries(90),
      getTopProducts(8),
    ]);

  const returnRate = metrics.total ? (metrics.returned / metrics.total) * 100 : 0;
  const cancelRate = metrics.total ? (metrics.cancelled / metrics.total) * 100 : 0;
  const repeatRate = metrics.totalCustomersWithOrders
    ? (metrics.repeatCustomers / metrics.totalCustomersWithOrders) * 100
    : 0;
  const categoryTotal = byCategory.reduce((s, c) => s + c.revenue, 0);
  const maxCity = Math.max(1, ...cities.map((c) => c.revenue));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Understand what sells, where it sells and how your store is performing."
        actions={
          <a href="/api/stats" className="inline-flex items-center gap-2 rounded-sm border border-fk-border bg-white px-4 py-2 text-sm font-medium hover:border-fk-blue hover:text-fk-blue">
            <Download className="h-4 w-4" /> Stats JSON
          </a>
        }
      />

      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Lifetime revenue"
          value={formatCompactINR(stats.revenueTotal)}
          change={percentChange(stats.revenue30, stats.revenuePrev30)}
          changeLabel="30-day momentum"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Avg. delivery time"
          value={`${metrics.avgDeliveryDays.toFixed(1)} days`}
          icon={<Clock className="h-5 w-5" />}
          accent="green"
          hint={`${metrics.delivered} orders delivered`}
        />
        <StatCard
          label="Return rate"
          value={`${returnRate.toFixed(1)}%`}
          icon={<RotateCcw className="h-5 w-5" />}
          accent="purple"
          hint={`Cancellation rate ${cancelRate.toFixed(1)}%`}
        />
        <StatCard
          label="Repeat purchase rate"
          value={`${repeatRate.toFixed(0)}%`}
          icon={<Repeat className="h-5 w-5" />}
          accent="orange"
          hint={`${metrics.repeatCustomers} of ${metrics.totalCustomersWithOrders} buyers`}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Monthly performance" subtitle="Revenue and order volume, last 6 months">
          <MonthlyBarChart data={monthly} />
          <div className="scrollbar-thin mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr>
                  <Th>Month</Th>
                  <Th align="right">Orders</Th>
                  <Th align="right">Revenue</Th>
                  <Th align="right">Growth</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fk-border/60">
                {monthly.map((m, i) => {
                  const prev = monthly[i - 1]?.revenue ?? 0;
                  const growth = i === 0 ? null : percentChange(m.revenue, prev);
                  return (
                    <tr key={m.month}>
                      <Td className="font-medium">{m.label}</Td>
                      <Td align="right">{formatNumber(m.orders)}</Td>
                      <Td align="right" className="font-semibold">{formatINR(m.revenue)}</Td>
                      <Td align="right">
                        {growth === null ? (
                          <span className="text-fk-muted">—</span>
                        ) : (
                          <span className={growth >= 0 ? "font-semibold text-fk-green" : "font-semibold text-red-600"}>
                            {growth >= 0 ? "+" : ""}
                            {growth.toFixed(1)}%
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Revenue by category" subtitle="Share of recognised revenue">
          <CategoryPie data={byCategory.map((c) => ({ name: c.name, revenue: c.revenue }))} />
          <ul className="mt-2 space-y-2">
            {byCategory.map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{c.icon}</span>
                  {c.name}
                </span>
                <span className="text-fk-muted">
                  <span className="font-semibold text-fk-text">{formatCompactINR(c.revenue)}</span> ·{" "}
                  {categoryTotal ? ((c.revenue / categoryTotal) * 100).toFixed(0) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Payment methods" subtitle="How customers prefer to pay">
          <PaymentMethodBar
            data={byPayment.map((p) => ({
              label: PAYMENT_METHOD_LABEL[p.method],
              count: p.count,
              amount: p.amount,
            }))}
          />
          <ul className="mt-2 divide-y divide-fk-border/60 text-sm">
            {byPayment.map((p) => (
              <li key={p.method} className="flex items-center justify-between py-1.5">
                <span>{PAYMENT_METHOD_LABEL[p.method]}</span>
                <span className="text-fk-muted">
                  {p.count} orders · <span className="font-semibold text-fk-text">{formatCompactINR(p.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Top cities" subtitle="Where your orders come from">
          <ul className="space-y-3">
            {cities.map((c, i) => (
              <li key={`${c.city}-${c.state}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-xs font-bold text-fk-muted">{i + 1}</span>
                    <span className="font-medium">{c.city}</span>
                    <span className="text-[11px] text-fk-muted">{c.state}</span>
                  </span>
                  <span className="text-fk-muted">
                    {c.orders} · <span className="font-semibold text-fk-text">{formatCompactINR(c.revenue)}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-fk-orange" style={{ width: `${Math.max(4, (c.revenue / maxCity) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card padded={false} title="Best sellers" subtitle="Top products by revenue">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th align="right">Units</Th>
                <Th align="right">Revenue</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fk-border/60">
              {topProducts.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span>{p.emoji}</span>
                      <span className="line-clamp-1 max-w-[180px]">{p.name}</span>
                    </div>
                  </Td>
                  <Td align="right">{p.unitsSold}</Td>
                  <Td align="right" className="font-semibold">{formatCompactINR(p.revenue)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="mt-4">
        <Card
          title="Quarterly revenue trend"
          subtitle="Daily revenue, last 90 days"
          action={
            <span className="inline-flex items-center gap-1 rounded-sm bg-fk-blue-light px-2 py-1 text-xs font-semibold text-fk-blue">
              <Percent className="h-3 w-3" /> {stats.orders30} orders in last 30 days
            </span>
          }
        >
          <RevenueAreaChart data={series} />
        </Card>
      </section>
    </div>
  );
}
