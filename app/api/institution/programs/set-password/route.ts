import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { authorize, isAuthorized } from "@/lib/api-utils";
import { logAudit } from "@/lib/audit";

/**
 * Institution Admin: Set or Change a Program's Login Password
 * PUT /api/institution/programs/set-password
 *
 * Body: { program_id: string, new_password: string, old_password?: string }
 *
 * Rules:
 * - Institution admin can ALWAYS set a password the first time (is_password_set = false)
 * - After the first-time set, the admin must provide the old password to change it
 *   OR the admin can force-reset by calling without old_password (admin privilege)
 */
export async function PUT(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const auth = await authorize(request, ["INSTITUTE_ADMIN", "SUPER_ADMIN"]);
    if (!isAuthorized(auth)) return auth;

    const institutionId = auth.institutionId;

    const body = await request.json();
    const { program_id, new_password, old_password, email } = body;

    if (!program_id || !new_password) {
      return NextResponse.json(
        { error: "program_id and new_password are required." },
        { status: 400 },
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      // Ensure the program belongs to this institution
      const progRes = await client.query(
        `SELECT id, program_code, email, password_hash, is_password_set 
         FROM programs 
         WHERE id = $1 AND institution_id = $2 
         LIMIT 1`,
        [program_id, institutionId],
      );

      const program = progRes.rows[0];
      if (!program) {
        return NextResponse.json(
          { error: "Program not found or access denied." },
          { status: 404 },
        );
      }

      // Check for duplicate email if updating
      const currentEmail = program.email || "";
      if (email && email.toLowerCase() !== currentEmail.toLowerCase()) {
        const duplicateCheck = await client.query(
          "SELECT id FROM programs WHERE institution_id = $1 AND LOWER(email) = LOWER($2) AND id <> $3 LIMIT 1",
          [institutionId, email.trim(), program_id],
        );
        if (duplicateCheck.rows.length > 0) {
          return NextResponse.json(
            { error: "This email is already in use by another program." },
            { status: 409 },
          );
        }
      }

      // If password is already set and old_password provided, verify it
      if (program.is_password_set && program.password_hash && old_password) {
        const match = await bcrypt.compare(old_password, program.password_hash);
        if (!match) {
          return NextResponse.json(
            { error: "Current password is incorrect." },
            { status: 403 },
          );
        }
      }

      // Hash and save new password
      const newHash = await bcrypt.hash(new_password, 10);
      const finalEmail = email ? email.trim() : program.email;

      await client.query(
        `UPDATE programs 
         SET password_hash = $1, 
             email = $2,
             is_password_set = true, 
             updated_at = NOW() 
         WHERE id = $3 AND institution_id = $4`,
        [newHash, finalEmail, program_id, institutionId],
      );

      // Audit log
      await logAudit({
        institutionId,
        programId: program_id,
        action: program.is_password_set ? "PROGRAM_PASSWORD_CHANGED" : "PROGRAM_PASSWORD_SET",
        ipAddress: ip,
        details: { 
          programCode: program.program_code, 
          email: finalEmail,
          emailChanged: finalEmail !== program.email
        },
      });

      return NextResponse.json({
        ok: true,
        message: program.is_password_set
          ? "Credentials updated successfully."
          : "Credentials set successfully. Program can now log in.",
        email: finalEmail,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Set program password error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
