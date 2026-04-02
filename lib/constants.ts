export const AUTH_COOKIE_NAME = "c2e_auth_token";
export const LEGACY_AUTH_COOKIE_NAME = "institution_token";
export const REFRESH_COOKIE_NAME = "institution_refresh";
export const STAKEHOLDER_COOKIE_NAME = "stakeholder_token";
export const CSRF_COOKIE_NAME = "c2e_csrf_token";

export const ROLE_ALIASES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  INSTITUTE_ADMIN: "INSTITUTE_ADMIN",
  INSTITUTION_ADMIN: "INSTITUTE_ADMIN",
  INSTITUTION_ADMINISTRATOR: "INSTITUTE_ADMIN",
  INSTITUTION_ADMINISTRATOR_PORTAL: "INSTITUTE_ADMIN",
  INSTITUTION_ADMIN_INTERNAL: "INSTITUTE_ADMIN",
  INSTITUTION_ADMINISTRATOR_UI: "INSTITUTE_ADMIN",
  PROGRAM_ADMIN: "PROGRAM_ADMIN",
  STAKEHOLDER: "STAKEHOLDER",
} as const;

export type CanonicalRole =
  | "SUPER_ADMIN"
  | "INSTITUTE_ADMIN"
  | "PROGRAM_ADMIN"
  | "STAKEHOLDER";

export const PROGRAM_DASHBOARD_PATH = "/program/dashboard";
export const INSTITUTION_DASHBOARD_PATH = "/institution/dashboard";
export const SUPER_ADMIN_DASHBOARD_PATH = "/dashboard";
export const STAKEHOLDER_DASHBOARD_PATH = "/stakeholder/dashboard";

export const AI_RATE_LIMIT = {
  limit: 5,
  windowMs: 60_000,
} as const;
