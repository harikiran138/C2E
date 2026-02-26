import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '@/lib/postgres';
import { verifyToken } from '@/lib/auth';

type StakeholderTokenPayload = {
  role?: string;
  stakeholder_ref_id?: string;
};

async function getStakeholderId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('stakeholder_token')?.value;
  if (!token) return null;
  const payload = (await verifyToken(token)) as StakeholderTokenPayload | null;
  if (!payload || payload.role !== 'stakeholder' || !payload.stakeholder_ref_id) return null;
  return String(payload.stakeholder_ref_id);
}

export async function POST(request: NextRequest) {
  try {
    const stakeholderRefId = await getStakeholderId(request);
    if (!stakeholderRefId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = String(body?.current_password || '');
    const newPassword = String(body?.new_password || '');

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'current_password and new_password are required.' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT login_password_hash
         FROM representative_stakeholders
         WHERE id = $1
         LIMIT 1`,
        [stakeholderRefId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Stakeholder record not found.' }, { status: 404 });
      }

      const existingHash = result.rows[0].login_password_hash;
      if (!existingHash) {
        return NextResponse.json({ error: 'Password not configured for stakeholder.' }, { status: 400 });
      }

      const matches = await bcrypt.compare(currentPassword, existingHash);
      if (!matches) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
      }

      const nextHash = await bcrypt.hash(newPassword, 10);
      await client.query(
        `UPDATE representative_stakeholders
         SET login_password_hash = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [nextHash, stakeholderRefId]
      );

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Stakeholder change password error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 500 });
  }
}
