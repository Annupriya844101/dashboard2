import type { Metadata } from "next";
import { Database, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, PageHeader, buttonStyles } from "@/components/ui";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SettingsForm } from "@/components/SettingsForm";
import { resetDemoData } from "@/lib/actions";
import { getSettings } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await ensureSeeded();
  const settings = await getSettings();

  return (
    <div>
      <PageHeader
        title="Settings"
        description={`Manage your store profile, payouts and defaults. Last updated ${formatDateTime(settings.updatedAt)}.`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SettingsForm settings={settings} />
        </div>

        <div className="space-y-4">
          <Card title="Account status">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-fk-green" />
                <div>
                  <p className="font-medium">KYC verified</p>
                  <p className="text-xs text-fk-muted">GSTIN {settings.gstin || "not added"}</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Database className="h-5 w-5 text-fk-blue" />
                <div>
                  <p className="font-medium">PostgreSQL connected</p>
                  <p className="text-xs text-fk-muted">Data persisted via Drizzle ORM</p>
                </div>
              </li>
            </ul>
          </Card>

          <Card title="Demo data" subtitle="Danger zone">
            <p className="text-sm text-fk-muted">
              Restore the original sample catalogue, customers and orders. Any changes you&apos;ve made
              will be lost.
            </p>
            <form action={resetDemoData} className="mt-4">
              <ConfirmButton
                className={buttonStyles.danger}
                confirmText="Reset all demo data? This cannot be undone."
                pendingText="Resetting…"
              >
                <RefreshCw className="h-4 w-4" /> Reset demo data
              </ConfirmButton>
            </form>
          </Card>

          <Card title="API endpoints" subtitle="For integrations & exports">
            <ul className="space-y-1.5 font-mono text-xs">
              <li><a className="text-fk-blue hover:underline" href="/api/health">GET /api/health</a></li>
              <li><a className="text-fk-blue hover:underline" href="/api/stats">GET /api/stats</a></li>
              <li><a className="text-fk-blue hover:underline" href="/api/orders">GET /api/orders</a></li>
              <li><a className="text-fk-blue hover:underline" href="/api/orders?format=csv">GET /api/orders?format=csv</a></li>
              <li><a className="text-fk-blue hover:underline" href="/api/products">GET /api/products</a></li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
