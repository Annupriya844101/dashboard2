import Link from "next/link";
import type { Metadata } from "next";
import { Download, Search } from "lucide-react";
import {
  Card,
  EmptyState,
  FilterTabs,
  OrderStatusBadge,
  PageHeader,
  Pagination,
  PaymentStatusBadge,
  Td,
  Th,
  buttonStyles,
  inputStyles,
} from "@/components/ui";
import { getOrderStatusCounts, listOrders } from "@/lib/queries";
import type { OrderStatus, PaymentMethod } from "@/db/schema";
import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
  PAYMENT_METHOD_LABEL,
  formatDateTime,
  formatINR,
} from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders" };

type SP = { status?: string; q?: string; page?: string; payment?: string };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await ensureSeeded();
  const sp = await searchParams;
  const status = (ORDER_STATUSES as string[]).includes(sp.status ?? "")
    ? (sp.status as OrderStatus)
    : "all";
  const payment = (Object.keys(PAYMENT_METHOD_LABEL) as string[]).includes(sp.payment ?? "")
    ? (sp.payment as PaymentMethod)
    : "all";
  const q = sp.q?.trim() ?? "";
  const page = Number(sp.page ?? 1) || 1;

  const [result, counts] = await Promise.all([
    listOrders({ status, payment, q, page }),
    getOrderStatusCounts(),
  ]);

  const buildHref = (overrides: Partial<SP>) => {
    const params = new URLSearchParams();
    const merged = { status, q, payment, page: String(page), ...overrides };
    if (merged.status && merged.status !== "all") params.set("status", merged.status);
    if (merged.q) params.set("q", merged.q);
    if (merged.payment && merged.payment !== "all") params.set("payment", merged.payment);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const s = params.toString();
    return `/orders${s ? `?${s}` : ""}`;
  };

  const tabs = [
    { key: "all", label: "All", href: buildHref({ status: "all", page: "1" }), count: counts.all ?? 0 },
    ...ORDER_STATUSES.map((s) => ({
      key: s,
      label: ORDER_STATUS_META[s].label,
      href: buildHref({ status: s, page: "1" }),
      count: counts[s] ?? 0,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track, process and fulfil customer orders."
        actions={
          <a href="/api/orders?format=csv" className={buttonStyles.outline}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />

      <Card padded={false}>
        <FilterTabs tabs={tabs} current={status} />

        <form className="flex flex-col gap-2 border-b border-fk-border/70 px-5 py-3 sm:flex-row sm:items-center">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fk-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by order ID, customer or city"
              className={`${inputStyles} pl-9`}
            />
          </div>
          <select name="payment" defaultValue={payment} className={`${inputStyles} sm:w-48`}>
            <option value="all">All payment methods</option>
            {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonStyles.blue}>
            Filter
          </button>
          {(q || payment !== "all") && (
            <Link href={buildHref({ q: "", payment: "all", page: "1" })} className={buttonStyles.ghost}>
              Clear
            </Link>
          )}
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="Try changing the filters or search term."
          />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr>
                  <Th>Order ID</Th>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th align="center">Items</Th>
                  <Th>Payment</Th>
                  <Th>Status</Th>
                  <Th align="right">Total</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fk-border/60">
                {result.rows.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <Td>
                      <Link href={`/orders/${o.id}`} className="font-semibold text-fk-blue hover:underline">
                        {o.orderNumber}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-fk-muted">{formatDateTime(o.createdAt)}</Td>
                    <Td>
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-[11px] text-fk-muted">{o.customerCity}</p>
                    </Td>
                    <Td align="center">{o.itemCount}</Td>
                    <Td>
                      <p className="text-xs">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</p>
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </Td>
                    <Td>
                      <OrderStatusBadge status={o.status} />
                    </Td>
                    <Td align="right" className="font-semibold">
                      {formatINR(o.total)}
                    </Td>
                    <Td align="right">
                      <Link href={`/orders/${o.id}`} className={buttonStyles.ghost}>
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
          buildHref={(p) => buildHref({ page: String(p) })}
        />
      </Card>
    </div>
  );
}
