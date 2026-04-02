import {
  INSTITUTION_DASHBOARD_PATH,
  PROGRAM_DASHBOARD_PATH,
  ROLE_ALIASES,
  type CanonicalRole,
  STAKEHOLDER_DASHBOARD_PATH,
  SUPER_ADMIN_DASHBOARD_PATH,
} from "./constants";

export function normalizeRole(role?: string | null): CanonicalRole | null {
  const normalized = (role || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "STAKEHOLDER") {
    return "STAKEHOLDER";
  }

  return ROLE_ALIASES[normalized as keyof typeof ROLE_ALIASES] ?? null;
}

export function isRoleAllowed(
  role: string | null | undefined,
  allowedRoles?: string[],
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  return allowedRoles.some((allowedRole) => {
    const normalizedAllowedRole = normalizeRole(allowedRole);
    return normalizedAllowedRole === normalizedRole;
  });
}

export function getRoleDashboardPath(
  role?: string | null,
  _programId?: string | null,
) {
  switch (normalizeRole(role)) {
    case "SUPER_ADMIN":
      return SUPER_ADMIN_DASHBOARD_PATH;
    case "INSTITUTE_ADMIN":
      return INSTITUTION_DASHBOARD_PATH;
    case "PROGRAM_ADMIN":
      return PROGRAM_DASHBOARD_PATH;
    case "STAKEHOLDER":
      return STAKEHOLDER_DASHBOARD_PATH;
    default:
      return INSTITUTION_DASHBOARD_PATH;
  }
}
