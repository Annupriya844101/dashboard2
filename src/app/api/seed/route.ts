import { NextRequest } from "next/server";
import { seedDatabase } from "@/lib/seed";

export const dynamic = "force-dynamic";

/**
 * POST /api/seed          -> seeds only if the database is empty
 * POST /api/seed?force=1  -> wipes and re-seeds demo data
 */
export async function POST(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "1";
  const result = await seedDatabase({ force });
  return Response.json({ ok: true, ...result, force });
}
