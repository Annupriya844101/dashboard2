# 🛒 Youmang Ka Vyapaar — Seller Hub

A **Flipkart-style e-commerce business management dashboard** for running an online store:
orders, catalogue, inventory, customers, analytics, payments and store settings — all in one place.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Drizzle ORM · PostgreSQL · Recharts**.

---

## ✨ Features

| Module | What you can do |
| --- | --- |
| **Dashboard** | Revenue / orders / customers KPIs with 30-day trends, daily revenue chart, orders-by-status donut, recent orders, best sellers, low-stock alerts, quick actions |
| **Orders** | Filter by status & payment method, search by order ID / customer / city, paginated list, order detail with fulfilment timeline, status transitions (accept → ship → deliver / cancel / return), internal notes, CSV export |
| **Products** | Full catalogue CRUD with validation, categories, MRP vs selling price with auto discount %, ratings, live listing preview, archive-instead-of-delete when a product has order history |
| **Inventory** | Stock health summary, low / out-of-stock filters, days-of-cover forecast, one-click restock (+10 / +50 / −1) and exact stock set |
| **Customers** | Customer directory with lifetime value, order count, last order, repeat-buyer rate, per-customer order history |
| **Analytics** | 6-month revenue & order trend, revenue by category, payment-method mix, top cities, best sellers, delivery time, return & cancellation rates |
| **Payments** | Settled / in-transit / COD-to-collect / refunded totals, next payout estimate, transaction ledger filtered by payment status |
| **Settings** | Store profile, GSTIN, pickup address, payout details, free-shipping threshold, global low-stock threshold, one-click demo data reset |
| **Search** | Global search across orders, products and customers from the top bar |
| **REST API** | `GET /api/health`, `GET /api/stats`, `GET /api/orders[?format=csv]`, `GET|POST /api/products`, `POST /api/seed` |

The app **auto-seeds realistic demo data** (8 categories, 42 products, 40 customers, 160 orders across 90 days) on first run.

---

## 🚀 Getting started

### Prerequisites

- Node.js 20+ (22 recommended)
- PostgreSQL 14+ (local, Docker, Neon, Supabase, Railway…)

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/youmang-ka-vyapaar.git
cd youmang-ka-vyapaar
npm install
```

### 2. Configure the database

```bash
cp .env.example .env
# edit .env and set DATABASE_URL
```

Quick local Postgres with Docker:

```bash
docker run --name ykv-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:15
```

> `drizzle.config.json` also contains a connection URL used by `drizzle-kit`. Update it if your database is not at `postgresql://postgres:postgres@127.0.0.1:5432/app_db`.

### 3. Create the tables

```bash
npx drizzle-kit push
```

### 4. Run

```bash
npm run dev        # http://localhost:3000
```

Demo data is inserted automatically the first time any page loads. To wipe and re-seed later, use
**Settings → Reset demo data** or `curl -X POST "http://localhost:3000/api/seed?force=1"`.

### Production

```bash
npm run build
npm start
```

---

## 🧱 Project structure

```
src/
├── app/                      # App Router pages & API routes
│   ├── page.tsx              # Dashboard
│   ├── orders/               # Orders list + /orders/[id] detail
│   ├── products/             # Catalogue, /products/new, /products/[id]/edit
│   ├── inventory/            # Stock management
│   ├── customers/            # Customers list + /customers/[id]
│   ├── analytics/            # Reports & charts
│   ├── payments/             # Settlements & transactions
│   ├── settings/             # Store settings + demo reset
│   ├── search/               # Global search results
│   └── api/                  # health, stats, orders, products, seed
├── components/
│   ├── layout/               # Topbar (Flipkart blue bar) & Sidebar
│   ├── charts.tsx            # Recharts client components
│   ├── ui.tsx                # Cards, badges, tables, pagination, form fields
│   ├── ProductForm.tsx       # Product create/edit form (useActionState)
│   └── SettingsForm.tsx
├── db/
│   ├── schema.ts             # Drizzle schema (categories, products, customers, orders, order_items, store_settings, activity_logs)
│   └── index.ts              # pg Pool + Drizzle client
└── lib/
    ├── queries.ts            # All read queries / aggregations
    ├── actions.ts            # Server Actions (mutations)
    ├── seed.ts               # Deterministic demo data generator
    └── format.ts             # INR formatting, dates, status metadata
```

---

## 🗄️ Data model

```
categories ──< products ──< order_items >── orders >── customers
                                              │
store_settings (single row)      activity_logs (notification feed)
```

Money is stored as `numeric(12,2)` and read as JavaScript numbers; all amounts are in INR.
Revenue metrics exclude cancelled and returned orders. Cancelling or returning an order automatically restores stock and updates the payment status (refund / not collected).

---

## 🔌 API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Liveness check (runs `select 1`) |
| `GET /api/stats` | Dashboard summary, daily & monthly series, breakdowns, top products |
| `GET /api/orders?status=&q=&page=&pageSize=` | Paginated orders (JSON) |
| `GET /api/orders?format=csv` | Orders export (CSV) |
| `GET /api/products?q=&category=&page=` | Paginated catalogue |
| `POST /api/products` | Create a product `{ name, sku, categorySlug, price, mrp?, stock?, brand?, description?, emoji? }` |
| `POST /api/seed?force=1` | Re-seed demo data |

---

## 🐙 Publish to GitHub

```bash
git init -b main
git add .
git commit -m "feat: Youmang Ka Vyapaar seller dashboard"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/<your-username>/youmang-ka-vyapaar.git
git push -u origin main
```

Or with the GitHub CLI:

```bash
gh repo create youmang-ka-vyapaar --public --source=. --remote=origin --push
```

The included **GitHub Actions workflow** (`.github/workflows/ci.yml`) spins up PostgreSQL, pushes the schema, typechecks, lints and builds on every push / pull request.

---

## ☁️ Deploy

**Vercel + Neon / Supabase (recommended)**

1. Push the repo to GitHub (above).
2. Create a Postgres database on [Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy its connection string.
3. Import the repo in Vercel and add the `DATABASE_URL` environment variable.
4. Run `DATABASE_URL=... npx drizzle-kit push` once from your machine to create the tables.
5. Deploy — the first request seeds demo data automatically.

---

## 📜 Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npx drizzle-kit push` | Sync the Drizzle schema to the database |

---

Made with ❤️ for Indian sellers. _Vyapaar_ (व्यापार) = business.
