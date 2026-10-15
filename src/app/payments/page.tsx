import Link from "next/link";
import type { Metadata } from "next";
import { Banknote, Clock, Landmark, RotateCcw, Wallet } from "lucide-react";
import {
  Card,
  EmptyState,
  FilterTabs,
  OrderStatusBadge,
  PageHeader,
  Pagination,
  PaymentStatusBadge,
  StatCard,
  Td,
  Th,
} from "@/components/ui";
import { getPaymentSummary, getSettings, listTransactions } from "@/lib/queries";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_META, formatDateTime, formatINR } from "@/lib/format";
import type { PaymentStatus } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await ensureSeeded();
  const sp = await searchParams;
  const status = (Object.keys(PAYMENT_STATUS_META) as string[]).includes(sp.status ?? "")
    ? (sp.status as PaymentStatus)
    : "all";
  const page = Number(sp.page ?? 1) || 1;

  const [summary, result, settings] = await Promise.all([
    getPaymentSummary(),
    listTransactions({ status, page }),
    getSettings(),
  ]);

  const nextSettlement = new Date();
  nextSettlement.setDate(nextSettlement.getDate() + ((5 - nextSettlement.getDay() + 7) % 7 || 7));

  const buildHref = (overrides: { status?: string; page?: number }) => {
    const params = new URLSearchParams();
    const s = overrides.status ?? status;
    const p = overrides.page ?? page;
    if (s !== "all") params.set("status", s);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/payments${qs ? `?${qs}` : ""}`;
  };

  const tabs = [
    { key: "all", label: "All transactions", href: buildHref({ status: "all", page: 1 }) },
    ...(Object.keys(PAYMENT_STATUS_META) as PaymentStatus[]).map((s) => ({
      key: s,
      label: PAYMENT_STATUS_META[s].label,
      href: buildHref({ status: s, page: 1 }),
    })),
  ];

  return (
    <div>
      <PageHeader title="Payments & settlements" description="Track what's been paid, what's pending and what's been refunded." />

      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Settled to bank"
          value={formatINR(summary.settled)}
          icon={<Landmark className="h-5 w-5" />}
          accent="green"
          hint={`${formatINR(summary.thisWeek)} in the last 7 days`}
        />
        <StatCard
          label="In transit"
          value={formatINR(summary.inTransit)}
          icon={<Clock className="h-5 w-5" />}
          accent="blue"
          hint="Prepaid orders not yet delivered"
        />
        <StatCard
          label="COD to collect"
          value={formatINR(summary.codPending)}
          icon={<Banknote className="h-5 w-5" />}
          accent="amber"
          hint="Collected on delivery by courier"
        />
        <StatCard
          label="Refunded"
          value={formatINR(summary.refunded)}
          icon={<RotateCcw className="h-5 w-5" />}
          accent="purple"
          hint={`${summary.refundCount} refunds issued`}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Next settlement" subtitle="Payouts are released every Friday">
          <div className="rounded-md bg-gradient-to-br from-fk-green to-emerald-700 p-4 text-white">
            <p className="text-xs uppercase tracking-wide text-white/80">Estimated payout</p>
            <p className="mt-1 text-2xl font-semibold">{formatINR(summary.inTransit + summary.codPending * 0.6)}</p>
            <p className="mt-1 text-xs text-white/80">
              on{" "}
              {nextSettlement.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
                timeZone: "Asia/Kolkata",
              })}
            </p>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-fk-muted">
                <Wallet className="h-4 w-4" /> Bank account
              </dt>
              <dd className="font-mono text-xs">{settings.bankAccount || "Not added"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fk-muted">IFSC</dt>
              <dd className="font-mono text-xs">{settings.ifsc || "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fk-muted">UPI ID</dt>
              <dd className="font-mono text-xs">{settings.upiId || "—"}</dd>
            </div>
          </dl>
          <Link href="/settings" className="mt-4 inline-block text-sm font-semibold text-fk-blue hover:underline">
            Update payout details →
          </Link>
        </Card>

        <Card className="xl:col-span-2" padded={false} title="Transactions" subtitle="Every order payment event">
          <FilterTabs tabs={tabs} current={status} />
          {result.rows.length === 0 ? (
            <EmptyState title="No transactions" description="Nothing matches this filter yet." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Customer</Th>
                    <Th>Method</Th>
                    <Th>Order status</Th>
                    <Th>Payment</Th>
                    <Th align="right">Amount</Th>
                    <Th>Updated</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fk-border/60">
                  {result.rows.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <Td>
                        <Link href={`/orders/${t.id}`} className="font-semibold text-fk-blue hover:underline">
                          {t.orderNumber}
                        </Link>
                      </Td>
                      <Td>{t.customerName}</Td>
                      <Td className="text-xs">{PAYMENT_METHOD_LABEL[t.paymentMethod]}</Td>
                      <Td>
                        <OrderStatusBadge status={t.status} />
                      </Td>
                      <Td>
                        <PaymentStatusBadge status={t.paymentStatus} />
                      </Td>
                      <Td
                        align="right"
                        className={`font-semibold ${t.paymentStatus === "refunded" ? "text-red-600" : ""}`}
                      >
                        {t.paymentStatus === "refunded" ? "− " : ""}
                        {formatINR(t.total)}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-fk-muted">{formatDateTime(t.updatedAt)}</Td>
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
            buildHref={(p) => buildHref({ page: p })}
          />
        </Card>
      </section>
    </div>
  );
}
