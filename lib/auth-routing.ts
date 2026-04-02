export function getRoleDashboardPath(
  role?: string | null,
  programId?: string | null,
) {
  switch ((role || "").toUpperCase()) {
    case "SUPER_ADMIN":
      return "/dashboard";
    case "INSTITUTE_ADMIN":
    case "INSTITUTION_ADMIN":
    case "INSTITUTION_ADMINISTRATOR":
      return "/institution/dashboard";
    case "PROGRAM_ADMIN":
      return "/program/dashboard";
    default:
      return "/institution/dashboard";
  }
}
