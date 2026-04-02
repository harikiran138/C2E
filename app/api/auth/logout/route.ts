import { NextRequest, NextResponse } from "next/server";
import { blockToken, verifyToken } from "@/lib/auth";
import { CSRF_COOKIE_NAME } from "@/lib/constants";
import { rejectCrossSiteRequest, verifyCsrfToken } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const crossSiteError = rejectCrossSiteRequest(request);
  if (crossSiteError) {
    return NextResponse.json({ error: crossSiteError }, { status: 403 });
  }

  const csrfError = verifyCsrfToken(request);
  if (csrfError) {
    return NextResponse.json({ error: csrfError }, { status: 403 });
  }

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
    CSRF_COOKIE_NAME,
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
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });
  });

  return response;
}
