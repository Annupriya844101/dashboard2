"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card, Field, buttonStyles, inputStyles } from "@/components/ui";
import { SubmitButton } from "@/components/ConfirmButton";
import type { FormState } from "@/lib/actions";
import { discountPercent, formatINR } from "@/lib/format";

export type ProductFormValues = {
  name: string;
  sku: string;
  brand: string;
  description: string;
  emoji: string;
  categoryId: number | "";
  price: number | "";
  mrp: number | "";
  stock: number | "";
  lowStockThreshold: number | "";
  status: "active" | "draft" | "archived";
};

const EMOJI_CHOICES = [
  "📦", "📱", "💻", "🎧", "⌚", "🔋", "🔊", "⌨️", "👕", "👟", "👗", "👖", "🎒", "👛", "🧢",
  "🍳", "🧴", "🍽️", "🛏️", "🥘", "🧼", "💄", "🪒", "🏏", "⚽", "🧘", "🏸", "🧈", "🫘", "🍚",
  "🥤", "🔥", "🌀", "💧", "🧱", "🏎️", "🎲", "👶", "📚", "🪑", "💡", "🧸",
];

export function ProductForm({
  action,
  categories,
  initial,
  submitLabel,
  cancelHref = "/products",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: { id: number; name: string; icon: string }[];
  initial: ProductFormValues;
  submitLabel: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [preview, setPreview] = useState({
    name: initial.name,
    price: Number(initial.price) || 0,
    mrp: Number(initial.mrp) || 0,
    emoji: initial.emoji || "📦",
    brand: initial.brand,
  });
  const errors = state.fieldErrors ?? {};
  const off = discountPercent(preview.price, preview.mrp);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        {state.error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {state.error}
          </div>
        )}

        <Card title="Basic details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Product name *" htmlFor="name" error={errors.name} className="sm:col-span-2">
              <input
                id="name"
                name="name"
                defaultValue={initial.name}
                onChange={(e) => setPreview((p) => ({ ...p, name: e.target.value }))}
                className={inputStyles}
                placeholder="e.g. boAt Rockerz 450 Bluetooth Headphones"
                required
              />
            </Field>
            <Field label="Brand" htmlFor="brand" error={errors.brand}>
              <input
                id="brand"
                name="brand"
                defaultValue={initial.brand}
                onChange={(e) => setPreview((p) => ({ ...p, brand: e.target.value }))}
                className={inputStyles}
                placeholder="e.g. boAt"
              />
            </Field>
            <Field label="SKU *" htmlFor="sku" error={errors.sku} hint="Unique stock-keeping unit code">
              <input
                id="sku"
                name="sku"
                defaultValue={initial.sku}
                className={`${inputStyles} font-mono uppercase`}
                placeholder="YKV-ELE-1042"
                required
              />
            </Field>
            <Field label="Category *" htmlFor="categoryId" error={errors.categoryId}>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={initial.categoryId}
                className={inputStyles}
                required
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Listing status" htmlFor="status" error={errors.status}>
              <select id="status" name="status" defaultValue={initial.status} className={inputStyles}>
                <option value="active">Active – visible to buyers</option>
                <option value="draft">Draft – hidden</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Description" htmlFor="description" className="sm:col-span-2">
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={initial.description}
                className={inputStyles}
                placeholder="Highlight key features, warranty and what's in the box."
              />
            </Field>
          </div>
        </Card>

        <Card title="Pricing & inventory">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Selling price (₹) *" htmlFor="price" error={errors.price}>
              <input
                id="price"
                name="price"
                type="number"
                min={0}
                step="1"
                defaultValue={initial.price}
                onChange={(e) => setPreview((p) => ({ ...p, price: Number(e.target.value) || 0 }))}
                className={inputStyles}
                required
              />
            </Field>
            <Field label="MRP (₹)" htmlFor="mrp" error={errors.mrp} hint="Leave blank to use the selling price">
              <input
                id="mrp"
                name="mrp"
                type="number"
                min={0}
                step="1"
                defaultValue={initial.mrp}
                onChange={(e) => setPreview((p) => ({ ...p, mrp: Number(e.target.value) || 0 }))}
                className={inputStyles}
              />
            </Field>
            <Field label="Stock quantity *" htmlFor="stock" error={errors.stock}>
              <input
                id="stock"
                name="stock"
                type="number"
                min={0}
                step="1"
                defaultValue={initial.stock}
                className={inputStyles}
                required
              />
            </Field>
            <Field
              label="Low stock alert at"
              htmlFor="lowStockThreshold"
              error={errors.lowStockThreshold}
              hint="You'll be alerted when stock falls to this level"
            >
              <input
                id="lowStockThreshold"
                name="lowStockThreshold"
                type="number"
                min={0}
                step="1"
                defaultValue={initial.lowStockThreshold}
                className={inputStyles}
              />
            </Field>
          </div>
        </Card>

        <Card title="Product image" subtitle="Pick an icon to represent this listing">
          <input type="hidden" name="emoji" value={preview.emoji} />
          <div className="flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setPreview((p) => ({ ...p, emoji: e }))}
                className={`flex h-10 w-10 items-center justify-center rounded-md border text-xl transition ${
                  preview.emoji === e
                    ? "border-fk-blue bg-fk-blue-light ring-2 ring-fk-blue/30"
                    : "border-fk-border hover:border-fk-blue"
                }`}
                aria-label={`Use ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={cancelHref} className={buttonStyles.outline}>
            Cancel
          </Link>
          <SubmitButton className={buttonStyles.primary} pendingText="Saving…">
            {submitLabel}
          </SubmitButton>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <Card title="Listing preview" subtitle="How buyers will see it">
          <div className="rounded-md border border-fk-border/70 p-4">
            <div className="flex h-40 items-center justify-center rounded-md bg-gradient-to-br from-slate-50 to-slate-100 text-7xl">
              {preview.emoji}
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-fk-muted">
              {preview.brand || "Brand"}
            </p>
            <p className="line-clamp-2 text-sm font-medium text-fk-text">
              {preview.name || "Product name"}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-semibold">{formatINR(preview.price)}</span>
              {off > 0 && (
                <>
                  <s className="text-sm text-fk-muted">{formatINR(preview.mrp)}</s>
                  <span className="text-sm font-semibold text-fk-green">{off}% off</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-fk-green">Free delivery</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <span className="rounded-sm bg-fk-amber py-2 text-center text-xs font-semibold uppercase text-white">
                Add to cart
              </span>
              <span className="rounded-sm bg-fk-orange py-2 text-center text-xs font-semibold uppercase text-white">
                Buy now
              </span>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}
