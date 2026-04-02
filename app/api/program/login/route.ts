import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildProgramLoginEmail } from "@/lib/program-login";

/**
 * Program Login
 * POST /api/program/login
 *
 * Authenticates a program directly using the auto-generated email
 * ({program_code}@{institution_shortform}.c2x.ai) and the password
 * set by the institution admin.
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  try {
    // Rate limiting
    if (!checkRateLimit({ ip, limit: 10, windowMs: 60_000 })) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, password } = body;
    const normalizedEmail = email.trim().toLowerCase();
    const loginProgramCode = normalizedEmail.split("@")[0] || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const client = await pool.connect();
    try {
      // Look up program by email
      const result = await client.query(
        `SELECT 
           p.id, 
           p.program_name, 
           p.program_code, 
           p.email, 
           p.password_hash, 
           p.is_password_set,
           p.institution_id,
           i.shortform AS institution_shortform,
           i.institution_name
         FROM programs p
         JOIN institutions i ON i.id = p.institution_id
         WHERE LOWER(p.email) = LOWER($1)
            OR LOWER(p.program_code) = LOWER($2)
         ORDER BY CASE WHEN LOWER(p.email) = LOWER($1) THEN 0 ELSE 1 END,
                  p.updated_at DESC NULLS LAST
         LIMIT 10`,
        [normalizedEmail, loginProgramCode],
      );

      const program =
        result.rows.find((row) => {
          if ((row.email || "").toLowerCase() === normalizedEmail) {
            return true;
          }

          const generatedEmail = buildProgramLoginEmail(
            row.program_code,
            row.institution_shortform,
            row.institution_name,
          );

          return generatedEmail === normalizedEmail;
        }) || null;

      const invalidResp = () =>
        NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

      if (!program || !program.password_hash) {
        // Dummy compare to avoid timing attacks
        await bcrypt.compare(password, "$2b$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu");
        return invalidResp();
      }

      // Verify password
      const match = await bcrypt.compare(password, program.password_hash);
      if (!match) {
        return invalidResp();
      }

      // Sign a JWT scoped to this program
      const token = await signToken({
        id: program.id,
        email: program.email,
        role: "PROGRAM_ADMIN",
        institution_id: program.institution_id,
        program_id: program.id,
        program_code: program.program_code,
        is_password_set: program.is_password_set,
        v: "5.2",
      });

      const response = NextResponse.json({
        ok: true,
        role: "PROGRAM_ADMIN",
        program: {
          id: program.id,
          name: program.program_name,
          code: program.program_code,
          email: program.email,
          institution: program.institution_name,
        },
        redirect: `/dashboard/${program.id}`,
      });

      response.cookies.set("c2e_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600, // 1 hour
      });

      // Also set the legacy institution_token so existing middleware works
      response.cookies.set("institution_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Program login error:", error);
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }
}
