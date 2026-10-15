import Link from "next/link";
import type { Metadata } from "next";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Card,
  EmptyState,
  FilterTabs,
  PageHeader,
  Pagination,
  ProductStatusBadge,
  ProductThumb,
  RatingPill,
  StockBadge,
  Td,
  Th,
  buttonStyles,
  inputStyles,
} from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { listCategories, listProducts } from "@/lib/queries";
import { deleteProduct } from "@/lib/actions";
import { discountPercent, formatINR, formatNumber } from "@/lib/format";
import type { ProductStatus } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products" };

type SP = {
  q?: string;
  category?: string;
  status?: string;
  stock?: string;
  page?: string;
  created?: string;
  updated?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await ensureSeeded();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const category = sp.category ?? "all";
  const status = (["active", "draft", "archived"] as string[]).includes(sp.status ?? "")
    ? (sp.status as ProductStatus)
    : "all";
  const stock = (["low", "out"] as string[]).includes(sp.stock ?? "")
    ? (sp.stock as "low" | "out")
    : "all";
  const page = Number(sp.page ?? 1) || 1;

  const [result, categories] = await Promise.all([
    listProducts({ q, category, status, stock, page }),
    listCategories(),
  ]);

  const buildHref = (overrides: Partial<SP>) => {
    const merged = { q, category, status, stock, page: String(page), ...overrides };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.category && merged.category !== "all") params.set("category", merged.category);
    if (merged.status && merged.status !== "all") params.set("status", merged.status);
    if (merged.stock && merged.stock !== "all") params.set("stock", merged.stock);
    if (merged.page && merged.page !== "1") params.set("page", merged.page);
    const s = params.toString();
    return `/products${s ? `?${s}` : ""}`;
  };

  const tabs = [
    { key: "all", label: "All products", href: buildHref({ status: "all", stock: "all", page: "1" }) },
    { key: "active", label: "Active", href: buildHref({ status: "active", stock: "all", page: "1" }) },
    { key: "draft", label: "Draft", href: buildHref({ status: "draft", stock: "all", page: "1" }) },
    { key: "archived", label: "Archived", href: buildHref({ status: "archived", stock: "all", page: "1" }) },
    { key: "low", label: "Low stock", href: buildHref({ status: "all", stock: "low", page: "1" }) },
    { key: "out", label: "Out of stock", href: buildHref({ status: "all", stock: "out", page: "1" }) },
  ];
  const currentTab = stock !== "all" ? stock : status;

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${formatNumber(result.total)} listings in your catalogue.`}
        actions={
          <Link href="/products/new" className={buttonStyles.primary}>
            <Plus className="h-4 w-4" /> Add new product
          </Link>
        }
      />

      {(sp.created || sp.updated) && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Product {sp.created ? "listed" : "updated"} successfully.{" "}
          <Link
            href={`/products/${sp.created ?? sp.updated}/edit`}
            className="font-semibold underline"
          >
            View listing
          </Link>
        </div>
      )}

      <Card padded={false}>
        <FilterTabs tabs={tabs} current={currentTab} />

        <form className="flex flex-col gap-2 border-b border-fk-border/70 px-5 py-3 sm:flex-row sm:items-center">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          {stock !== "all" && <input type="hidden" name="stock" value={stock} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fk-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name, brand or SKU"
              className={`${inputStyles} pl-9`}
            />
          </div>
          <select name="category" defaultValue={category} className={`${inputStyles} sm:w-56`}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.icon} {c.name} ({c.productCount})
              </option>
            ))}
          </select>
          <button type="submit" className={buttonStyles.blue}>
            Filter
          </button>
          {(q || category !== "all") && (
            <Link href={buildHref({ q: "", category: "all", page: "1" })} className={buttonStyles.ghost}>
              Clear
            </Link>
          )}
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No products match"
            description="Adjust the filters or list a new product."
            action={
              <Link href="/products/new" className={buttonStyles.primary}>
                <Plus className="h-4 w-4" /> Add product
              </Link>
            }
          />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th align="right">Price</Th>
                  <Th>Stock</Th>
                  <Th align="center">Sold</Th>
                  <Th>Rating</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fk-border/60">
                {result.rows.map((p) => {
                  const off = discountPercent(p.price, p.mrp);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <Td>
                        <div className="flex items-center gap-3">
                          <ProductThumb emoji={p.emoji} />
                          <div className="min-w-0 max-w-[280px]">
                            <Link
                              href={`/products/${p.id}/edit`}
                              className="block truncate font-medium hover:text-fk-blue"
                            >
                              {p.name}
                            </Link>
                            <p className="text-[11px] text-fk-muted">
                              {p.brand} · {p.sku}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-fk-muted">{p.categoryName}</Td>
                      <Td align="right">
                        <p className="font-semibold">{formatINR(p.price)}</p>
                        {off > 0 && (
                          <p className="text-[11px] text-fk-muted">
                            <s>{formatINR(p.mrp)}</s>{" "}
                            <span className="font-semibold text-fk-green">{off}% off</span>
                          </p>
                        )}
                      </Td>
                      <Td>
                        <StockBadge stock={p.stock} threshold={p.lowStockThreshold} />
                      </Td>
                      <Td align="center">{p.unitsSold}</Td>
                      <Td>
                        <RatingPill rating={p.rating} />
                      </Td>
                      <Td>
                        <ProductStatusBadge status={p.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${p.id}/edit`}
                            className={buttonStyles.ghost}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </Link>
                          <form action={deleteProduct}>
                            <input type="hidden" name="id" value={p.id} />
                            <ConfirmButton
                              className="inline-flex items-center justify-center rounded-sm p-1.5 text-fk-muted transition hover:bg-red-50 hover:text-red-600"
                              confirmText={`Delete "${p.name}"? If it has order history it will be archived instead.`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </ConfirmButton>
                          </form>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
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
