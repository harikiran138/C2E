import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { signToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * v5.1 Institute & Program Isolated Login
 * Path: /api/auth/institute/login
 * Rules: ONLY Institute & Program Roles. No hints for Super Admin.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  
  try {
    // 1. Rate Limiting
    if (!checkRateLimit({ ip, limit: 10, windowMs: 60000 })) {
      return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });
    }

    const { identifier, password, institution_id, program_id } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // 2. Identify User in Unified v5.1 Auth Node
      // Support login via email (standard) or program_code (via subquery join)
      // v5.1 Optimization: If institution_id/program_id are provided, verify membership
      let queryStr = `
        SELECT u.*, p.program_code 
        FROM public.users u
        LEFT JOIN public.programs p ON u.program_id = p.id
        WHERE (LOWER(u.email) = LOWER($1) OR LOWER(p.program_code) = LOWER($1))
      `;
      const queryParams: any[] = [identifier.trim()];

      if (institution_id) {
        queryStr += ` AND u.institution_id = $${queryParams.length + 1}`;
        queryParams.push(institution_id);
      }
      if (program_id) {
        queryStr += ` AND u.program_id = $${queryParams.length + 1}`;
        queryParams.push(program_id);
      }

      queryStr += " LIMIT 1";
      
      const res = await client.query(queryStr, queryParams);
      const user = res.rows[0];

      if (!user) {
        // If not found with filters, check if user exists at all to provide specific error
        const globalCheck = await client.query('SELECT id FROM public.users WHERE LOWER(email) = LOWER($1) OR id IN (SELECT user_id FROM public.users WHERE LOWER(email) = LOWER($1)) LIMIT 1', [identifier.trim()]);
        
        if (globalCheck.rows.length > 0) {
           return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      // 3. Strict Role Isolation (The Wall)
      // v5.1 Policy: If user is SUPER_ADMIN, REJECT on this path.
      if (user.role === 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      // 4. Authenticate
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
          return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      // 5. Issue Unified v5.1 Token
      const token = await signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        institution_id: user.institution_id,
        program_id: user.program_id,
        v: "5.1"
      });

      const response = NextResponse.json({ 
        ok: true, 
        role: user.role,
        redirect: user.role === 'INSTITUTE_ADMIN' ? '/institution/dashboard' : '/program/dashboard'
      });

      // 6. Master Auth Cookie
      response.cookies.set("c2e_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600 // 1 hour for v5.1 production sessions
      });

      return response;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Auth Failure:", error);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
}
