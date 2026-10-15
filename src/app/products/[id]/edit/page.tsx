import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, PageHeader, ProductStatusBadge, StockBadge, buttonStyles } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ProductForm } from "@/components/ProductForm";
import { deleteProduct, updateProduct } from "@/lib/actions";
import { getProductById, getProductSales, listCategories } from "@/lib/queries";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(Number(id));
  return { title: product ? `Edit · ${product.name}` : "Edit product" };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureSeeded();
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const [product, categories] = await Promise.all([
    getProductById(productId),
    listCategories(),
  ]);
  if (!product) notFound();
  const sales = await getProductSales(productId);

  const action = updateProduct.bind(null, productId);

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Products", href: "/products" }, { label: product.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {product.name}
            <ProductStatusBadge status={product.status} />
          </span>
        }
        description={`SKU ${product.sku} · Listed on ${formatDate(product.createdAt)}`}
        actions={
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={product.id} />
            <ConfirmButton
              className={buttonStyles.danger}
              confirmText={`Delete "${product.name}"? If it has order history it will be archived instead.`}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </ConfirmButton>
          </form>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4" padded={false}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fk-muted">Units sold</p>
          <p className="mt-1 text-xl font-semibold">{formatNumber(sales.unitsSold)}</p>
        </Card>
        <Card className="p-4" padded={false}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fk-muted">Revenue</p>
          <p className="mt-1 text-xl font-semibold">{formatINR(sales.revenue)}</p>
        </Card>
        <Card className="p-4" padded={false}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fk-muted">Orders</p>
          <p className="mt-1 text-xl font-semibold">{formatNumber(sales.orderCount)}</p>
        </Card>
        <Card className="p-4" padded={false}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fk-muted">Stock</p>
          <div className="mt-1.5">
            <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
          </div>
        </Card>
      </div>

      <ProductForm
        action={action}
        categories={categories}
        submitLabel="Save changes"
        initial={{
          name: product.name,
          sku: product.sku,
          brand: product.brand,
          description: product.description,
          emoji: product.emoji,
          categoryId: product.categoryId,
          price: product.price,
          mrp: product.mrp,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          status: product.status,
        }}
      />
    </div>
  );
}
