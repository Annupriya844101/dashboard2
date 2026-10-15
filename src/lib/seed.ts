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
} from "@/db/schema";
import { sql } from "drizzle-orm";

const DAY = 24 * 60 * 60 * 1000;

// Deterministic PRNG so seed data is reproducible between runs.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORY_SEED = [
  { name: "Electronics", slug: "electronics", icon: "📱" },
  { name: "Fashion", slug: "fashion", icon: "👕" },
  { name: "Home & Kitchen", slug: "home-kitchen", icon: "🍳" },
  { name: "Beauty & Personal Care", slug: "beauty", icon: "💄" },
  { name: "Sports & Fitness", slug: "sports", icon: "🏏" },
  { name: "Grocery", slug: "grocery", icon: "🛒" },
  { name: "Appliances", slug: "appliances", icon: "🧺" },
  { name: "Toys & Baby", slug: "toys", icon: "🧸" },
];

type ProductSeed = {
  name: string;
  brand: string;
  cat: string;
  price: number;
  mrp: number;
  stock: number;
  emoji: string;
  rating: number;
};

const PRODUCT_SEED: ProductSeed[] = [
  { name: "boAt Rockerz 450 Bluetooth Headphones", brand: "boAt", cat: "electronics", price: 1499, mrp: 3990, stock: 142, emoji: "🎧", rating: 4.2 },
  { name: "Samsung Galaxy M14 5G (6GB/128GB)", brand: "Samsung", cat: "electronics", price: 13490, mrp: 17490, stock: 38, emoji: "📱", rating: 4.3 },
  { name: "Noise ColorFit Pulse 2 Smartwatch", brand: "Noise", cat: "electronics", price: 1799, mrp: 4999, stock: 6, emoji: "⌚", rating: 4.0 },
  { name: "Mi Power Bank 3i 10000mAh", brand: "Xiaomi", cat: "electronics", price: 1099, mrp: 1999, stock: 210, emoji: "🔋", rating: 4.4 },
  { name: "Lenovo IdeaPad Slim 3 (i5, 16GB/512GB)", brand: "Lenovo", cat: "electronics", price: 54990, mrp: 72000, stock: 9, emoji: "💻", rating: 4.3 },
  { name: "JBL Go 3 Portable Speaker", brand: "JBL", cat: "electronics", price: 2799, mrp: 3999, stock: 54, emoji: "🔊", rating: 4.5 },
  { name: "Zebronics Wired Keyboard & Mouse Combo", brand: "Zebronics", cat: "electronics", price: 599, mrp: 1299, stock: 3, emoji: "⌨️", rating: 3.9 },
  { name: "realme Buds T110 TWS Earbuds", brand: "realme", cat: "electronics", price: 1299, mrp: 2499, stock: 77, emoji: "🎧", rating: 4.1 },
  { name: "Allen Solly Men's Polo T-Shirt", brand: "Allen Solly", cat: "fashion", price: 799, mrp: 1499, stock: 120, emoji: "👕", rating: 4.2 },
  { name: "Puma Men's Flyer Runner Shoes", brand: "Puma", cat: "fashion", price: 2199, mrp: 4499, stock: 44, emoji: "👟", rating: 4.3 },
  { name: "Fastrack Analog Watch for Men", brand: "Fastrack", cat: "fashion", price: 1495, mrp: 2495, stock: 31, emoji: "⌚", rating: 4.1 },
  { name: "Biba Women's Printed Straight Kurta", brand: "Biba", cat: "fashion", price: 999, mrp: 1999, stock: 68, emoji: "👗", rating: 4.0 },
  { name: "Levi's 511 Slim Fit Jeans", brand: "Levi's", cat: "fashion", price: 2499, mrp: 3999, stock: 25, emoji: "👖", rating: 4.4 },
  { name: "Wildcraft 35L Laptop Backpack", brand: "Wildcraft", cat: "fashion", price: 1399, mrp: 2899, stock: 8, emoji: "🎒", rating: 4.3 },
  { name: "Fossil Leather Bifold Wallet", brand: "Fossil", cat: "fashion", price: 1999, mrp: 3495, stock: 19, emoji: "👛", rating: 4.5 },
  { name: "Nike Dri-FIT Club Cap", brand: "Nike", cat: "fashion", price: 899, mrp: 1295, stock: 0, emoji: "🧢", rating: 4.2 },
  { name: "Prestige Omega Non-Stick Cookware Set (3pc)", brand: "Prestige", cat: "home-kitchen", price: 1899, mrp: 3200, stock: 36, emoji: "🍳", rating: 4.3 },
  { name: "Milton Thermosteel Flask 1L", brand: "Milton", cat: "home-kitchen", price: 849, mrp: 1450, stock: 95, emoji: "🧴", rating: 4.4 },
  { name: "Cello Opalware Dinner Set (18pc)", brand: "Cello", cat: "home-kitchen", price: 1199, mrp: 2499, stock: 22, emoji: "🍽️", rating: 4.2 },
  { name: "Solimo Cotton King Bedsheet with Pillow Covers", brand: "Solimo", cat: "home-kitchen", price: 699, mrp: 1499, stock: 140, emoji: "🛏️", rating: 4.0 },
  { name: "Pigeon Favourite Pressure Cooker 5L", brand: "Pigeon", cat: "home-kitchen", price: 1299, mrp: 2195, stock: 5, emoji: "🥘", rating: 4.1 },
  { name: "Himalaya Purifying Neem Face Wash 150ml", brand: "Himalaya", cat: "beauty", price: 149, mrp: 185, stock: 320, emoji: "🧼", rating: 4.3 },
  { name: "Lakmé 9to5 Primer + Matte Lipstick", brand: "Lakmé", cat: "beauty", price: 399, mrp: 550, stock: 86, emoji: "💄", rating: 4.2 },
  { name: "Philips BT1232 Beard Trimmer", brand: "Philips", cat: "beauty", price: 999, mrp: 1345, stock: 47, emoji: "🪒", rating: 4.3 },
  { name: "Mamaearth Onion Hair Oil 250ml", brand: "Mamaearth", cat: "beauty", price: 349, mrp: 499, stock: 7, emoji: "🧴", rating: 4.1 },
  { name: "Nivea Men Dark Spot Reduction Cream", brand: "Nivea", cat: "beauty", price: 199, mrp: 275, stock: 160, emoji: "🧴", rating: 4.0 },
  { name: "SG Kashmir Willow Cricket Bat", brand: "SG", cat: "sports", price: 1499, mrp: 2999, stock: 28, emoji: "🏏", rating: 4.2 },
  { name: "Nivia Storm Football (Size 5)", brand: "Nivia", cat: "sports", price: 549, mrp: 999, stock: 64, emoji: "⚽", rating: 4.1 },
  { name: "Boldfit Yoga Mat 6mm Anti-Skid", brand: "Boldfit", cat: "sports", price: 599, mrp: 1499, stock: 4, emoji: "🧘", rating: 4.0 },
  { name: "Cosco Badminton Racket Set with Shuttles", brand: "Cosco", cat: "sports", price: 899, mrp: 1500, stock: 41, emoji: "🏸", rating: 4.2 },
  { name: "Amul Pure Cow Ghee 1L", brand: "Amul", cat: "grocery", price: 599, mrp: 640, stock: 230, emoji: "🧈", rating: 4.6 },
  { name: "Tata Sampann Unpolished Toor Dal 1kg", brand: "Tata Sampann", cat: "grocery", price: 165, mrp: 195, stock: 400, emoji: "🫘", rating: 4.4 },
  { name: "Fortune Sunflower Refined Oil 5L", brand: "Fortune", cat: "grocery", price: 749, mrp: 899, stock: 12, emoji: "🛢️", rating: 4.3 },
  { name: "India Gate Basmati Rice Classic 5kg", brand: "India Gate", cat: "grocery", price: 599, mrp: 799, stock: 180, emoji: "🍚", rating: 4.5 },
  { name: "Bajaj Rex 500W Mixer Grinder (3 Jars)", brand: "Bajaj", cat: "appliances", price: 2199, mrp: 3999, stock: 33, emoji: "🥤", rating: 4.1 },
  { name: "Prestige PIC 20 Induction Cooktop", brand: "Prestige", cat: "appliances", price: 2399, mrp: 3995, stock: 18, emoji: "🔥", rating: 4.2 },
  { name: "Crompton Hill Briz 1200mm Ceiling Fan", brand: "Crompton", cat: "appliances", price: 1899, mrp: 2850, stock: 2, emoji: "🌀", rating: 4.0 },
  { name: "Kent Grand Plus RO+UV Water Purifier", brand: "Kent", cat: "appliances", price: 14999, mrp: 21500, stock: 11, emoji: "💧", rating: 4.3 },
  { name: "LEGO Classic Creative Bricks (484pc)", brand: "LEGO", cat: "toys", price: 2499, mrp: 3299, stock: 27, emoji: "🧱", rating: 4.7 },
  { name: "Hot Wheels 10-Car Gift Pack", brand: "Hot Wheels", cat: "toys", price: 999, mrp: 1399, stock: 58, emoji: "🏎️", rating: 4.5 },
  { name: "Funskool Monopoly Board Game", brand: "Funskool", cat: "toys", price: 849, mrp: 1199, stock: 39, emoji: "🎲", rating: 4.4 },
  { name: "Mee Mee Comfortable Baby Stroller", brand: "Mee Mee", cat: "toys", price: 3499, mrp: 5999, stock: 9, emoji: "👶", rating: 4.1 },
];

