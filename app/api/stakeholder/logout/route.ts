import { NextResponse, NextRequest } from "next/server";
import { blockToken, verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("stakeholder_token")?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload && payload.exp) {
      await blockToken(token, new Date(payload.exp * 1000));
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("stakeholder_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
