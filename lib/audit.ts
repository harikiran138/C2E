import pool from '@/lib/postgres';

export const ACTION_TYPES = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  ONBOARDING_COMPLETE: 'ONBOARDING_COMPLETE',
  REGISTER: 'REGISTER',
};

interface AuditLogEntry {
  institutionId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const { institutionId, action, ipAddress, userAgent, details } = entry;
    
    // Fire and forget - don't await/block main thread significantly
    pool.query(
      `INSERT INTO public.audit_logs (institution_id, action, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [institutionId || null, action, ipAddress || null, userAgent || null, details ? JSON.stringify(details) : null]
    ).catch(err => {
      console.error('Audit Log Error:', err);
    });
  } catch (error) {
    console.error('Failed to initiate audit log:', error);
  }
}
