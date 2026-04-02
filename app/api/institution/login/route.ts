import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import {
  createSessionCookieOptions,
  signRefreshToken,
  signToken,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit"; // New utility
import { logAudit, ACTION_TYPES } from "@/lib/audit"; // New utility
import {
  attachCsrfCookie,
  extractClientIp,
  rejectCrossSiteRequest,
} from "@/lib/request-security";
import {
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "@/lib/constants";

export async function POST(request: NextRequest) {
  const crossSiteError = rejectCrossSiteRequest(request);
  if (crossSiteError) {
    return NextResponse.json({ error: crossSiteError }, { status: 403 });
  }

  const ip = extractClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const isLocalDev =
    process.env.NODE_ENV !== "production" &&
    (ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      ip === "localhost");

  try {
    // 1. Rate Limiting (5 attempts / 15 mins)
    if (!isLocalDev) {
      const isAllowed = checkRateLimit({
        ip,
        limit: 5,
        windowMs: 15 * 60 * 1000,
      });
      if (!isAllowed) {
        return NextResponse.json(
          { error: "Too many login attempts. Please try again later." },
          { status: 429 },
        );
      }
    }

    const body = await request.json();
    const rawEmail = String(body?.email || "").trim();
    const password = String(body?.password || "");
    const normalizedEmail = rawEmail.toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      // 2. Fetch User & Security Fields
      const result = await client.query(
        "SELECT id, password_hash, onboarding_status, failed_attempts, locked_until FROM public.institutions WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [normalizedEmail],
      );

      const institution = result.rows[0];

      // Standardized Error Response (Prevent Enumeration)
      const invalidCredsResponse = () =>
        NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

      if (!institution || !institution.password_hash) {
        // Fake comparison to prevent timing attacks (optional but good practice)
        await bcrypt.compare(password, "$2b$10$abcdefghijklmnopqrstuv");
        return invalidCredsResponse();
      }

      // 3. Check Account Lock
      if (
        institution.locked_until &&
        new Date() < new Date(institution.locked_until)
      ) {
        await logAudit({
          institutionId: institution.id,
          action: ACTION_TYPES.ACCOUNT_LOCKED,
          ipAddress: ip,
          userAgent,
          details: { reason: "Login attempted while locked" },
        });
        return NextResponse.json(
          {
            error:
              "Account is locked due to too many failed attempts. Try again in 15 minutes.",
          },
          { status: 403 },
        );
      }

      // 4. Verify Password
      const match = await bcrypt.compare(password, institution.password_hash);

      if (!match) {
        // Increment failed attempts
        const newFailedAttempts = (institution.failed_attempts || 0) + 1;
        let lockUpdate = "";
        let confirmLock = false;

        if (newFailedAttempts >= 5) {
          confirmLock = true;
          // Lock for 15 minutes
          const lockTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await client.query(
            "UPDATE public.institutions SET failed_attempts = $1, locked_until = $2 WHERE id = $3",
            [newFailedAttempts, lockTime, institution.id],
          );
        } else {
          await client.query(
            "UPDATE public.institutions SET failed_attempts = $1 WHERE id = $2",
            [newFailedAttempts, institution.id],
          );
        }

        await logAudit({
          institutionId: institution.id,
          action: ACTION_TYPES.LOGIN_FAILURE,
          ipAddress: ip,
          userAgent,
          details: { failedAttempts: newFailedAttempts, locked: confirmLock },
        });

        return invalidCredsResponse();
      }

      // 5. Login Success: Reset security counters
      if (institution.failed_attempts > 0 || institution.locked_until) {
        await client.query(
          "UPDATE public.institutions SET failed_attempts = 0, locked_until = NULL WHERE id = $1",
          [institution.id],
        );
      }

      // 6. Generate Tokens
      const accessToken = await signToken({
        id: institution.id,
        email: normalizedEmail,
        role: "INSTITUTE_ADMIN",
        institution_id: institution.id,
        onboarding_status: institution.onboarding_status || "PENDING",
      });

      const refreshToken = await signRefreshToken({
        id: institution.id,
        version: 1, // Simple versioning
      });

      // 7. Store Refresh Token Hash
      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      await client.query(
        "UPDATE public.institutions SET refresh_token_hash = $1 WHERE id = $2",
        [refreshTokenHash, institution.id],
      );

      // 8. Audit Log
      await logAudit({
        institutionId: institution.id,
        action: ACTION_TYPES.LOGIN_SUCCESS,
        ipAddress: ip,
        userAgent,
      });

      const response = NextResponse.json({ ok: true, id: institution.id });
      const accessCookieOptions = createSessionCookieOptions(15 * 60);
      const refreshCookieOptions = createSessionCookieOptions(7 * 24 * 60 * 60);

      response.cookies.set(LEGACY_AUTH_COOKIE_NAME, accessToken, accessCookieOptions);
      response.cookies.set(AUTH_COOKIE_NAME, accessToken, accessCookieOptions);
      response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
      attachCsrfCookie(response, 15 * 60);

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "An internal error occurred during login. Please try again." },
      { status: 500 },
    );
  }
}
