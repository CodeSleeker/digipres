import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/**
 * Readiness/liveness probe for uptime monitors and load balancers.
 * Returns 200 when the app can reach the database, 503 when it can't. The DB
 * check is a cheap head-count against the publicly-readable businesses table.
 */
export async function GET() {
  let db: "ok" | "unavailable" = "unavailable";
  try {
    const supabase = createPublicClient();
    const { error } = await supabase
      .from("businesses")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    db = error ? "unavailable" : "ok";
  } catch {
    db = "unavailable";
  }

  const healthy = db === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", db, time: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
