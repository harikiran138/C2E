import { NextResponse } from "next/server";
import { ensureDebugRouteEnabled } from "@/lib/debug-route";

export async function GET() {
  const disabledResponse = ensureDebugRouteEnabled();
  if (disabledResponse) {
    return disabledResponse;
  }

  const envKeys = Object.keys(process.env).filter(
    (k) =>
      k.includes("DB") ||
      k.includes("POSTGRES") ||
      k.includes("SUPA") ||
      k.includes("DATA"),
  );

  return NextResponse.json({
    keys: envKeys,
    postgres: process.env.POSTGRES_URL ? "PRESENT" : "MISSING",
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? "PRESENT" : "MISSING",
  });
}
