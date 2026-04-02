import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { createSessionCookieOptions, signToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildProgramSessionPayload,
  getProgramLookupCode,
  matchesProgramLoginIdentifier,
  normalizeProgramIdentifier,
} from "@/lib/program-login";
import {
  attachCsrfCookie,
  extractClientIp,
  rejectCrossSiteRequest,
} from "@/lib/request-security";
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/constants";

/**
 * Program Login
 * POST /api/program/login
 *
 * Authenticates a program directly using the auto-generated email
 * ({program_code}@{institution_shortform}.c2x.ai) and the password
 * set by the institution admin.
 */
export async function POST(request: NextRequest) {
  const crossSiteError = rejectCrossSiteRequest(request);
  if (crossSiteError) {
    return NextResponse.json({ error: crossSiteError }, { status: 403 });
  }

  const ip = extractClientIp(request);

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
    const normalizedEmail = normalizeProgramIdentifier(email);
    const loginProgramCode = getProgramLookupCode(normalizedEmail);

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
        result.rows.find((row) =>
          matchesProgramLoginIdentifier(row, normalizedEmail),
        ) || null;

      if (!program) {
        // Dummy compare to avoid timing attacks
        await bcrypt.compare(password, "$2b$10$m3YKKwx6pa06cZpMGcmAsOGzrAaoaLnlhdwJm1GfGqfMmgr6hpfiq");
        return NextResponse.json({ error: "No such Program found with this email or code." }, { status: 401 });
      }

      if (!program.password_hash) {
        return NextResponse.json({ 
          error: "Password not set for this program. Please contact the Institution Admin to set your password." 
        }, { status: 401 });
      }

      // Verify password
      const match = await bcrypt.compare(password, program.password_hash);
      if (!match) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      // Sign a JWT scoped to this program
      const session = buildProgramSessionPayload(program);
      const token = await signToken(session);

      const response = NextResponse.json({
        ok: true,
        role: session.role,
        program: {
          id: program.id,
          name: program.program_name,
          code: program.program_code,
          email: program.email,
          institution: program.institution_name,
        },
        redirect: session.redirect,
      });

      const cookieOptions = createSessionCookieOptions(3600);
      response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions);
      response.cookies.set(LEGACY_AUTH_COOKIE_NAME, token, cookieOptions);
      attachCsrfCookie(response, 3600);

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
