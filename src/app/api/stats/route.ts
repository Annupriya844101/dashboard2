import {
  getDashboardStats,
  getMonthlyRevenue,
  getOrderStatusBreakdown,
  getPaymentMethodBreakdown,
  getRevenueByCategory,
  getRevenueSeries,
  getTopProducts,
} from "@/lib/queries";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const [summary, daily, monthly, byStatus, byCategory, byPayment, topProducts] =
    await Promise.all([
      getDashboardStats(),
      getRevenueSeries(30),
      getMonthlyRevenue(6),
      getOrderStatusBreakdown(),
      getRevenueByCategory(),
      getPaymentMethodBreakdown(),
      getTopProducts(10),
    ]);

  return Response.json({
    generatedAt: new Date().toISOString(),
    currency: "INR",
    summary,
    daily,
    monthly,
    byStatus,
    byCategory,
    byPayment,
    topProducts,
  });
}
