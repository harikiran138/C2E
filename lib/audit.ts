import pool from "@/lib/postgres";

export const ACTION_TYPES = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  TOKEN_REFRESH: "TOKEN_REFRESH",
  ONBOARDING_COMPLETE: "ONBOARDING_COMPLETE",
  REGISTER: "REGISTER",
};

interface AuditLogEntry {
  institutionId?: string;
  programId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const { institutionId, programId, action, ipAddress, userAgent, details } =
      entry;

    // The current production audit_logs table is program-scoped.
    // Skip auth-only events until a dedicated auth audit schema exists.
    if (!programId) {
      return;
    }

    // Fire and forget - don't await/block main thread significantly
    pool
      .query(
        `INSERT INTO public.audit_logs (program_id, event_type, details, created_by)
         VALUES ($1, $2, $3, $4)`,
        [
          programId,
          action,
          JSON.stringify({
            ...(details && typeof details === "object" ? details : {}),
            ip_address: ipAddress || null,
            user_agent: userAgent || null,
          }),
          institutionId || null,
        ],
      )
      .catch((err) => {
        console.error("Audit Log Error:", err);
      });
  } catch (error) {
    console.error("Failed to initiate audit log:", error);
  }
}
