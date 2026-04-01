import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  const client = await pool.connect();
  try {
    const institutionCount = await client.query("SELECT COUNT(*) FROM public.institutions");
    const programCount = await client.query("SELECT COUNT(*) FROM public.programs");
    const userCount = await client.query("SELECT COUNT(*) FROM public.users");
    const aiGenCount = await client.query("SELECT COUNT(*) FROM public.audit_logs WHERE event_type = 'AI_GENERATION'");

    return NextResponse.json({
      institutions: parseInt(institutionCount.rows[0].count),
      programs: parseInt(programCount.rows[0].count),
      users: parseInt(userCount.rows[0].count),
      ai_generations: parseInt(aiGenCount.rows[0].count),
    });
  } catch (error) {
    console.error("Super Admin Metrics Error:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  } finally {
    client.release();
  }
}
