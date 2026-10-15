import Link from "next/link";
import type { Metadata } from "next";
import { Search, UserPlus, Users, Crown, Repeat } from "lucide-react";
import {
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  StatCard,
  Td,
  Th,
  buttonStyles,
  inputStyles,
} from "@/components/ui";
import { getDashboardStats, getFulfilmentMetrics, listCustomers } from "@/lib/queries";
import { formatDate, formatINR, formatNumber, timeAgo } from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customers" };

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-fk-blue-light text-fk-blue",
  "bg-orange-50 text-fk-orange",
  "bg-green-50 text-fk-green",
  "bg-purple-50 text-purple-600",
  "bg-amber-50 text-amber-600",
  "bg-sky-50 text-sky-600",
];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await ensureSeeded();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Number(sp.page ?? 1) || 1;

  const [result, stats, metrics] = await Promise.all([
    listCustomers({ q, page }),
    getDashboardStats(),
    getFulfilmentMetrics(),
  ]);

  const repeatRate = metrics.totalCustomersWithOrders
    ? (metrics.repeatCustomers / metrics.totalCustomersWithOrders) * 100
    : 0;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/customers${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Customers" description="Know who buys from you and how often." />

      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total customers"
          value={formatNumber(stats.customers.total)}
          icon={<Users className="h-5 w-5" />}
          accent="blue"
          hint={`${stats.customers.new30} joined in the last 30 days`}
        />
        <StatCard
          label="Repeat buyers"
          value={`${repeatRate.toFixed(0)}%`}
          icon={<Repeat className="h-5 w-5" />}
          accent="green"
          hint={`${metrics.repeatCustomers} customers ordered more than once`}
        />
        <StatCard
          label="Avg. order value"
          value={formatINR(stats.aov)}
          icon={<Crown className="h-5 w-5" />}
          accent="orange"
          hint="Across all revenue-recognised orders"
        />
      </section>

      <Card padded={false}>
        <form className="flex flex-col gap-2 border-b border-fk-border/70 px-5 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fk-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name, email or city"
              className={`${inputStyles} pl-9`}
            />
          </div>
          <button type="submit" className={buttonStyles.blue}>
            Search
          </button>
          {q && (
            <Link href="/customers" className={buttonStyles.ghost}>
              Clear
            </Link>
          )}
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="Try a different search."
            icon={<UserPlus className="h-6 w-6" />}
          />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Location</Th>
                  <Th align="center">Orders</Th>
                  <Th align="right">Total spent</Th>
                  <Th>Last order</Th>
                  <Th>Customer since</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fk-border/60">
                {result.rows.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                        >
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/customers/${c.id}`} className="block font-medium hover:text-fk-blue">
                            {c.name}
                          </Link>
                          <p className="truncate text-[11px] text-fk-muted">{c.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p>{c.city}</p>
                      <p className="text-[11px] text-fk-muted">{c.state}</p>
                    </Td>
                    <Td align="center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{c.orderCount}</span>
                    </Td>
                    <Td align="right" className="font-semibold">
                      {formatINR(c.totalSpent)}
                    </Td>
                    <Td className="text-fk-muted">{c.lastOrderAt ? timeAgo(c.lastOrderAt) : "—"}</Td>
                    <Td className="text-fk-muted">{formatDate(c.createdAt)}</Td>
                    <Td align="right">
                      <Link href={`/customers/${c.id}`} className={buttonStyles.ghost}>
                        View
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          buildHref={buildHref}
        />
      </Card>
    </div>
  );
}
