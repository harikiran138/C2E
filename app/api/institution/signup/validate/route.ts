import { NextRequest, NextResponse } from "next/server";
import { validateSignupPayload } from "@/lib/validation/onboarding";
import pool from "@/lib/postgres";

/**
 * POST /api/institution/signup/validate
 * Validates sign-up input and checks for duplicate institution name and email.
 * Uses direct pg query to avoid Supabase RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const institutionName = String(body.institutionName || "");
    const email = String(body.email || "");
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    const validationError = validateSignupPayload({
      institutionName,
      email,
      password,
      confirmPassword,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Check for duplicate institution name (case-insensitive)
      const dupInstitution = await client.query(
        "SELECT id FROM institutions WHERE LOWER(institution_name) = LOWER($1) LIMIT 1",
        [institutionName.trim()],
      );

      if (dupInstitution.rows.length > 0) {
        return NextResponse.json(
          { error: "An institution with this name is already registered." },
          { status: 409 },
        );
      }

      // Check for duplicate email (case-insensitive)
      const dupEmail = await client.query(
        "SELECT id FROM institutions WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [email.trim()],
      );

      if (dupEmail.rows.length > 0) {
        return NextResponse.json(
          { error: "This email is already registered." },
          { status: 409 },
        );
      }

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Validation failed." },
      { status: 500 },
    );
  }
}
