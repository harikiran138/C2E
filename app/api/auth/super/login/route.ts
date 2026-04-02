import { NextRequest, NextResponse } from "next/server";
import { createSessionCookieOptions, signToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import {
  attachCsrfCookie,
  extractClientIp,
  rejectCrossSiteRequest,
} from "@/lib/request-security";
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/constants";

/**
 * v5.2 Super Admin Database-Driven Login
 * Path: /api/auth/super/login
 * Rules: ONLY Super Admin. No hints for other roles.
 */
export async function POST(request: NextRequest) {
  const crossSiteError = rejectCrossSiteRequest(request);
  if (crossSiteError) {
    return NextResponse.json({ error: crossSiteError }, { status: 403 });
  }

  const ip = extractClientIp(request);
  
  try {
    // 1. Rate Limiting
    if (!checkRateLimit({ ip, limit: 10, windowMs: 60000 })) {
      return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });
    }

    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 2. Database Check for Super Admin
    const client = await pool.connect();
    let user;
    try {
      const res = await client.query(
        "SELECT id, email, password_hash, role FROM public.users WHERE email = $1 AND role = 'SUPER_ADMIN' LIMIT 1",
        [identifier]
      );
      user = res.rows[0];
    } finally {
      client.release();
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 3. Password Verification
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 4. Issue v5.1 Master Token (Updated version to 5.2 if needed, staying 5.1 for compatibility)
    const token = await signToken({
      id: user.id,
      email: user.email,
      role: "SUPER_ADMIN",
      v: "5.1"
    });

    const response = NextResponse.json({ 
      ok: true, 
      role: "SUPER_ADMIN",
      redirect: "/dashboard"
    });

    const cookieOptions = createSessionCookieOptions(3600);
    response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions);
    response.cookies.set(LEGACY_AUTH_COOKIE_NAME, token, cookieOptions);
    attachCsrfCookie(response, 3600);

    return response;

  } catch (error) {
    console.error("Super Admin Login Error:", error);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
}
