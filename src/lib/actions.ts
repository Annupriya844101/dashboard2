"use server";

import { db } from "@/db";
import {
  activityLogs,
  orderItems,
  orders,
  products,
  storeSettings,
  type OrderStatus,
  type PaymentStatus,
  type ProductStatus,
} from "@/db/schema";
import { ORDER_STATUSES, nextOrderStatuses } from "@/lib/format";
import { seedDatabase } from "@/lib/seed";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberField(formData: FormData, key: string) {
  const raw = str(formData, key);
  if (raw === "") return NaN;
  return Number(raw);
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export async function updateOrderStatus(formData: FormData): Promise<void> {
  const orderId = Number(formData.get("orderId"));
  const status = String(formData.get("status")) as OrderStatus;
  if (!Number.isInteger(orderId) || !ORDER_STATUSES.includes(status)) return;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;
  if (!nextOrderStatuses(order.status).includes(status)) return;

  let paymentStatus: PaymentStatus = order.paymentStatus;
  if (status === "delivered") paymentStatus = "paid";
  if (status === "returned") paymentStatus = "refunded";
  if (status === "cancelled") {
    paymentStatus = order.paymentMethod === "cod" ? "failed" : "refunded";
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status,
        paymentStatus,
        updatedAt: new Date(),
        deliveredAt: status === "delivered" ? new Date() : order.deliveredAt,
      })
      .where(eq(orders.id, orderId));

    // Restock items on cancellation / return so inventory stays truthful.
    if (status === "cancelled" || status === "returned") {
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      for (const item of items) {
        await tx
          .update(products)
          .set({
            stock: sql`${products.stock} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }
    }

    await tx.insert(activityLogs).values({
      type: "order",
      message: `Order ${order.orderNumber} marked as ${status}`,
      href: `/orders/${orderId}`,
    });
  });

  revalidateAll();
}

export async function saveOrderNote(formData: FormData): Promise<void> {
  const orderId = Number(formData.get("orderId"));
  const notes = str(formData, "notes").slice(0, 1000);
  if (!Number.isInteger(orderId)) return;
  await db
    .update(orders)
    .set({ notes, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  revalidatePath(`/orders/${orderId}`);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
function parseProductForm(formData: FormData) {
  const fieldErrors: Record<string, string> = {};
  const name = str(formData, "name");
  const sku = str(formData, "sku").toUpperCase();
  const brand = str(formData, "brand");
  const description = str(formData, "description");
  const emoji = str(formData, "emoji") || "📦";
  const categoryId = Number(formData.get("categoryId"));
  const price = numberField(formData, "price");
  const mrpRaw = numberField(formData, "mrp");
  const stock = numberField(formData, "stock");
  const lowStockThreshold = numberField(formData, "lowStockThreshold");
  const status = str(formData, "status") as ProductStatus;

  if (name.length < 3) fieldErrors.name = "Product name must be at least 3 characters.";
  if (sku.length < 3) fieldErrors.sku = "SKU must be at least 3 characters.";
  if (!Number.isInteger(categoryId) || categoryId <= 0)
    fieldErrors.categoryId = "Please choose a category.";
  if (!Number.isFinite(price) || price < 0)
    fieldErrors.price = "Enter a valid selling price.";
  const mrp = Number.isFinite(mrpRaw) && mrpRaw > 0 ? mrpRaw : price;
  if (Number.isFinite(price) && mrp < price)
    fieldErrors.mrp = "MRP cannot be lower than the selling price.";
  if (!Number.isInteger(stock) || stock < 0)
    fieldErrors.stock = "Stock must be a whole number ≥ 0.";
  if (!["active", "draft", "archived"].includes(status))
    fieldErrors.status = "Invalid status.";

  return {
    fieldErrors,
    values: {
      name,
      sku,
      brand,
      description,
      emoji: emoji.slice(0, 8),
      categoryId,
      price,
      mrp,
      stock,
      lowStockThreshold:
        Number.isInteger(lowStockThreshold) && lowStockThreshold >= 0
          ? lowStockThreshold
          : 10,
      status,
    },
  };
}

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { fieldErrors, values } = parseProductForm(formData);
  if (Object.keys(fieldErrors).length) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, values.sku));
  if (existing.length) {
    return {
      error: "SKU already exists.",
      fieldErrors: { sku: "A product with this SKU already exists." },
    };
  }

  const [created] = await db.insert(products).values(values).returning();
  await db.insert(activityLogs).values({
    type: "product",
    message: `New product listed: ${created.name}`,
    href: `/products/${created.id}/edit`,
  });

  revalidateAll();
  redirect(`/products?created=${created.id}`);
}

export async function updateProduct(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { fieldErrors, values } = parseProductForm(formData);
  if (Object.keys(fieldErrors).length) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const clash = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sku, values.sku));
  if (clash.some((c) => c.id !== id)) {
    return {
      error: "SKU already exists.",
      fieldErrors: { sku: "Another product already uses this SKU." },
    };
  }

  await db
    .update(products)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(products.id, id));
  await db.insert(activityLogs).values({
    type: "product",
    message: `Product updated: ${values.name}`,
    href: `/products/${id}/edit`,
  });

  revalidateAll();
  redirect(`/products?updated=${id}`);
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return;

  const [{ used }] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(orderItems)
    .where(eq(orderItems.productId, id));

  if (used > 0) {
    // Keep order history intact – archive instead of hard delete.
    await db
      .update(products)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(products.id, id));
    await db.insert(activityLogs).values({
      type: "product",
      message: `Product archived (has order history): ${product.name}`,
      href: `/products`,
    });
  } else {
    await db.delete(products).where(eq(products.id, id));
    await db.insert(activityLogs).values({
      type: "product",
      message: `Product deleted: ${product.name}`,
      href: `/products`,
    });
  }

  revalidateAll();
}

export async function toggleProductStatus(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const status = str(formData, "status") as ProductStatus;
  if (!Number.isInteger(id) || !["active", "draft", "archived"].includes(status))
    return;
  await db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(eq(products.id, id));
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export async function adjustStock(formData: FormData): Promise<void> {
  const id = Number(formData.get("productId"));
  const delta = Number(formData.get("delta"));
  const reason = str(formData, "reason") || "Manual adjustment";
  if (!Number.isInteger(id) || !Number.isInteger(delta) || delta === 0) return;

  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return;

  const newStock = Math.max(0, product.stock + delta);
  await db
    .update(products)
    .set({ stock: newStock, updatedAt: new Date() })
    .where(eq(products.id, id));
  await db.insert(activityLogs).values({
    type: "inventory",
    message: `${reason}: ${product.name} stock ${delta > 0 ? "+" : ""}${delta} → ${newStock}`,
    href: "/inventory",
  });

  revalidateAll();
}

export async function setStock(formData: FormData): Promise<void> {
  const id = Number(formData.get("productId"));
  const stock = Number(formData.get("stock"));
  if (!Number.isInteger(id) || !Number.isInteger(stock) || stock < 0) return;

  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return;

  await db
    .update(products)
    .set({ stock, updatedAt: new Date() })
    .where(eq(products.id, id));
  await db.insert(activityLogs).values({
    type: "inventory",
    message: `Stock count updated: ${product.name} → ${stock} units`,
    href: "/inventory",
  });

  revalidateAll();
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function updateSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const fieldErrors: Record<string, string> = {};
  const storeName = str(formData, "storeName");
  const email = str(formData, "email");
  const gstin = str(formData, "gstin").toUpperCase();
  const freeShippingAbove = numberField(formData, "freeShippingAbove");
  const lowStockThreshold = numberField(formData, "lowStockThreshold");

  if (storeName.length < 2) fieldErrors.storeName = "Store name is required.";
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    fieldErrors.email = "Enter a valid email address.";
  if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin))
    fieldErrors.gstin = "GSTIN must be 15 characters (e.g. 14ABCDE1234F1Z5).";
  if (!Number.isFinite(freeShippingAbove) || freeShippingAbove < 0)
    fieldErrors.freeShippingAbove = "Enter a valid amount.";
  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0)
    fieldErrors.lowStockThreshold = "Enter a whole number.";

  if (Object.keys(fieldErrors).length) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const existing = await db.select({ id: storeSettings.id }).from(storeSettings).limit(1);
  const values = {
    storeName,
    ownerName: str(formData, "ownerName"),
    email,
    phone: str(formData, "phone"),
    gstin,
    address: str(formData, "address"),
    city: str(formData, "city"),
    state: str(formData, "state"),
    pincode: str(formData, "pincode"),
    upiId: str(formData, "upiId"),
    bankAccount: str(formData, "bankAccount"),
    ifsc: str(formData, "ifsc").toUpperCase(),
    freeShippingAbove,
    lowStockThreshold,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(storeSettings).set(values).where(eq(storeSettings.id, existing[0].id));
  } else {
    await db.insert(storeSettings).values(values);
  }

  // Apply the global low-stock threshold to the catalogue.
  await db.update(products).set({ lowStockThreshold });

  await db.insert(activityLogs).values({
    type: "settings",
    message: "Store settings updated",
    href: "/settings",
  });

  revalidateAll();
  return { success: "Settings saved successfully." };
}

export async function resetDemoData(): Promise<void> {
  await seedDatabase({ force: true });
  revalidateAll();
  redirect("/?reset=1");
}