const CUSTOMER_SEED: [string, string, string][] = [
  ["Aarav Sharma", "New Delhi", "Delhi"],
  ["Priya Patel", "Ahmedabad", "Gujarat"],
  ["Rohan Mehta", "Mumbai", "Maharashtra"],
  ["Ananya Iyer", "Chennai", "Tamil Nadu"],
  ["Vikram Singh", "Jaipur", "Rajasthan"],
  ["Sneha Reddy", "Hyderabad", "Telangana"],
  ["Arjun Nair", "Kochi", "Kerala"],
  ["Kavya Krishnan", "Bengaluru", "Karnataka"],
  ["Rahul Verma", "Lucknow", "Uttar Pradesh"],
  ["Meera Joshi", "Pune", "Maharashtra"],
  ["Thoiba Singh", "Imphal", "Manipur"],
  ["Lalrinpuii Hmar", "Aizawl", "Mizoram"],
  ["Bijoy Das", "Guwahati", "Assam"],
  ["Lhingneilam Haokip", "Churachandpur", "Manipur"],
  ["Anjali Gupta", "Kanpur", "Uttar Pradesh"],
  ["Siddharth Rao", "Visakhapatnam", "Andhra Pradesh"],
  ["Pooja Bhatt", "Surat", "Gujarat"],
  ["Karan Malhotra", "Chandigarh", "Chandigarh"],
  ["Ritika Sen", "Kolkata", "West Bengal"],
  ["Nikhil Kulkarni", "Nagpur", "Maharashtra"],
  ["Divya Menon", "Thiruvananthapuram", "Kerala"],
  ["Aditya Chauhan", "Dehradun", "Uttarakhand"],
  ["Nandini Deshmukh", "Nashik", "Maharashtra"],
  ["Farhan Khan", "Bhopal", "Madhya Pradesh"],
  ["Tenzin Dolma", "Gangtok", "Sikkim"],
  ["Angom Chaoba", "Imphal", "Manipur"],
  ["Rinchen Wangmo", "Itanagar", "Arunachal Pradesh"],
  ["Mohit Agarwal", "Indore", "Madhya Pradesh"],
  ["Shreya Banerjee", "Howrah", "West Bengal"],
  ["Harpreet Kaur", "Ludhiana", "Punjab"],
  ["Ishaan Pillai", "Mysuru", "Karnataka"],
  ["Tanvi Shah", "Vadodara", "Gujarat"],
  ["Deepak Yadav", "Patna", "Bihar"],
  ["Rakesh Kumar", "Ranchi", "Jharkhand"],
  ["Neha Saxena", "Noida", "Uttar Pradesh"],
  ["Kabir Bose", "Siliguri", "West Bengal"],
  ["Sonam Lepcha", "Darjeeling", "West Bengal"],
  ["Ngangom Ranjit", "Thoubal", "Manipur"],
  ["Aparna Hegde", "Mangaluru", "Karnataka"],
  ["Yash Thakur", "Shimla", "Himachal Pradesh"],
];

