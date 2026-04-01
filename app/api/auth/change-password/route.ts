import { NextRequest, NextResponse } from "next/server";
import { authorize, isAuthorized } from "@/lib/api-utils";
import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { blockToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const context = await authorize(request);

  if (!isAuthorized(context)) {
    return context; // Returns the 401/403 response
  }

  try {
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Old and new passwords are required." },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // 1. Fetch current password hash
      const userResult = await client.query(
        "SELECT password_hash FROM public.users WHERE id = $1 LIMIT 1",
        [context.userId]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      const currentHash = userResult.rows[0].password_hash;

      // 2. Verify old password
      const isMatch = await bcrypt.compare(oldPassword, currentHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Incorrect current password." },
          { status: 400 }
        );
      }

      // 3. Hash new password
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      // 4. Update database
      await client.query(
        "UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [newHash, context.userId]
      );

      // 5. Success
      return NextResponse.json({ 
        success: true, 
        message: "Password updated successfully." 
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
