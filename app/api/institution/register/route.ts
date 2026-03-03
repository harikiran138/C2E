import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { validateSignupPayload } from "@/lib/validation/onboarding";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { signToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    // 1. Rate Limiting (5 attempts / 15 mins)
    const isAllowed = checkRateLimit({
      ip,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const institutionName = String(body.institutionName || "");
    const email = String(body.email || "");
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    // 1. Validate Payload
    const validationError = validateSignupPayload({
      institutionName,
      email,
      password,
      confirmPassword,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // 2. Check for duplicates in DB
    const client = await pool.connect();
    try {
      const { rows: duplicate } = await client.query(
        "SELECT id FROM public.institutions WHERE LOWER(email) = LOWER($1) OR LOWER(institution_name) = LOWER($2) LIMIT 1",
        [email.trim(), institutionName.trim()],
      );

      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: "Institution name or email already registered." },
          { status: 409 },
        );
      }

      // 3. Hash Password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 4. Generate UUID
      const newId = uuidv4();

      // 5. Insert into DB
      const insertQuery = `
          INSERT INTO public.institutions (
            id,
            institution_name,
            email,
            password_hash,
            onboarding_status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `;

      await client.query(insertQuery, [
        newId,
        institutionName.trim(),
        email.trim(),
        hashedPassword,
        "PENDING",
      ]);

      console.log("Registered institution:", newId);

      // 6. Generate Session Token (JWT)
      const jwt = await signToken({
        id: newId,
        email: email.trim(),
        role: "institution_admin",
        onboarding_status: "PENDING",
      });

      const response = NextResponse.json({ ok: true, id: newId });
      response.cookies.set("institution_token", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return response;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error?.message || "Registration failed." },
      { status: 500 },
    );
  }
}
