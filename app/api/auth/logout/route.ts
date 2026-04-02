import { NextRequest, NextResponse } from "next/server";
import { blockToken, verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("c2e_auth_token")?.value || 
                request.cookies.get("institution_token")?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.exp) {
      // Add to blocklist until the token would have naturally expired
      await blockToken(token, new Date(payload.exp * 1000));
    }
  }

  const response = NextResponse.json({ ok: true });
  
  // Clear all potential auth cookies
  const allCookies = request.cookies.getAll();
  const cookiesToClear = [
    "c2e_auth_token",
    "institution_token",
    "institution_refresh",
    "stakeholder_token",
    "sb-access-token",
    "sb-refresh-token",
    "next-auth.session-token",
    "next-auth.csrf-token",
    "next-auth.callback-url",
  ];

  // Also catch any Supabase-prefixed cookies
  allCookies.forEach(cookie => {
    if (cookie.name.startsWith("sb-")) {
      cookiesToClear.push(cookie.name);
    }
  });

  cookiesToClear.forEach(name => {
    response.cookies.set(name, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
  });

  return response;
}
