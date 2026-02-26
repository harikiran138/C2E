import pool from '@/lib/postgres';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('institution_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.id) return null;
  return String(payload.id);
}

const SELECT_FIELDS = `
  rs.id,
  rs.program_id,
  rs.member_name,
  rs.member_id,
  rs.organization,
  rs.email,
  rs.mobile_number,
  rs.specialisation,
  rs.category,
  rs.linkedin_id,
  rs.is_approved,
  rs.last_login_at,
  rs.created_at,
  rs.updated_at
`;

const RETURNING_FIELDS = `
  id,
  program_id,
  member_name,
  member_id,
  organization,
  email,
  mobile_number,
  specialisation,
  category,
  linkedin_id,
  is_approved,
  last_login_at,
  created_at,
  updated_at
`;

const RETURNING_FIELDS_WITH_ALIAS = `
  rs.id,
  rs.program_id,
  rs.member_name,
  rs.member_id,
  rs.organization,
  rs.email,
  rs.mobile_number,
  rs.specialisation,
  rs.category,
  rs.linkedin_id,
  rs.is_approved,
  rs.last_login_at,
  rs.created_at,
  rs.updated_at
`;

export async function GET(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const memberId = searchParams.get('id');

    const client = await pool.connect();
    try {
      let queryText = `
        SELECT ${SELECT_FIELDS}
        FROM representative_stakeholders rs
        INNER JOIN programs p ON p.id = rs.program_id
        WHERE p.institution_id = $1
      `;
      const params: any[] = [institutionId];

      if (programId) {
        params.push(programId);
        queryText += ` AND rs.program_id = $${params.length}`;
      }

      if (memberId) {
        params.push(memberId);
        queryText += ` AND rs.id = $${params.length}`;
      }

      queryText += ' ORDER BY rs.created_at ASC';

      const result = await client.query(queryText, params);
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Stakeholders API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const isApproved = Boolean(body.is_approved);
    const rawPassword = String(body.stakeholder_password || '').trim();

    if (!body.program_id || !body.member_name || !body.member_id || !body.email) {
      return NextResponse.json(
        { error: 'program_id, member_name, member_id and email are required.' },
        { status: 400 }
      );
    }

    if (isApproved && rawPassword.length < 8) {
      return NextResponse.json(
        { error: 'Approved stakeholders must have a password of at least 8 characters.' },
        { status: 400 }
      );
    }

    const passwordHash = rawPassword ? await bcrypt.hash(rawPassword, 10) : null;

    const client = await pool.connect();
    try {
      const ownershipRes = await client.query(
        'SELECT id FROM programs WHERE id = $1 AND institution_id = $2 LIMIT 1',
        [body.program_id, institutionId]
      );

      if (ownershipRes.rows.length === 0) {
        return NextResponse.json({ error: 'Program not found or unauthorized.' }, { status: 404 });
      }

      const result = await client.query(
        `INSERT INTO representative_stakeholders (
            program_id,
            member_name,
            member_id,
            organization,
            email,
            mobile_number,
            specialisation,
            category,
            linkedin_id,
            is_approved,
            login_password_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${RETURNING_FIELDS}`,
        [
          String(body.program_id),
          String(body.member_name),
          String(body.member_id),
          body.organization ? String(body.organization) : null,
          String(body.email),
          body.mobile_number ? String(body.mobile_number) : null,
          body.specialisation ? String(body.specialisation) : null,
          body.category ? String(body.category) : null,
          body.linkedin_id ? String(body.linkedin_id) : null,
          isApproved,
          passwordHash,
        ]
      );

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Stakeholders API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Stakeholder ID is required for update' }, { status: 400 });
    }

    const rawPassword = String(fields.stakeholder_password || '').trim();
    const passwordHash = rawPassword ? await bcrypt.hash(rawPassword, 10) : null;

    const client = await pool.connect();
    try {
      const existingRes = await client.query(
        `SELECT rs.id, rs.login_password_hash
         FROM representative_stakeholders rs
         INNER JOIN programs p ON p.id = rs.program_id
         WHERE rs.id = $1 AND p.institution_id = $2
         LIMIT 1`,
        [id, institutionId]
      );

      if (existingRes.rows.length === 0) {
        return NextResponse.json({ error: 'Stakeholder not found or unauthorized' }, { status: 404 });
      }

      const nextApproved = Boolean(fields.is_approved);
      const effectivePasswordHash = passwordHash || existingRes.rows[0].login_password_hash || null;
      if (nextApproved && !effectivePasswordHash) {
        return NextResponse.json(
          { error: 'Approved stakeholder must have a login password.' },
          { status: 400 }
        );
      }

      const result = await client.query(
        `UPDATE representative_stakeholders rs
         SET member_name = $1,
             member_id = $2,
             organization = $3,
             email = $4,
             mobile_number = $5,
             specialisation = $6,
             category = $7,
             linkedin_id = $8,
             is_approved = $9,
             login_password_hash = $10,
             updated_at = CURRENT_TIMESTAMP
         FROM programs p
         WHERE rs.id = $11
           AND p.id = rs.program_id
           AND p.institution_id = $12
         RETURNING ${RETURNING_FIELDS_WITH_ALIAS}`,
        [
          fields.member_name ? String(fields.member_name) : null,
          fields.member_id ? String(fields.member_id) : null,
          fields.organization ? String(fields.organization) : null,
          fields.email ? String(fields.email) : null,
          fields.mobile_number ? String(fields.mobile_number) : null,
          fields.specialisation ? String(fields.specialisation) : null,
          fields.category ? String(fields.category) : null,
          fields.linkedin_id ? String(fields.linkedin_id) : null,
          nextApproved,
          effectivePasswordHash,
          id,
          institutionId,
        ]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
      }

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Stakeholders API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM representative_stakeholders rs
         USING programs p
         WHERE rs.id = $1
           AND p.id = rs.program_id
           AND p.institution_id = $2
         RETURNING rs.id`,
        [id, institutionId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Stakeholder not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Stakeholders API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
