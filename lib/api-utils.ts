import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndBlocklist } from "./auth";
import {
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
} from "./constants";
import { isRoleAllowed, normalizeRole } from "./auth-routing";

export type AuthorizedContext = {
  userId: string;
  email: string;
  role: string;
  institutionId?: string;
  programId?: string;
  stakeholderId?: string;
};

/**
 * Validates the session token, checks blocklist, and enforces role permissions.
 * @param request The incoming Next.js request
 * @param allowedRoles Array of roles permitted to access this resource
 * @returns The authorized user context or a NextResponse error
 */
export async function authorize(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<AuthorizedContext | NextResponse> {
  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get(LEGACY_AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized: No session found." }, { status: 401 });
  }

  const payload = await verifyTokenAndBlocklist(token);

  if (!payload || !payload.id) {
    return NextResponse.json({ error: "Unauthorized: Session invalid or expired." }, { status: 401 });
  }

  const userContext: AuthorizedContext = {
    userId: payload.id as string,
    email: payload.email as string,
    role: normalizeRole(payload.role as string) ?? String(payload.role || ""),
    institutionId: payload.institution_id as string,
    programId: payload.program_id as string,
    stakeholderId: payload.stakeholder_ref_id as string,
  };

  if (!isRoleAllowed(userContext.role, allowedRoles)) {
    return NextResponse.json(
      { error: `Forbidden: Access denied for role '${userContext.role}'.` },
      { status: 403 }
    );
  }

  return userContext;
}

/**
 * Standardized error handler for unauthorized/forbidden access.
 */
export function isAuthorized(context: AuthorizedContext | NextResponse): context is AuthorizedContext {
  return !(context instanceof NextResponse);
}
