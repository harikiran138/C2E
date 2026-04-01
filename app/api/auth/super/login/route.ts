import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * v5.1 Super Admin Isolated Login
 * Path: /api/auth/super/login
 * Rules: ONLY Super Admin. No hints for other roles.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  
  try {
    // 1. Rate Limiting
    if (!checkRateLimit({ ip, limit: 5, windowMs: 60000 })) {
      return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });
    }

    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 2. Strict Super Admin Check (Environment Based)
    const isSuper = (
        identifier === process.env.SUPER_ADMIN_EMAIL && 
        password === process.env.SUPER_ADMIN_PASSWORD
    );

    if (!isSuper) {
      // Forbidden or Incorrect Roles
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 3. Issue v5.1 Master Token
    const token = await signToken({
      id: "00000000-0000-0000-0000-000000000000",
      email: identifier,
      role: "SUPER_ADMIN",
      v: "5.1"
    });

    const response = NextResponse.json({ 
      ok: true, 
      role: "SUPER_ADMIN",
      redirect: "/super-admin/dashboard"
    });

    // 4. Master Auth Cookie
    response.cookies.set("c2e_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600 // 1 hour
    });

    return response;

  } catch (error) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
}