const STREETS = [
  "MG Road",
  "Nehru Nagar",
  "Gandhi Chowk",
  "Lake View Colony",
  "Station Road",
  "Sector 21",
  "Rajaji Street",
  "Paona Bazaar",
  "Civil Lines",
  "Park Street",
];

function weighted<T>(rand: () => number, entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

function slugEmail(name: string, i: number) {
  const base = name.toLowerCase().replace(/[^a-z]+/g, ".");
  const domains = ["gmail.com", "yahoo.in", "outlook.com", "rediffmail.com"];
  return `${base}${i % 7 === 0 ? i : ""}@${domains[i % domains.length]}`;
}

export async function seedDatabase(options: { force?: boolean } = {}) {
  const rand = mulberry32(20240915);
  const now = Date.now();

  return db.transaction(async (tx) => {
    // Serialize concurrent seed attempts (e.g. parallel first requests).
    await tx.execute(sql`select pg_advisory_xact_lock(727271)`);

    const existing = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(categories);
    const hasData = (existing[0]?.count ?? 0) > 0;

    if (hasData && !options.force) {
      return { seeded: false as const };
    }

    if (hasData) {
      await tx.execute(
        sql`truncate table ${activityLogs}, ${orderItems}, ${orders}, ${customers}, ${products}, ${categories}, ${storeSettings} restart identity cascade`,
      );
    }

    // Categories
    const insertedCategories = await tx
      .insert(categories)
      .values(CATEGORY_SEED)
      .returning();
    const categoryBySlug = new Map(insertedCategories.map((c) => [c.slug, c]));

    // Products
    const productRows = PRODUCT_SEED.map((p, i) => {
      const createdAt = new Date(now - (100 + rand() * 300) * DAY);
      const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
      return {
        name: p.name,
        sku: `YKV-${p.cat.slice(0, 3).toUpperCase()}-${String(1001 + i)}`,
        brand: p.brand,
        description: `${p.name} by ${p.brand}. ${discount}% off on MRP. Genuine product with brand warranty, 7-day replacement policy and fast delivery across India.`,
        categoryId: categoryBySlug.get(p.cat)!.id,
        price: p.price,
        mrp: p.mrp,
        stock: p.stock,
        lowStockThreshold: 10,
        status: "active" as const,
        rating: p.rating,
        emoji: p.emoji,
        createdAt,
        updatedAt: createdAt,
      };
    });
    const insertedProducts = await tx
      .insert(products)
      .values(productRows)
      .returning();

    // Customers
    const customerRows = CUSTOMER_SEED.map(([name, city, state], i) => ({
      name,
      email: slugEmail(name, i),
      phone: `+91 ${String(70000 + Math.floor(rand() * 29999))} ${String(
        10000 + Math.floor(rand() * 89999),
      )}`,
      city,
      state,
      pincode: String(110001 + Math.floor(rand() * 689999)),
      createdAt: new Date(now - (95 + rand() * 250) * DAY),
    }));
    const insertedCustomers = await tx
      .insert(customers)
      .values(customerRows)
      .returning();

    // Orders
    const ORDER_COUNT = 160;
    const orderRows: (typeof orders.$inferInsert)[] = [];
    const itemsByOrderIndex: (typeof orderItems.$inferInsert)[][] = [];

    for (let i = 0; i < ORDER_COUNT; i++) {
      const daysAgo = Math.floor(Math.pow(rand(), 1.25) * 90);
      const createdAt = new Date(now - daysAgo * DAY - rand() * DAY * 0.9);
      const customer =
        insertedCustomers[Math.floor(rand() * insertedCustomers.length)];

      const itemCount = weighted(rand, [
        [1, 55],
        [2, 28],
        [3, 12],
        [4, 5],
      ]);
      const chosen = new Set<number>();
      while (chosen.size < itemCount) {
        chosen.add(Math.floor(rand() * insertedProducts.length));
      }

      let subtotal = 0;
      const items: (typeof orderItems.$inferInsert)[] = [];
      for (const idx of chosen) {
        const p = insertedProducts[idx];
        const quantity = weighted(rand, [
          [1, 75],
          [2, 20],
          [3, 5],
        ]);
        const lineTotal = p.price * quantity;
        subtotal += lineTotal;
        items.push({
          orderId: 0,
          productId: p.id,
          productName: p.name,
          quantity,
          unitPrice: p.price,
          lineTotal,
        });
      }

      const shippingFee = subtotal >= 499 ? 0 : 40;
      const discount =
        rand() < 0.3 ? Math.round(subtotal * (0.05 + rand() * 0.1)) : 0;
      const total = subtotal + shippingFee - discount;

      let status: OrderStatus;
      if (daysAgo >= 8) {
        status = weighted<OrderStatus>(rand, [
          ["delivered", 76],
          ["cancelled", 9],
          ["returned", 8],
          ["shipped", 4],
          ["processing", 3],
        ]);
      } else if (daysAgo >= 3) {
        status = weighted<OrderStatus>(rand, [
          ["delivered", 35],
          ["shipped", 35],
          ["processing", 15],
          ["pending", 5],
          ["cancelled", 10],
        ]);
      } else {
        status = weighted<OrderStatus>(rand, [
          ["pending", 35],
          ["processing", 35],
          ["shipped", 20],
          ["cancelled", 10],
        ]);
      }

      const paymentMethod = weighted<PaymentMethod>(rand, [
        ["upi", 45],
        ["cod", 28],
        ["card", 14],
        ["netbanking", 8],
        ["wallet", 5],
      ]);

      let paymentStatus: PaymentStatus;
      if (status === "returned") paymentStatus = "refunded";
      else if (status === "cancelled")
        paymentStatus = paymentMethod === "cod" ? "failed" : "refunded";
      else if (status === "delivered") paymentStatus = "paid";
      else paymentStatus = paymentMethod === "cod" ? "pending" : "paid";

      const deliveredAt =
        status === "delivered" || status === "returned"
          ? new Date(createdAt.getTime() + (2 + rand() * 5) * DAY)
          : null;
      const updatedAt =
        deliveredAt ?? new Date(createdAt.getTime() + rand() * 2 * DAY);

      const street = STREETS[Math.floor(rand() * STREETS.length)];
      const houseNo = 1 + Math.floor(rand() * 240);

      orderRows.push({
        orderNumber: `OD${4321 + i}${String(Math.floor(rand() * 1e9)).padStart(9, "0")}`,
        customerId: customer.id,
        status,
        paymentMethod,
        paymentStatus,
        subtotal,
        shippingFee,
        discount,
        total,
        shippingAddress: `${houseNo}, ${street}, ${customer.city}, ${customer.state} - ${customer.pincode}`,
        notes: "",
        createdAt,
        updatedAt,
        deliveredAt,
      });
      itemsByOrderIndex.push(items);
    }

    const insertedOrders = await tx
      .insert(orders)
      .values(orderRows)
      .returning({ id: orders.id });

    const allItems = insertedOrders.flatMap((o, idx) =>
      itemsByOrderIndex[idx].map((it) => ({ ...it, orderId: o.id })),
    );
    await tx.insert(orderItems).values(allItems);

    // Store settings
    await tx.insert(storeSettings).values({
      storeName: "Youmang Ka Vyapaar",
      ownerName: "Youmang",
      email: "hello@youmangkavyapaar.in",
      phone: "+91 98620 11223",
      gstin: "14ABCDE1234F1Z5",
      address: "Shop 12, Paona Bazaar",
      city: "Imphal",
      state: "Manipur",
      pincode: "795001",
      upiId: "youmang@upi",
      bankAccount: "XXXXXX4521",
      ifsc: "SBIN0001234",
      freeShippingAbove: 499,
      lowStockThreshold: 10,
    });

    // Activity feed
    const recentOrders = insertedOrders.slice(-5);
    await tx.insert(activityLogs).values([
      {
        type: "order",
        message: `New order ${orderRows[orderRows.length - 1].orderNumber} received`,
        href: `/orders/${recentOrders[recentOrders.length - 1].id}`,
        createdAt: new Date(now - 12 * 60 * 1000),
      },
      {
        type: "inventory",
        message: "Crompton Hill Briz 1200mm Ceiling Fan is running low (2 left)",
        href: "/inventory",
        createdAt: new Date(now - 48 * 60 * 1000),
      },
      {
        type: "payment",
        message: "Weekly settlement of ₹1,24,560 credited to bank account",
        href: "/payments",
        createdAt: new Date(now - 5 * 60 * 60 * 1000),
      },
      {
        type: "product",
        message: "Nike Dri-FIT Club Cap is out of stock",
        href: "/inventory",
        createdAt: new Date(now - 9 * 60 * 60 * 1000),
      },
      {
        type: "customer",
        message: "New customer Sonam Lepcha signed up from Darjeeling",
        href: "/customers",
        createdAt: new Date(now - 1.2 * DAY),
      },
      {
        type: "order",
        message: "Return request approved for a Fashion order",
        href: "/orders?status=returned",
        createdAt: new Date(now - 2 * DAY),
      },
    ]);

    return { seeded: true as const };
  });
}

const globalForSeed = globalThis as typeof globalThis & {
  __ykvSeedPromise?: Promise<void>;
};

/**
 * Ensures demo data exists. Runs at most once per server process and is
 * safe to call from any server component / route handler.
 */
export async function ensureSeeded() {
  if (!globalForSeed.__ykvSeedPromise) {
    globalForSeed.__ykvSeedPromise = seedDatabase()
      .then(() => undefined)
      .catch((err) => {
        // Allow retry on the next request if seeding failed.
        globalForSeed.__ykvSeedPromise = undefined;
        throw err;
      });
  }
  await globalForSeed.__ykvSeedPromise;
}
