import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Check,
  CreditCard,
  MapPin,
  Package,
  PackageCheck,
  Printer,
  Truck,
  User,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
  ProductThumb,
  Td,
  Th,
  buttonStyles,
  cn,
  inputStyles,
} from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/ConfirmButton";
import { getOrderById } from "@/lib/queries";
import { saveOrderNote, updateOrderStatus } from "@/lib/actions";
import {
  ORDER_STATUS_META,
  PAYMENT_METHOD_LABEL,
  formatDateTime,
  formatINR,
  nextOrderStatuses,
} from "@/lib/format";
import type { OrderStatus } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderById(Number(id));
  return { title: order ? `Order ${order.orderNumber}` : "Order" };
}

const TIMELINE: { status: OrderStatus; label: string; icon: typeof Package }[] = [
  { status: "pending", label: "Order placed", icon: Package },
  { status: "processing", label: "Packed", icon: PackageCheck },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: Check },
];

const ACTION_META: Record<
  OrderStatus,
  { label: string; className: string; confirm?: string; icon: typeof Package }
> = {
  pending: { label: "Mark pending", className: buttonStyles.outline, icon: Package },
  processing: { label: "Accept & pack", className: buttonStyles.blue, icon: PackageCheck },
  shipped: { label: "Mark as shipped", className: buttonStyles.secondary, icon: Truck },
  delivered: { label: "Mark as delivered", className: buttonStyles.primary, icon: Check },
  cancelled: {
    label: "Cancel order",
    className: buttonStyles.danger,
    confirm: "Cancel this order? Items will be returned to stock and any prepaid amount refunded.",
    icon: XCircle,
  },
  returned: {
    label: "Process return",
    className: buttonStyles.danger,
    confirm: "Mark this order as returned? The payment will be refunded and stock restored.",
    icon: RotateCcw,
  },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureSeeded();
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();
  const order = await getOrderById(orderId);
  if (!order) notFound();

  const nextStatuses = nextOrderStatuses(order.status);
  const currentIndex = TIMELINE.findIndex((t) => t.status === order.status);
  const terminalNegative = order.status === "cancelled" || order.status === "returned";
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Orders", href: "/orders" }, { label: order.orderNumber }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Order {order.orderNumber}
            <OrderStatusBadge status={order.status} />
          </span>
        }
        description={`Placed on ${formatDateTime(order.createdAt)} · ${itemCount} item${itemCount > 1 ? "s" : ""}`}
        actions={
          <>
            <Link href="/orders" className={buttonStyles.outline}>
              Back to orders
            </Link>
            <button type="button" className={buttonStyles.outline} disabled title="Print invoice">
              <Printer className="h-4 w-4" /> Invoice
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* Timeline */}
          <Card title="Fulfilment progress">
            {terminalNegative ? (
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-3 text-sm",
                  order.status === "cancelled"
                    ? "bg-red-50 text-red-700"
                    : "bg-purple-50 text-purple-700",
                )}
              >
                {order.status === "cancelled" ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
                <div>
                  <p className="font-semibold">
                    This order was {ORDER_STATUS_META[order.status].label.toLowerCase()}
                  </p>
                  <p className="text-xs opacity-80">
                    Last updated {formatDateTime(order.updatedAt)} · Payment{" "}
                    {order.paymentStatus === "refunded" ? "refunded to customer" : "not collected"}
                  </p>
                </div>
              </div>
            ) : (
              <ol className="relative grid grid-cols-4 gap-2">
                {TIMELINE.map((step, i) => {
                  const done = i <= currentIndex;
                  const Icon = step.icon;
                  return (
                    <li key={step.status} className="relative flex flex-col items-center text-center">
                      {i < TIMELINE.length - 1 && (
                        <span
                          className={cn(
                            "absolute left-1/2 top-4 h-0.5 w-full",
                            i < currentIndex ? "bg-fk-green" : "bg-slate-200",
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2",
                          done
                            ? "border-fk-green bg-fk-green text-white"
                            : "border-slate-200 bg-white text-slate-300",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span
                        className={cn(
                          "mt-2 text-xs font-medium",
                          done ? "text-fk-text" : "text-fk-muted",
                        )}
                      >
                        {step.label}
                      </span>
                      {step.status === "delivered" && order.deliveredAt && (
                        <span className="text-[10px] text-fk-muted">
                          {formatDateTime(order.deliveredAt)}
                        </span>
                      )}
                      {step.status === "pending" && (
                        <span className="text-[10px] text-fk-muted">
                          {formatDateTime(order.createdAt)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {nextStatuses.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-fk-border/70 pt-4">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-fk-muted">
                  Actions
                </span>
                {nextStatuses.map((s) => {
                  const meta = ACTION_META[s];
                  const Icon = meta.icon;
                  return (
                    <form key={s} action={updateOrderStatus}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="status" value={s} />
                      <ConfirmButton
                        className={meta.className}
                        confirmText={meta.confirm}
                        pendingText="Updating…"
                      >
                        <Icon className="h-4 w-4" />
                        {meta.label}
                      </ConfirmButton>
                    </form>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Items */}
          <Card padded={false} title="Items in this order">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th align="right">Price</Th>
                    <Th align="center">Qty</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fk-border/60">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <ProductThumb emoji={item.product?.emoji ?? "📦"} />
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.productId}/edit`}
                              className="block truncate font-medium hover:text-fk-blue"
                            >
                              {item.productName}
                            </Link>
                            <p className="text-[11px] text-fk-muted">
                              SKU {item.product?.sku ?? "—"}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td align="right">{formatINR(item.unitPrice)}</Td>
                      <Td align="center">{item.quantity}</Td>
                      <Td align="right" className="font-semibold">
                        {formatINR(item.lineTotal)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-fk-border/70 px-5 py-4">
              <dl className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-fk-muted">Subtotal</dt>
                  <dd>{formatINR(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fk-muted">Shipping</dt>
                  <dd className={order.shippingFee === 0 ? "text-fk-green" : ""}>
                    {order.shippingFee === 0 ? "FREE" : formatINR(order.shippingFee)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-fk-muted">Discount</dt>
                  <dd className={order.discount > 0 ? "text-fk-green" : ""}>
                    {order.discount > 0 ? `− ${formatINR(order.discount)}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-dashed border-fk-border pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatINR(order.total)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Notes */}
          <Card title="Internal notes" subtitle="Visible only to your team">
            <form action={saveOrderNote} className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <textarea
                name="notes"
                rows={3}
                defaultValue={order.notes}
                placeholder="e.g. Customer requested delivery after 6 PM"
                className={inputStyles}
              />
              <div className="flex justify-end">
                <SubmitButton className={buttonStyles.blue}>Save note</SubmitButton>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Customer">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fk-blue-light text-fk-blue">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0 text-sm">
                <Link
                  href={`/customers/${order.customer.id}`}
                  className="font-semibold text-fk-blue hover:underline"
                >
                  {order.customer.name}
                </Link>
                <p className="truncate text-fk-muted">{order.customer.email}</p>
                <p className="text-fk-muted">{order.customer.phone}</p>
              </div>
            </div>
          </Card>

          <Card title="Delivery address">
            <div className="flex items-start gap-3 text-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-fk-orange">
                <MapPin className="h-5 w-5" />
              </span>
              <p className="leading-relaxed text-fk-text">{order.shippingAddress}</p>
            </div>
          </Card>

          <Card title="Payment">
            <div className="flex items-start gap-3 text-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-fk-green">
                <CreditCard className="h-5 w-5" />
              </span>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-fk-muted">Method</span>
                  <span className="font-medium">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-fk-muted">Status</span>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-fk-muted">Amount</span>
                  <span className="font-semibold">{formatINR(order.total)}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Order summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-fk-muted">Order ID</dt>
                <dd className="font-mono text-xs">{order.orderNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fk-muted">Placed</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fk-muted">Last update</dt>
                <dd>{formatDateTime(order.updatedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fk-muted">Delivered</dt>
                <dd>{formatDateTime(order.deliveredAt)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
