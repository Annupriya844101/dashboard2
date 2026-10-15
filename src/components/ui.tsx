import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import type { OrderStatus, PaymentStatus, ProductStatus } from "@/db/schema";
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  PRODUCT_STATUS_META,
} from "@/lib/format";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-fk-border/70 bg-white shadow-card",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-fk-border/70 px-5 py-4">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold text-fk-text">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-fk-muted">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumb && (
          <nav className="mb-1 flex items-center gap-1 text-xs text-fk-muted">
            {breadcrumb.map((b, i) => (
              <span key={`${b.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {b.href ? (
                  <Link href={b.href} className="hover:text-fk-blue">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-fk-text">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold text-fk-text sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-fk-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-sm bg-fk-orange px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-cta transition hover:bg-fk-orange-dark disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-sm bg-fk-amber px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-cta transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60",
  blue: "inline-flex items-center justify-center gap-2 rounded-sm bg-fk-blue px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-fk-blue-dark disabled:cursor-not-allowed disabled:opacity-60",
  outline:
    "inline-flex items-center justify-center gap-2 rounded-sm border border-fk-border bg-white px-4 py-2 text-sm font-medium text-fk-text transition hover:border-fk-blue hover:text-fk-blue disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium text-fk-blue transition hover:bg-fk-blue-light disabled:cursor-not-allowed disabled:opacity-60",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-sm border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60",
};

export function Badge({
  children,
  className,
  dot,
}: {
  children: ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Badge className={meta.className} dot={meta.dot}>
      {meta.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const meta = PRODUCT_STATUS_META[status];
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function StockBadge({
  stock,
  threshold,
}: {
  stock: number;
  threshold: number;
}) {
  if (stock === 0)
    return (
      <Badge className="bg-red-50 text-red-700 ring-red-200" dot="bg-red-500">
        Out of stock
      </Badge>
    );
  if (stock <= threshold)
    return (
      <Badge className="bg-amber-50 text-amber-700 ring-amber-200" dot="bg-amber-500">
        Low · {stock} left
      </Badge>
    );
  return (
    <Badge className="bg-green-50 text-green-700 ring-green-200" dot="bg-green-600">
      In stock · {stock}
    </Badge>
  );
}

export function RatingPill({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-sm bg-fk-green px-1.5 py-0.5 text-[11px] font-semibold text-white">
      {rating.toFixed(1)} ★
    </span>
  );
}

export function ProductThumb({
  emoji,
  size = "md",
  className,
}: {
  emoji: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-base",
    md: "h-11 w-11 text-xl",
    lg: "h-16 w-16 text-3xl",
    xl: "h-28 w-28 text-6xl",
  };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-fk-border/70 bg-gradient-to-br from-slate-50 to-slate-100",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {emoji}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  accent = "blue",
  hint,
}: {
  label: string;
  value: ReactNode;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  accent?: "blue" | "orange" | "green" | "purple" | "amber" | "red";
  hint?: ReactNode;
}) {
  const accents = {
    blue: "bg-fk-blue-light text-fk-blue",
    orange: "bg-orange-50 text-fk-orange",
    green: "bg-green-50 text-fk-green",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  const positive = (change ?? 0) >= 0;
  return (
    <div className="animate-fade-up rounded-md border border-fk-border/70 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fk-muted">
            {label}
          </p>
          <p className="mt-1.5 truncate text-2xl font-semibold text-fk-text">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            accents[accent],
          )}
        >
          {icon}
        </div>
      </div>
      {(change !== undefined || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {change !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-semibold",
                positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {positive ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          )}
          <span className="text-fk-muted">{changeLabel ?? hint}</span>
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-fk-blue-light text-fk-blue">
        {icon ?? <span className="text-2xl">🛍️</span>}
      </div>
      <h3 className="text-base font-semibold text-fk-text">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-fk-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pageCount, page + 2); p++) {
    pages.push(p);
  }
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-fk-border/70 px-5 py-3 text-sm sm:flex-row">
      <p className="text-xs text-fk-muted">
        Showing <span className="font-semibold text-fk-text">{start}</span>–
        <span className="font-semibold text-fk-text">{end}</span> of{" "}
        <span className="font-semibold text-fk-text">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={buildHref(page - 1)} disabled={page <= 1} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </PageLink>
        {pages[0] > 1 && (
          <>
            <PageLink href={buildHref(1)}>1</PageLink>
            {pages[0] > 2 && <span className="px-1 text-fk-muted">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageLink key={p} href={buildHref(p)} active={p === page}>
            {p}
          </PageLink>
        ))}
        {pages[pages.length - 1] < pageCount && (
          <>
            {pages[pages.length - 1] < pageCount - 1 && (
              <span className="px-1 text-fk-muted">…</span>
            )}
            <PageLink href={buildHref(pageCount)}>{pageCount}</PageLink>
          </>
        )}
        <PageLink
          href={buildHref(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  ...rest
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const className = cn(
    "flex h-8 min-w-8 items-center justify-center rounded-sm px-2 text-sm transition",
    active
      ? "bg-fk-blue font-semibold text-white"
      : "text-fk-text hover:bg-fk-blue-light hover:text-fk-blue",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) {
    return (
      <span className={className} {...rest}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fk-muted first:pl-5 last:pr-5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-sm text-fk-text first:pl-5 last:pr-5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function FilterTabs({
  tabs,
  current,
}: {
  tabs: { key: string; label: string; href: string; count?: number }[];
  current: string;
}) {
  return (
    <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-fk-border/70 px-3">
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition",
              active
                ? "border-fk-blue text-fk-blue"
                : "border-transparent text-fk-muted hover:text-fk-text",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active ? "bg-fk-blue text-white" : "bg-slate-100 text-fk-muted",
                )}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export const inputStyles =
  "w-full rounded-sm border border-fk-border bg-white px-3 py-2 text-sm text-fk-text placeholder:text-fk-muted/80 focus:border-fk-blue focus:outline-none focus:ring-2 focus:ring-fk-blue/20 disabled:bg-slate-50";

export const labelStyles = "mb-1 block text-xs font-semibold text-fk-muted";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelStyles}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-fk-muted">{hint}</p>
      ) : null}
    </div>
  );
}
