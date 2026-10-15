import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
export const productStatusEnum = pgEnum("product_status", [
  "active",
  "draft",
  "archived",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "upi",
  "cod",
  "card",
  "netbanking",
  "wallet",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "paid",
  "pending",
  "refunded",
  "failed",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "order",
  "product",
  "inventory",
  "customer",
  "settings",
  "payment",
]);

// ---------- Tables ----------
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  icon: varchar("icon", { length: 16 }).notNull().default("📦"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  brand: varchar("brand", { length: 120 }).notNull().default(""),
  description: text("description").notNull().default(""),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  price: numeric("price", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  mrp: numeric("mrp", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  status: productStatusEnum("status").notNull().default("active"),
  rating: numeric("rating", { precision: 2, scale: 1, mode: "number" })
    .notNull()
    .default(4),
  emoji: varchar("emoji", { length: 16 }).notNull().default("📦"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  city: varchar("city", { length: 120 }).notNull().default(""),
  state: varchar("state", { length: 120 }).notNull().default(""),
  pincode: varchar("pincode", { length: 10 }).notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("upi"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  shippingFee: numeric("shipping_fee", {
    precision: 12,
    scale: 2,
    mode: "number",
  })
    .notNull()
    .default(0),
  discount: numeric("discount", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  total: numeric("total", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  shippingAddress: text("shipping_address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  productName: varchar("product_name", { length: 200 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  lineTotal: numeric("line_total", { precision: 12, scale: 2, mode: "number" })
    .notNull()
    .default(0),
});

export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  storeName: varchar("store_name", { length: 160 })
    .notNull()
    .default("Youmang Ka Vyapaar"),
  ownerName: varchar("owner_name", { length: 160 }).notNull().default(""),
  email: varchar("email", { length: 200 }).notNull().default(""),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  gstin: varchar("gstin", { length: 20 }).notNull().default(""),
  address: text("address").notNull().default(""),
  city: varchar("city", { length: 120 }).notNull().default(""),
  state: varchar("state", { length: 120 }).notNull().default(""),
  pincode: varchar("pincode", { length: 10 }).notNull().default(""),
  upiId: varchar("upi_id", { length: 120 }).notNull().default(""),
  bankAccount: varchar("bank_account", { length: 40 }).notNull().default(""),
  ifsc: varchar("ifsc", { length: 16 }).notNull().default(""),
  freeShippingAbove: numeric("free_shipping_above", {
    precision: 12,
    scale: 2,
    mode: "number",
  })
    .notNull()
    .default(499),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: activityTypeEnum("type").notNull().default("order"),
  message: text("message").notNull(),
  href: varchar("href", { length: 200 }).notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- Relations ----------
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ---------- Types ----------
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
