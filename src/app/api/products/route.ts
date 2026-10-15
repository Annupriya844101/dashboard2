import { NextRequest } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { listProducts } from "@/lib/queries";
import { ensureSeeded } from "@/lib/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensureSeeded();
  const params = request.nextUrl.searchParams;
  const result = await listProducts({
    q: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
    page: Number(params.get("page") ?? 1) || 1,
    pageSize: Math.min(100, Number(params.get("pageSize") ?? 20) || 20),
  });
  return Response.json(result);
}

/**
 * Minimal JSON create endpoint, e.g. for bulk import tooling:
 * { name, sku, categorySlug, price, mrp?, stock?, brand?, description?, emoji? }
 */
export async function POST(request: NextRequest) {
  await ensureSeeded();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const sku = String(body.sku ?? "").trim().toUpperCase();
  const categorySlug = String(body.categorySlug ?? "").trim();
  const price = Number(body.price);
  const mrp = body.mrp !== undefined ? Number(body.mrp) : price;
  const stock = body.stock !== undefined ? Number(body.stock) : 0;

  if (name.length < 3 || sku.length < 3 || !categorySlug || !Number.isFinite(price) || price < 0) {
    return Response.json(
      { error: "name, sku, categorySlug and a valid price are required" },
      { status: 422 },
    );
  }

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, categorySlug));
  if (!category) {
    return Response.json({ error: `Unknown category "${categorySlug}"` }, { status: 422 });
  }

  const existing = await db.select({ id: products.id }).from(products).where(eq(products.sku, sku));
  if (existing.length) {
    return Response.json({ error: "SKU already exists" }, { status: 409 });
  }

  const [created] = await db
    .insert(products)
    .values({
      name,
      sku,
      brand: String(body.brand ?? ""),
      description: String(body.description ?? ""),
      emoji: String(body.emoji ?? "📦").slice(0, 8),
      categoryId: category.id,
      price,
      mrp: Number.isFinite(mrp) && mrp >= price ? mrp : price,
      stock: Number.isInteger(stock) && stock >= 0 ? stock : 0,
      status: "active",
    })
    .returning();

  return Response.json(created, { status: 201 });
}
