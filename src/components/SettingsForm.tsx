"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, Field, buttonStyles, inputStyles } from "@/components/ui";
import { SubmitButton } from "@/components/ConfirmButton";
import { updateSettings, type FormState } from "@/lib/actions";
import type { StoreSettings } from "@/db/schema";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, formAction] = useActionState<FormState, FormData>(updateSettings, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {state.error}
        </div>
      )}
      {state.success && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" /> {state.success}
        </div>
      )}

      <Card title="Store profile" subtitle="Shown on invoices and in the seller hub">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Store name *" htmlFor="storeName" error={errors.storeName}>
            <input id="storeName" name="storeName" defaultValue={settings.storeName} className={inputStyles} required />
          </Field>
          <Field label="Owner name" htmlFor="ownerName">
            <input id="ownerName" name="ownerName" defaultValue={settings.ownerName} className={inputStyles} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input id="email" name="email" type="email" defaultValue={settings.email} className={inputStyles} />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <input id="phone" name="phone" defaultValue={settings.phone} className={inputStyles} />
          </Field>
          <Field label="GSTIN" htmlFor="gstin" error={errors.gstin} hint="15-character GST identification number">
            <input id="gstin" name="gstin" defaultValue={settings.gstin} className={`${inputStyles} font-mono uppercase`} maxLength={15} />
          </Field>
        </div>
      </Card>

      <Card title="Pickup address" subtitle="Couriers collect shipments from here">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Address" htmlFor="address" className="sm:col-span-2">
            <input id="address" name="address" defaultValue={settings.address} className={inputStyles} />
          </Field>
          <Field label="City" htmlFor="city">
            <input id="city" name="city" defaultValue={settings.city} className={inputStyles} />
          </Field>
          <Field label="State" htmlFor="state">
            <input id="state" name="state" defaultValue={settings.state} className={inputStyles} />
          </Field>
          <Field label="PIN code" htmlFor="pincode">
            <input id="pincode" name="pincode" defaultValue={settings.pincode} className={inputStyles} maxLength={6} />
          </Field>
        </div>
      </Card>

      <Card title="Payout details" subtitle="Where your settlements are credited">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Bank account (masked)" htmlFor="bankAccount">
            <input id="bankAccount" name="bankAccount" defaultValue={settings.bankAccount} className={`${inputStyles} font-mono`} />
          </Field>
          <Field label="IFSC" htmlFor="ifsc">
            <input id="ifsc" name="ifsc" defaultValue={settings.ifsc} className={`${inputStyles} font-mono uppercase`} maxLength={11} />
          </Field>
          <Field label="UPI ID" htmlFor="upiId">
            <input id="upiId" name="upiId" defaultValue={settings.upiId} className={inputStyles} />
          </Field>
        </div>
      </Card>

      <Card title="Store rules" subtitle="Operational defaults">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Free shipping above (₹)" htmlFor="freeShippingAbove" error={errors.freeShippingAbove}>
            <input id="freeShippingAbove" name="freeShippingAbove" type="number" min={0} defaultValue={settings.freeShippingAbove} className={inputStyles} />
          </Field>
          <Field
            label="Low stock threshold (units)"
            htmlFor="lowStockThreshold"
            error={errors.lowStockThreshold}
            hint="Applied to every product when saved"
          >
            <input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} defaultValue={settings.lowStockThreshold} className={inputStyles} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton className={buttonStyles.primary}>Save settings</SubmitButton>
      </div>
    </form>
  );
}
