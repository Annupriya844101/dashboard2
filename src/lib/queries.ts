import { db } from "@/db";
import {
  activityLogs,
  categories,
  customers,
  orderItems,
  orders,
  products,
  storeSettings,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type ProductStatus,
  type StoreSettings,
} from "@/db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

const DAY = 24 * 60 * 60 * 1000;

/** Revenue-recognised orders exclude cancellations and returns. */
const revenueFilter = sql`${orders.status} not in ('cancelled', 'returned')`;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const last30 = new Date(now.getTime() - 30 * DAY);
  const prev30 = new Date(now.getTime() - 60 * DAY);

  const [orderStats] = await db
    .select({
      revenueTotal: sql<number>`coalesce(sum(${orders.total}) filter (where ${revenueFilter}), 0)::float`,
      revenue30: sql<number>`coalesce(sum(${orders.total}) filter (where ${revenueFilter} and ${orders.createdAt} >= ${last30}), 0)::float`,
      revenuePrev30: sql<number>`coalesce(sum(${orders.total}) filter (where ${revenueFilter} and ${orders.createdAt} >= ${prev30} and ${orders.createdAt} < ${last30}), 0)::float`,
      revenueToday: sql<number>`coalesce(sum(${orders.total}) filter (where ${revenueFilter} and ${orders.createdAt} >= ${todayStart}), 0)::float`,
      ordersTotal: sql<number>`count(*)::int`,
      orders30: sql<number>`count(*) filter (where ${orders.createdAt} >= ${last30})::int`,
      ordersPrev30: sql<number>`count(*) filter (where ${orders.createdAt} >= ${prev30} and ${orders.createdAt} < ${last30})::int`,
      ordersToday: sql<number>`count(*) filter (where ${orders.createdAt} >= ${todayStart})::int`,
      ordersPending: sql<number>`count(*) filter (where ${orders.status} in ('pending', 'processing'))::int`,
      ordersShipped: sql<number>`count(*) filter (where ${orders.status} = 'shipped')::int`,
      ordersReturned: sql<number>`count(*) filter (where ${orders.status} = 'returned')::int`,
      ordersCancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
      aov: sql<number>`coalesce(avg(${orders.total}) filter (where ${revenueFilter}), 0)::float`,
      codPending: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'pending'), 0)::float`,
    })
    .from(orders);

  const [customerStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      new30: sql<number>`count(*) filter (where ${customers.createdAt} >= ${last30})::int`,
      prev30: sql<number>`count(*) filter (where ${customers.createdAt} >= ${prev30} and ${customers.createdAt} < ${last30})::int`,
    })
    .from(customers);

  const [productStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${products.status} = 'active')::int`,
      lowStock: sql<number>`count(*) filter (where ${products.stock} <= ${products.lowStockThreshold} and ${products.stock} > 0 and ${products.status} = 'active')::int`,
      outOfStock: sql<number>`count(*) filter (where ${products.stock} = 0 and ${products.status} = 'active')::int`,
      inventoryValue: sql<number>`coalesce(sum(${products.price} * ${products.stock}), 0)::float`,
    })
    .from(products);

  return { ...orderStats, customers: customerStats, products: productStats };
}

export async function getRevenueSeries(days = 30) {
  const rows = await db.execute<{
    day: string;
    revenue: number;
    orders: number;
  }>(sql`
    select to_char(d::date, 'YYYY-MM-DD') as day,
      coalesce(sum(o.total) filter (where o.status not in ('cancelled','returned')), 0)::float as revenue,
      count(o.id)::int as orders
    from generate_series((now() - make_interval(days => ${days - 1}))::date, now()::date, '1 day') as d
    left join orders o on o.created_at::date = d::date
    group by d
    order by d
  `);
  return rows.rows;
}

export async function getOrderStatusBreakdown() {
  const rows = await db
    .select({ status: orders.status, count: count() })
    .from(orders)
    .groupBy(orders.status);
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
}

export async function getRecentOrders(limit = 8) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
      customerName: customers.name,
      customerCity: customers.city,
      itemCount: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} where ${orderItems.orderId} = ${orders.id})::int`,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getTopProducts(limit = 5) {
  return db
    .select({
      id: products.id,
      name: products.name,
      emoji: products.emoji,
      price: products.price,
      stock: products.stock,
      categoryName: categories.name,
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::float`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(revenueFilter)
    .groupBy(products.id, categories.name)
    .orderBy(desc(sql`sum(${orderItems.lineTotal})`))
    .limit(limit);
}

export async function getLowStockProducts(limit = 6) {
  return db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      emoji: products.emoji,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        lte(products.stock, products.lowStockThreshold),
        eq(products.status, "active"),
      ),
    )
    .orderBy(asc(products.stock))
    .limit(limit);
}

