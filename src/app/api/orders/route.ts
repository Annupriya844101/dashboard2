import { NextRequest } from "next/server";
import { listOrders } from "@/lib/queries";
import { ensureSeeded } from "@/lib/seed";
import { ORDER_STATUSES } from "@/lib/format";
import type { OrderStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  await ensureSeeded();
  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status") ?? "all";
  const status = (ORDER_STATUSES as string[]).includes(statusParam)
    ? (statusParam as OrderStatus)
    : "all";
  const format = params.get("format");
  const page = Number(params.get("page") ?? 1) || 1;
  const pageSize = format === "csv" ? 1000 : Math.min(100, Number(params.get("pageSize") ?? 20) || 20);

  const result = await listOrders({
    status,
    q: params.get("q") ?? undefined,
    page,
    pageSize,
  });

  if (format === "csv") {
    const header = [
      "order_number",
      "created_at",
      "customer",
      "city",
      "items",
      "payment_method",
      "payment_status",
      "status",
      "total",
    ];
    const lines = result.rows.map((o) =>
      [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.customerName,
        o.customerCity,
        o.itemCount,
        o.paymentMethod,
        o.paymentStatus,
        o.status,
        o.total.toFixed(2),
      ]
        .map(csvEscape)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return Response.json(result);
}
