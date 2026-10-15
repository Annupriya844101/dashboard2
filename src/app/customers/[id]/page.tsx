import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  Card,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
  Td,
  Th,
  buttonStyles,
} from "@/components/ui";
import { getCustomerById } from "@/lib/queries";
import { PAYMENT_METHOD_LABEL, formatDate, formatDateTime, formatINR } from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getCustomerById(Number(id));
  return { title: data ? data.customer.name : "Customer" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureSeeded();
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();
  const data = await getCustomerById(customerId);
  if (!data) notFound();
  const { customer, orders, totalSpent } = data;

  const delivered = orders.filter((o) => o.status === "delivered").length;
  const returned = orders.filter((o) => o.status === "returned" || o.status === "cancelled").length;
  const aov = orders.length ? totalSpent / Math.max(1, orders.length - returned) : 0;

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Customers", href: "/customers" }, { label: customer.name }]}
        title={customer.name}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <Link href="/customers" className={buttonStyles.outline}>
            Back to customers
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <Card title="Contact details">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-fk-muted" />
                <a href={`mailto:${customer.email}`} className="text-fk-blue hover:underline">
                  {customer.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-fk-muted" />
                {customer.phone || "—"}
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-fk-muted" />
                <span>
                  {customer.city}, {customer.state}
                  {customer.pincode && ` – ${customer.pincode}`}
                </span>
              </li>
            </ul>
          </Card>

          <Card title="Lifetime value">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-fk-muted">Total spent</p>
                <p className="mt-1 text-lg font-semibold">{formatINR(totalSpent)}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-fk-muted">Orders</p>
                <p className="mt-1 text-lg font-semibold">{orders.length}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-fk-muted">Delivered</p>
                <p className="mt-1 text-lg font-semibold">{delivered}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-fk-muted">Avg. order</p>
                <p className="mt-1 text-lg font-semibold">{formatINR(aov)}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card
          className="xl:col-span-2"
          padded={false}
          title="Order history"
          subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} placed`}
        >
          {orders.length === 0 ? (
            <EmptyState title="No orders yet" description="This customer hasn't placed an order." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Date</Th>
                    <Th align="center">Items</Th>
                    <Th>Payment</Th>
                    <Th>Status</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fk-border/60">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70">
                      <Td>
                        <Link href={`/orders/${o.id}`} className="font-semibold text-fk-blue hover:underline">
                          {o.orderNumber}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-fk-muted">{formatDateTime(o.createdAt)}</Td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