export async function getActivity(limit = 8) {
  return db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export type OrderListFilters = {
  status?: OrderStatus | "all";
  payment?: PaymentMethod | "all";
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listOrders(filters: OrderListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 15;
  const conditions: SQL[] = [];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(orders.status, filters.status));
  }
  if (filters.payment && filters.payment !== "all") {
    conditions.push(eq(orders.paymentMethod, filters.payment));
  }
  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, term),
        ilike(customers.name, term),
        ilike(customers.city, term),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
      customerName: customers.name,
      customerCity: customers.city,
      itemCount: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} where ${orderItems.orderId} = ${orders.id})::int`,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(where);

  return {
    rows,
    total: Number(total),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(total) / pageSize)),
  };
}

export async function getOrderStatusCounts() {
  const rows = await getOrderStatusBreakdown();
  const map: Record<string, number> = { all: 0 };
  for (const r of rows) {
    map[r.status] = r.count;
    map.all += r.count;
  }
  return map;
}

export async function getOrderById(id: number) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      customer: true,
      items: { with: { product: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Products & categories
// ---------------------------------------------------------------------------
export type ProductListFilters = {
  q?: string;
  category?: string;
  status?: ProductStatus | "all";
  stock?: "all" | "low" | "out";
  page?: number;
  pageSize?: number;
};

export async function listProducts(filters: ProductListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 12;
  const conditions: SQL[] = [];

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.sku, term),
        ilike(products.brand, term),
      )!,
    );
  }
  if (filters.category && filters.category !== "all") {
    conditions.push(eq(categories.slug, filters.category));
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(products.status, filters.status));
  }
  if (filters.stock === "low") {
    conditions.push(
      sql`${products.stock} <= ${products.lowStockThreshold} and ${products.stock} > 0`,
    );
  } else if (filters.stock === "out") {
    conditions.push(eq(products.stock, 0));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      brand: products.brand,
      price: products.price,
      mrp: products.mrp,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      status: products.status,
      rating: products.rating,
      emoji: products.emoji,
      createdAt: products.createdAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
      unitsSold: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} inner join ${orders} on ${orders.id} = ${orderItems.orderId} where ${orderItems.productId} = ${products.id} and ${orders.status} not in ('cancelled','returned'))::int`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where);

  return {
    rows,
    total: Number(total),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(total) / pageSize)),
  };
}

export async function getProductById(id: number) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: { category: true },
  });
}

export async function getProductSales(productId: number) {
  const [row] = await db
    .select({
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::float`,
      orderCount: sql<number>`count(distinct ${orderItems.orderId})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orderItems.productId, productId), revenueFilter));
  return row;
}

export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      productCount: sql<number>`(select count(*) from ${products} where ${products.categoryId} = ${categories.id})::int`,
    })
    .from(categories)
    .orderBy(asc(categories.name));
}

export async function listInventory(filter: "all" | "low" | "out" | "healthy" = "all") {
  const conditions: SQL[] = [];
  if (filter === "low") {
    conditions.push(
      sql`${products.stock} <= ${products.lowStockThreshold} and ${products.stock} > 0`,
    );
  } else if (filter === "out") {
    conditions.push(eq(products.stock, 0));
  } else if (filter === "healthy") {
    conditions.push(sql`${products.stock} > ${products.lowStockThreshold}`);
  }
  return db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      emoji: products.emoji,
      price: products.price,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      status: products.status,
      categoryName: categories.name,
      updatedAt: products.updatedAt,
      sold30: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} inner join ${orders} on ${orders.id} = ${orderItems.orderId} where ${orderItems.productId} = ${products.id} and ${orders.status} not in ('cancelled','returned') and ${orders.createdAt} >= now() - interval '30 days')::int`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(products.stock), asc(products.name));
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export async function listCustomers(filters: { q?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 15;
  const where = filters.q
    ? or(
        ilike(customers.name, `%${filters.q.trim()}%`),
        ilike(customers.email, `%${filters.q.trim()}%`),
        ilike(customers.city, `%${filters.q.trim()}%`),
      )
    : undefined;

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      city: customers.city,
      state: customers.state,
      createdAt: customers.createdAt,
      orderCount: sql<number>`count(${orders.id})::int`,
      totalSpent: sql<number>`coalesce(sum(${orders.total}) filter (where ${revenueFilter}), 0)::float`,
      lastOrderAt: sql<string | null>`max(${orders.createdAt})`,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(where)
    .groupBy(customers.id)
    .orderBy(desc(sql`coalesce(sum(${orders.total}) filter (where ${revenueFilter}), 0)`))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ total }] = await db
    .select({ total: count() })
    .from(customers)
    .where(where);

  return {
    rows,
    total: Number(total),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(total) / pageSize)),
  };
}

export async function getCustomerById(id: number) {
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, id),
  });
  if (!customer) return null;
  const customerOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
      itemCount: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} where ${orderItems.orderId} = ${orders.id})::int`,
    })
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.createdAt));

  const totalSpent = customerOrders
    .filter((o) => o.status !== "cancelled" && o.status !== "returned")
    .reduce((s, o) => s + o.total, 0);

  return { customer, orders: customerOrders, totalSpent };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export async function getMonthlyRevenue(months = 6) {
  const rows = await db.execute<{
    month: string;
    label: string;
    revenue: number;
    orders: number;
  }>(sql`
    select to_char(m, 'YYYY-MM') as month,
      to_char(m, 'Mon YY') as label,
      coalesce(sum(o.total) filter (where o.status not in ('cancelled','returned')), 0)::float as revenue,
      count(o.id)::int as orders
    from generate_series(date_trunc('month', now()) - make_interval(months => ${months - 1}), date_trunc('month', now()), '1 month') as m
    left join orders o on date_trunc('month', o.created_at) = m
    group by m
    order by m
  `);
  return rows.rows;
}

