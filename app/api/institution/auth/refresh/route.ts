import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { signToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("institution_refresh")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token provided" },
        { status: 401 },
      );
    }

    // 1. Verify token structure/expiry
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    const institutionId = payload.id as string;

    const client = await pool.connect();
    try {
      // 2. Fetch stored hash
      const result = await client.query(
        "SELECT refresh_token_hash, email, onboarding_status FROM public.institutions WHERE id = $1 LIMIT 1",
        [institutionId],
      );

      const institution = result.rows[0];
      if (!institution || !institution.refresh_token_hash) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 401 },
        );
      }

      // 3. Verify against DB hash
      const isMatch = await bcrypt.compare(
        refreshToken,
        institution.refresh_token_hash,
      );
      if (!isMatch) {
        // Potential token reuse/leak? In a strict system we might invalidate all sessions here.
        // For now, just reject.
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }

      // 4. Generate new tokens (Rotation)
      const newAccessToken = await signToken({
        id: institutionId,
        email: institution.email,
        role: "institution_admin",
        onboarding_status: institution.onboarding_status || "PENDING",
      });

      const newRefreshToken = await signRefreshToken({
        id: institutionId,
        version: ((payload.version as number) || 0) + 1,
      });

      // 5. Update DB hash
      const newHash = await bcrypt.hash(newRefreshToken, 10);
      await client.query(
        "UPDATE public.institutions SET refresh_token_hash = $1 WHERE id = $2",
        [newHash, institutionId],
      );

      const response = NextResponse.json({ ok: true });

      // 6. Set Cookies
      const isProduction = process.env.NODE_ENV === "production";
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax" as const,
        path: "/",
      };

      response.cookies.set("institution_token", newAccessToken, {
        ...cookieOptions,
        maxAge: 15 * 60, // 15 minutes
      });

      response.cookies.set("institution_refresh", newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Refresh Token Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
