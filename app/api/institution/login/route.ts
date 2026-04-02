import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { signToken, signRefreshToken } from "@/lib/auth"; // Updated import
import { checkRateLimit } from "@/lib/rate-limit"; // New utility
import { logAudit, ACTION_TYPES } from "@/lib/audit"; // New utility

export async function POST(request: NextRequest) {
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedIp || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const isLocalDev =
    process.env.NODE_ENV !== "production" &&
    (ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      ip === "localhost" ||
      ip === "unknown");

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
    const { email, password } = body;

    if (!email || !password) {
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
        [email.trim()],
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
        email: email.trim(),
        role: "INSTITUTE_ADMIN",
        institution_id: institution.id,
        onboarding_status: institution.onboarding_status || "PENDING",
      });

      const refreshToken = await signRefreshToken({
        id: institution.id,
        version: 1, // Simple versioning
      });

      // 7. Store Refresh Token Hash
      // We store the hash of the refresh token so if the DB is leaked, tokens can't be forged/used easily without the secret.
      // But for simplicity/rotation, storing the token itself or a hash is fine.
      // Let's store hash as per prompt requirement.
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

      // 9. Set Secure Cookies
      const isProduction = process.env.NODE_ENV === "production";
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax" as const, // Changed from strict to lax for better redirect stability
        path: "/",
      };

      // Access Token (15 min)
      response.cookies.set("institution_token", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60, // 15 minutes
      });

      response.cookies.set("c2e_auth_token", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60,
      });

      // Refresh Token (7 days)
      response.cookies.set("institution_refresh", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/api/institution/auth/refresh", // Restrict path if possible, but for rotation middleware might need it on root. Kept root for simplicity with middleware.
      });

      // Update path to root for refresh token to ensure middleware can see it if we want transparent refresh
      // Prompt said "Middleware must reject expired tokens... Automatically issue new access token using refresh token endpoint"
      // If middleware does it, it needs to see the cookie.
      response.cookies.set("institution_refresh", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Login error details:", error);
    return NextResponse.json(
      { error: `Login failed: ${error.message}` },
      { status: 500 },
    );
  }
}
