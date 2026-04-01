import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import pool from "@/lib/postgres";
import { checkRateLimit } from "@/lib/rate-limit";
import { signTokenWithExpiry } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    const body = await request.json();
    const instituteId = String(body?.institute_id || "").trim();
    const programId = String(body?.program_id || "").trim();
    const stakeholderId = String(body?.stakeholder_id || "").trim();
    const stakeholderPassword = String(body?.stakeholder_password || "");

    // Rate Limit by targeted stakeholder ID to prevent IP spoofing brute force
    const rateLimitKey = stakeholderId
      ? `login_${instituteId}_${stakeholderId}`
      : ip;
    const allowed = checkRateLimit({
      ip: rateLimitKey,
      limit: 8,
      windowMs: 60 * 1000,
    });

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Too many login attempts for this account. Please try again shortly.",
        },
        { status: 429 },
      );
    }

    if (!instituteId || !programId || !stakeholderId || !stakeholderPassword) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
            rs.id AS stakeholder_ref_id,
            rs.member_id,
            rs.member_name,
            rs.category,
            rs.is_approved,
            rs.login_password_hash,
            rs.requires_password_change,
            rs.program_id,
            p.program_name,
            i.id AS institution_id,
            i.institution_name
         FROM representative_stakeholders rs
         INNER JOIN programs p ON p.id = rs.program_id
         INNER JOIN institutions i ON i.id = p.institution_id
         WHERE i.id = $1
           AND p.id = $2
           AND LOWER(rs.member_id) = LOWER($3)
         LIMIT 1`,
        [instituteId, programId, stakeholderId],
      );

      if (result.rows.length === 0) {
        // Fake compare to reduce timing signal
        await bcrypt.compare(
          stakeholderPassword,
          "$2b$10$abcdefghijklmnopqrstuv",
        );
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }

      const stakeholder = result.rows[0];
      if (!stakeholder.is_approved) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }

      if (!stakeholder.login_password_hash) {
        return NextResponse.json(
          {
            error: "Invalid email or password.",
          },
          { status: 401 },
        );
      }

      const passwordMatch = await bcrypt.compare(
        stakeholderPassword,
        stakeholder.login_password_hash,
      );
      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 },
        );
      }

      // Check if password change is required (e.g. first login)
      if (stakeholder.requires_password_change) {
        return NextResponse.json(
          {
            error: "Password change required",
            requires_password_change: true,
            stakeholder_ref_id: stakeholder.stakeholder_ref_id,
          },
          { status: 403 },
        );
      }

      const stakeholderToken = await signTokenWithExpiry(
        {
          role: "stakeholder",
          stakeholder_ref_id: stakeholder.stakeholder_ref_id,
          stakeholder_member_id: stakeholder.member_id,
          stakeholder_name: stakeholder.member_name,
          stakeholder_category: stakeholder.category,
          institution_id: stakeholder.institution_id,
          institution_name: stakeholder.institution_name,
          program_id: stakeholder.program_id,
          program_name: stakeholder.program_name,
        },
        "8h",
      );

      await client.query(
        "UPDATE representative_stakeholders SET last_login_at = NOW() WHERE id = $1",
        [stakeholder.stakeholder_ref_id],
      );

      const response = NextResponse.json({
        ok: true,
        stakeholder: {
          stakeholder_id: stakeholder.member_id,
          stakeholder_name: stakeholder.member_name,
          category: stakeholder.category,
          institution_name: stakeholder.institution_name,
          program_id: stakeholder.program_id,
          program_name: stakeholder.program_name,
        },
      });

      // Point #2 & Point #3: Standardize on unified token and clear previous sessions
      response.cookies.set("institution_token", "", { maxAge: 0, path: "/" });
      response.cookies.set("c2e_auth_token", stakeholderToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 8 * 60 * 60,
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Stakeholder login error:", error);
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }
}