export async function getRevenueByCategory() {
  return db
    .select({
      name: categories.name,
      icon: categories.icon,
      revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::float`,
      units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(revenueFilter)
    .groupBy(categories.id)
    .orderBy(desc(sql`sum(${orderItems.lineTotal})`));
}

export async function getPaymentMethodBreakdown() {
  return db
    .select({
      method: orders.paymentMethod,
      count: sql<number>`count(*)::int`,
      amount: sql<number>`coalesce(sum(${orders.total}) filter (where ${revenueFilter}), 0)::float`,
    })
    .from(orders)
    .groupBy(orders.paymentMethod)
    .orderBy(desc(sql`count(*)`));
}

export async function getTopCities(limit = 8) {
  return db
    .select({
      city: customers.city,
      state: customers.state,
      orders: sql<number>`count(${orders.id})::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${revenueFilter}), 0)::float`,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .groupBy(customers.city, customers.state)
    .orderBy(desc(sql`coalesce(sum(${orders.total}) filter (where ${revenueFilter}), 0)`))
    .limit(limit);
}

export async function getFulfilmentMetrics() {
  const [row] = await db
    .select({
      avgDeliveryDays: sql<number>`coalesce(avg(extract(epoch from (${orders.deliveredAt} - ${orders.createdAt})) / 86400) filter (where ${orders.deliveredAt} is not null), 0)::float`,
      total: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
      returned: sql<number>`count(*) filter (where ${orders.status} = 'returned')::int`,
      cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
      repeatCustomers: sql<number>`(select count(*) from (select ${orders.customerId} from ${orders} group by ${orders.customerId} having count(*) > 1) t)::int`,
      totalCustomersWithOrders: sql<number>`count(distinct ${orders.customerId})::int`,
    })
    .from(orders);
  return row;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export async function getPaymentSummary() {
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const [row] = await db
    .select({
      settled: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'paid' and ${orders.status} = 'delivered'), 0)::float`,
      inTransit: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'paid' and ${orders.status} in ('pending','processing','shipped')), 0)::float`,
      codPending: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'pending'), 0)::float`,
      refunded: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'refunded'), 0)::float`,
      thisWeek: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'paid' and ${orders.updatedAt} >= ${weekAgo}), 0)::float`,
      refundCount: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'refunded')::int`,
    })
    .from(orders);
  return row;
}

export async function listTransactions(filters: { status?: PaymentStatus | "all"; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 15;
  const where =
    filters.status && filters.status !== "all"
      ? eq(orders.paymentStatus, filters.status)
      : undefined;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      total: orders.total,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: customers.name,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(desc(orders.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ total }] = await db.select({ total: count() }).from(orders).where(where);

  return {
    rows,
    total: Number(total),
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(Number(total) / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Settings & search
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS: StoreSettings = {
  id: 0,
  storeName: "Youmang Ka Vyapaar",
  ownerName: "",
  email: "",
  phone: "",
  gstin: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  upiId: "",
  bankAccount: "",
  ifsc: "",
  freeShippingAbove: 499,
  lowStockThreshold: 10,
  updatedAt: new Date(0),
};

/** Read-only: never inserts, so it can safely run concurrently with seeding. */
export async function getSettings(): Promise<StoreSettings> {
  const existing = await db
    .select()
    .from(storeSettings)
    .orderBy(asc(storeSettings.id))
    .limit(1);
  return existing[0] ?? DEFAULT_SETTINGS;
}

export async function searchAll(q: string) {
  const term = `%${q.trim()}%`;
  const [orderRows, productRows, customerRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
        customerName: customers.name,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(or(ilike(orders.orderNumber, term), ilike(customers.name, term)))
      .orderBy(desc(orders.createdAt))
      .limit(8),
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        emoji: products.emoji,
        price: products.price,
        stock: products.stock,
      })
      .from(products)
      .where(
        or(
          ilike(products.name, term),
          ilike(products.sku, term),
          ilike(products.brand, term),
        ),
      )
      .limit(8),
    db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        city: customers.city,
      })
      .from(customers)
      .where(
        or(
          ilike(customers.name, term),
          ilike(customers.email, term),
          ilike(customers.city, term),
          ilike(customers.phone, term),
        ),
      )
      .limit(8),
  ]);
  return { orders: orderRows, products: productRows, customers: customerRows };
}

export async function getProductsByIds(ids: number[]) {
  if (!ids.length) return [];
  return db.select().from(products).where(inArray(products.id, ids));
}
