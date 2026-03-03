import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import pool from "@/lib/postgres";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    const allowed = checkRateLimit({
      ip: `reset_${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { stakeholder_ref_id, old_password, new_password } = body;

    if (!stakeholder_ref_id || !old_password || !new_password) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      // 1. Fetch stakeholder and verify old password
      const result = await client.query(
        "SELECT login_password_hash, requires_password_change FROM representative_stakeholders WHERE id = $1",
        [stakeholder_ref_id],
      );

      if (result.rows.length === 0) {
        // Fake compare
        await bcrypt.compare(old_password, "$2b$10$abcdefghijklmnopqrstuv");
        return NextResponse.json(
          { error: "Invalid operation." },
          { status: 401 },
        );
      }

      const stakeholder = result.rows[0];

      // We only allow this endpoint for first time resets to keep things simple
      if (!stakeholder.requires_password_change) {
        return NextResponse.json(
          {
            error:
              "Password has already been changed. Please use the standard reset flow if needed.",
          },
          { status: 400 },
        );
      }

      const passwordMatch = await bcrypt.compare(
        old_password,
        stakeholder.login_password_hash,
      );
      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Incorrect current password." },
          { status: 401 },
        );
      }

      // 2. Hash new password and update
      const newPasswordHash = await bcrypt.hash(new_password, 10);

      await client.query(
        "UPDATE representative_stakeholders SET login_password_hash = $1, requires_password_change = false WHERE id = $2",
        [newPasswordHash, stakeholder_ref_id],
      );

      return NextResponse.json({
        ok: true,
        message:
          "Password updated successfully. Please log in with your new password.",
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
