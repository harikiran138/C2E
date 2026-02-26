import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { verifyToken } from '@/lib/auth';

type FeedbackCycle = 'brainstorming' | 'finalization';

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('institution_token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.id) return null;
  return String(payload.id);
}

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isFeedbackCycle(value: unknown): value is FeedbackCycle {
  return value === 'brainstorming' || value === 'finalization';
}

async function assertProgramOwnership(programId: string, institutionId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, program_name, vmpeo_feedback_start_at, vmpeo_feedback_end_at, vmpeo_feedback_cycle FROM programs WHERE id = $1 AND institution_id = $2 LIMIT 1',
      [programId, institutionId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    if (!programId) {
      return NextResponse.json({ error: 'programId is required' }, { status: 400 });
    }

    const program = await assertProgramOwnership(programId, institutionId);
    if (!program) {
      return NextResponse.json({ error: 'Program not found or unauthorized' }, { status: 404 });
    }

    const now = new Date();
    const startAt = program.vmpeo_feedback_start_at ? new Date(program.vmpeo_feedback_start_at) : null;
    const endAt = program.vmpeo_feedback_end_at ? new Date(program.vmpeo_feedback_end_at) : null;
    const isOpen = !!(startAt && endAt && now >= startAt && now <= endAt);

    return NextResponse.json({
      programId,
      programName: program.program_name,
      feedbackCycle: (program.vmpeo_feedback_cycle || 'brainstorming') as FeedbackCycle,
      feedbackStartAt: startAt ? startAt.toISOString() : null,
      feedbackEndAt: endAt ? endAt.toISOString() : null,
      isOpen,
    });
  } catch (error: any) {
    console.error('Timeline GET error:', error);
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
    const { programId, feedbackStartAt, feedbackEndAt, feedbackCycle } = body || {};

    if (!programId || typeof programId !== 'string') {
      return NextResponse.json({ error: 'programId is required' }, { status: 400 });
    }

    const parsedStart = parseDateInput(feedbackStartAt);
    const parsedEnd = parseDateInput(feedbackEndAt);
    if (!parsedStart || !parsedEnd) {
      return NextResponse.json({ error: 'Valid feedbackStartAt and feedbackEndAt are required' }, { status: 400 });
    }

    if (parsedEnd < parsedStart) {
      return NextResponse.json({ error: 'feedbackEndAt must be after feedbackStartAt' }, { status: 400 });
    }

    if (!isFeedbackCycle(feedbackCycle)) {
      return NextResponse.json({ error: 'feedbackCycle must be brainstorming or finalization' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const ownershipRes = await client.query(
        'SELECT id FROM programs WHERE id = $1 AND institution_id = $2 LIMIT 1',
        [programId, institutionId]
      );

      if (ownershipRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Program not found or unauthorized' }, { status: 404 });
      }

      const updateRes = await client.query(
        `UPDATE programs
         SET vmpeo_feedback_start_at = $1,
             vmpeo_feedback_end_at = $2,
             vmpeo_feedback_cycle = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, vmpeo_feedback_start_at, vmpeo_feedback_end_at, vmpeo_feedback_cycle`,
        [parsedStart.toISOString(), parsedEnd.toISOString(), feedbackCycle, programId]
      );

      await client.query('COMMIT');

      const updated = updateRes.rows[0];
      return NextResponse.json({
        ok: true,
        programId: updated.id,
        feedbackStartAt: updated.vmpeo_feedback_start_at ? new Date(updated.vmpeo_feedback_start_at).toISOString() : null,
        feedbackEndAt: updated.vmpeo_feedback_end_at ? new Date(updated.vmpeo_feedback_end_at).toISOString() : null,
        feedbackCycle: updated.vmpeo_feedback_cycle as FeedbackCycle,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Timeline PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
