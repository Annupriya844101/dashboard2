import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/ProductForm";
import { createProduct } from "@/lib/actions";
import { getSettings, listCategories } from "@/lib/queries";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await ensureSeeded();
  const [categories, settings] = await Promise.all([listCategories(), getSettings()]);

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Products", href: "/products" }, { label: "Add new product" }]}
        title="Add new product"
        description="Create a new listing for your store."
      />
      <ProductForm
        action={createProduct}
        categories={categories}
        submitLabel="Publish listing"
        initial={{
          name: "",
          sku: "",
          brand: "",
          description: "",
          emoji: "📦",
          categoryId: "",
          price: "",
          mrp: "",
          stock: "",
          lowStockThreshold: settings.lowStockThreshold,
          status: "active",
        }}
      />
    </div>
  );
}
