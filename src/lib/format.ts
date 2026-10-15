import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
} from "@/db/schema";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num = new Intl.NumberFormat("en-IN");

export function formatINR(value: number, precise = false) {
  return precise ? inrPrecise.format(value) : inr.format(value);
}

/** Indian compact notation: 1.2L, 3.4Cr, 12K */
export function formatCompactINR(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatNumber(value: number) {
  return num.format(value);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function timeAgo(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return formatDate(d);
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; dot: string; color: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
    color: "#94a3b8",
  },
  processing: {
    label: "Processing",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    color: "#f59e0b",
  },
  shipped: {
    label: "Shipped",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
    color: "#2874f0",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-50 text-green-700 ring-green-200",
    dot: "bg-green-600",
    color: "#388e3c",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
    color: "#ef4444",
  },
  returned: {
    label: "Returned",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
    dot: "bg-purple-500",
    color: "#a855f7",
  },
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI",
  cod: "Cash on Delivery",
  card: "Credit/Debit Card",
  netbanking: "Net Banking",
  wallet: "Wallet",
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  paid: { label: "Paid", className: "bg-green-50 text-green-700 ring-green-200" },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  refunded: {
    label: "Refunded",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
  },
  failed: {
    label: "Not collected",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
};

export const PRODUCT_STATUS_META: Record<
  ProductStatus,
  { label: string; className: string }
> = {
  active: { label: "Active", className: "bg-green-50 text-green-700 ring-green-200" },
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  archived: {
    label: "Archived",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
};

/** Allowed forward transitions for an order. */
export function nextOrderStatuses(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["processing", "cancelled"];
    case "processing":
      return ["shipped", "cancelled"];
    case "shipped":
      return ["delivered", "cancelled"];
    case "delivered":
      return ["returned"];
    default:
      return [];
  }
}

export function discountPercent(price: number, mrp: number) {
  if (mrp <= 0 || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}
