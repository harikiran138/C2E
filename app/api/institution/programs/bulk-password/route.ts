import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { authorize, isAuthorized } from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";

/**
 * Institution Admin: Set a common password for ALL Programs
 * POST /api/institution/programs/bulk-password
 *
 * Body: { password?: string }
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const auth = await authorize(request, ["INSTITUTE_ADMIN", "SUPER_ADMIN"]);
    if (!isAuthorized(auth)) return auth;

    const institutionId = auth.institutionId;
    if (!institutionId) {
        return NextResponse.json({ error: "No institution context found" }, { status: 403 });
    }

    const body = await request.json();
    const newPassword = body.password || "progemas"; // User requested default

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const client = await pool.connect();
    try {
      // Update all programs for this institution
      const result = await client.query(
        `UPDATE programs 
         SET password_hash = $1, is_password_set = true, updated_at = NOW() 
         WHERE institution_id = $2
         RETURNING id, program_code`,
        [newHash, institutionId],
      );

      const updatedCount = result.rows.length;

      // Audit log
      await logAudit({
        institutionId,
        action: "ALL_PROGRAMS_PASSWORD_RESET",
        ipAddress: ip,
        details: { 
            count: updatedCount, 
            method: "BULK_SET",
            passwordProvided: !!body.password
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Successfully set password for ${updatedCount} programs.`,
        count: updatedCount
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Bulk set program password error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
