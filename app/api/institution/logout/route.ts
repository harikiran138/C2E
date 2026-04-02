import { NextResponse, NextRequest } from "next/server";
import { blockToken, verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token =
    request.cookies.get("c2e_auth_token")?.value ||
    request.cookies.get("institution_token")?.value;

  if (token) {
    const tokenPayload = await verifyToken(token);
    if (tokenPayload && tokenPayload.exp) {
      await blockToken(token, new Date(tokenPayload.exp * 1000));
    }
  }

  const response = NextResponse.json({ ok: true });

  ["c2e_auth_token", "institution_token", "institution_refresh"].forEach(
    (name) => {
      response.cookies.set(name, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
      });
    },
  );

  return response;
}
