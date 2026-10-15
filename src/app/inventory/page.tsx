import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, Boxes, CheckCircle2, Minus, PackageX, Plus } from "lucide-react";
import {
  Card,
  EmptyState,
  FilterTabs,
  PageHeader,
  ProductThumb,
  StatCard,
  StockBadge,
  Td,
  Th,
  buttonStyles,
  cn,
} from "@/components/ui";
import { SubmitButton } from "@/components/ConfirmButton";
import { listInventory } from "@/lib/queries";
import { adjustStock, setStock } from "@/lib/actions";
import { formatINR, formatNumber, timeAgo } from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await ensureSeeded();
  const sp = await searchParams;
  const filter = (["all", "low", "out", "healthy"] as const).includes(
    sp.filter as "all" | "low" | "out" | "healthy",
  )
    ? (sp.filter as "all" | "low" | "out" | "healthy")
    : "all";

  const [rows, all] = await Promise.all([listInventory(filter), listInventory("all")]);

  const healthy = all.filter((p) => p.stock > p.lowStockThreshold).length;
  const low = all.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const out = all.filter((p) => p.stock === 0).length;
  const value = all.reduce((s, p) => s + p.stock * p.price, 0);

  const tabs = [
    { key: "all", label: "All SKUs", href: "/inventory", count: all.length },
    { key: "healthy", label: "Healthy", href: "/inventory?filter=healthy", count: healthy },
    { key: "low", label: "Low stock", href: "/inventory?filter=low", count: low },
    { key: "out", label: "Out of stock", href: "/inventory?filter=out", count: out },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Keep stock levels accurate so you never miss a sale."
        actions={
          <Link href="/products/new" className={buttonStyles.primary}>
            <Plus className="h-4 w-4" /> Add product
          </Link>
        }
      />

      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Inventory value"
          value={formatINR(value)}
          icon={<Boxes className="h-5 w-5" />}
          accent="blue"
          hint={`${formatNumber(all.length)} SKUs tracked`}
        />
        <StatCard
          label="Healthy stock"
          value={formatNumber(healthy)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="green"
          hint="Above reorder level"
        />
        <StatCard
          label="Low stock"
          value={formatNumber(low)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="amber"
          hint="At or below reorder level"
        />
        <StatCard
          label="Out of stock"
          value={formatNumber(out)}
          icon={<PackageX className="h-5 w-5" />}
          accent="red"
          hint="Losing sales right now"
        />
      </section>

      <Card padded={false}>
        <FilterTabs tabs={tabs} current={filter} />
        {rows.length === 0 ? (
          <EmptyState title="Nothing here" description="No products match this stock filter." />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th align="center">Sold (30d)</Th>
                  <Th align="center">Days of cover</Th>
                  <Th>Stock level</Th>
                  <Th>Quick adjust</Th>
                  <Th>Set exact</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fk-border/60">
                {rows.map((p) => {
                  const dailyRate = p.sold30 / 30;
                  const cover = dailyRate > 0 ? Math.round(p.stock / dailyRate) : null;
                  const pct = Math.min(100, (p.stock / Math.max(1, p.lowStockThreshold * 5)) * 100);
                  return (
                    <tr key={p.id} className={cn("hover:bg-slate-50/70", p.stock === 0 && "bg-red-50/30")}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <ProductThumb emoji={p.emoji} size="sm" />
                          <div className="min-w-0 max-w-[260px]">
                            <Link href={`/products/${p.id}/edit`} className="block truncate font-medium hover:text-fk-blue">
                              {p.name}
                            </Link>
                            <p className="text-[11px] text-fk-muted">{p.sku}</p>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-fk-muted">{p.categoryName}</Td>
                      <Td align="center">{p.sold30}</Td>
                      <Td align="center">
                        {cover === null ? (
                          <span className="text-fk-muted">—</span>
                        ) : (
                          <span className={cn("font-semibold", cover < 7 ? "text-red-600" : cover < 21 ? "text-amber-600" : "text-fk-green")}>
                            {cover}d
                          </span>
                        )}
                      </Td>
                      <Td>
                        <StockBadge stock={p.stock} threshold={p.lowStockThreshold} />
                        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              p.stock === 0 ? "bg-red-500" : p.stock <= p.lowStockThreshold ? "bg-amber-500" : "bg-fk-green",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <form action={adjustStock}>
                            <input type="hidden" name="productId" value={p.id} />
                            <input type="hidden" name="delta" value={-1} />
                            <input type="hidden" name="reason" value="Damaged / adjustment" />
                            <SubmitButton className="flex h-8 w-8 items-center justify-center rounded-sm border border-fk-border text-fk-text hover:border-fk-blue hover:text-fk-blue disabled:opacity-50" pendingText="…">
                              <Minus className="h-3.5 w-3.5" />
                            </SubmitButton>
                          </form>
                          <form action={adjustStock}>
                            <input type="hidden" name="productId" value={p.id} />
                            <input type="hidden" name="delta" value={10} />
                            <input type="hidden" name="reason" value="Restock" />
                            <SubmitButton className="flex h-8 items-center gap-1 rounded-sm border border-fk-border px-2 text-xs font-semibold text-fk-text hover:border-fk-blue hover:text-fk-blue disabled:opacity-50" pendingText="…">
                              <Plus className="h-3.5 w-3.5" /> 10
                            </SubmitButton>
                          </form>
                          <form action={adjustStock}>
                            <input type="hidden" name="productId" value={p.id} />
                            <input type="hidden" name="delta" value={50} />
                            <input type="hidden" name="reason" value="Restock" />
                            <SubmitButton className="flex h-8 items-center gap-1 rounded-sm border border-fk-border px-2 text-xs font-semibold text-fk-text hover:border-fk-blue hover:text-fk-blue disabled:opacity-50" pendingText="…">
                              <Plus className="h-3.5 w-3.5" /> 50
                            </SubmitButton>
                          </form>
                        </div>
                      </Td>
                      <Td>
                        <form action={setStock} className="flex items-center gap-1">
                          <input type="hidden" name="productId" value={p.id} />
                          <input
                            type="number"
                            name="stock"
                            min={0}
                            defaultValue={p.stock}
                            className="h-8 w-20 rounded-sm border border-fk-border px-2 text-sm focus:border-fk-blue focus:outline-none"
                          />
                          <SubmitButton className="h-8 rounded-sm bg-fk-blue px-2.5 text-xs font-semibold text-white hover:bg-fk-blue-dark disabled:opacity-50" pendingText="…">
                            Save
                          </SubmitButton>
                        </form>
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-fk-muted">{timeAgo(p.updatedAt)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
