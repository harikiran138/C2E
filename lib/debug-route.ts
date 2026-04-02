import { NextResponse } from "next/server";

function isDebugEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DEBUG_ROUTES === "true"
  );
}

export function ensureDebugRouteEnabled() {
  if (isDebugEnabled()) {
    return null;
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
