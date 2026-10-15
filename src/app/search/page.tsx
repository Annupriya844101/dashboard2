import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import {
  Card,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  ProductThumb,
  StockBadge,
  buttonStyles,
  inputStyles,
} from "@/components/ui";
import { searchAll } from "@/lib/queries";
import { formatDate, formatINR } from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await ensureSeeded();
  const { q = "" } = await searchParams;
  const term = q.trim();
  const results = term.length >= 2 ? await searchAll(term) : null;
  const total = results
    ? results.orders.length + results.products.length + results.customers.length
    : 0;

  return (
    <div>
      <PageHeader
        title="Search"
        description={term ? `${total} result${total === 1 ? "" : "s"} for “${term}”` : "Find orders, products and customers."}
      />

      <form className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fk-muted" />
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="Order ID, product name, SKU, customer, city…"
            className={`${inputStyles} pl-9`}
            autoFocus
          />
        </div>
        <button type="submit" className={buttonStyles.blue}>
          Search
        </button>
      </form>

      {!results ? (
        <Card>
          <EmptyState title="Start typing to search" description="Enter at least 2 characters." />
        </Card>
      ) : total === 0 ? (
        <Card>
          <EmptyState title="No matches" description="Try a different keyword or check the spelling." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card padded={false} title={`Orders (${results.orders.length})`}>
            <ul className="divide-y divide-fk-border/60">
              {results.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-fk-blue">{o.orderNumber}</p>
                      <p className="text-xs text-fk-muted">
                        {o.customerName} · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatINR(o.total)}</p>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
              {results.orders.length === 0 && <li className="px-5 py-4 text-sm text-fk-muted">No orders</li>}
            </ul>
          </Card>

          <Card padded={false} title={`Products (${results.products.length})`}>
            <ul className="divide-y divide-fk-border/60">
              {results.products.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.id}/edit`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <ProductThumb emoji={p.emoji} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-fk-muted">{p.sku} · {formatINR(p.price)}</p>
                    </div>
                    <StockBadge stock={p.stock} threshold={10} />
                  </Link>
                </li>
              ))}
              {results.products.length === 0 && <li className="px-5 py-4 text-sm text-fk-muted">No products</li>}
            </ul>
          </Card>

          <Card padded={false} title={`Customers (${results.customers.length})`}>
            <ul className="divide-y divide-fk-border/60">
              {results.customers.map((c) => (
                <li key={c.id}>
                  <Link href={`/customers/${c.id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-fk-muted">{c.email} · {c.city}</p>
                  </Link>
                </li>
              ))}
              {results.customers.length === 0 && <li className="px-5 py-4 text-sm text-fk-muted">No customers</li>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
