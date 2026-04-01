import { NextRequest, NextResponse } from "next/server";
import { blockToken, verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("c2e_auth_token")?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.exp) {
      // Add to blocklist until the token would have naturally expired
      await blockToken(token, new Date(payload.exp * 1000));
    }
  }

  const response = NextResponse.json({ ok: true });
  
  // Clear the master auth cookie
  response.cookies.set("c2e_auth_token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
