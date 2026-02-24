import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import {
  forbiddenProgramResponse,
  getAccessContext,
  hasProgramAccess,
  unauthorizedResponse,
} from '@/lib/auth/request-access';

export async function GET(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const requestedProgramId = searchParams.get('programId');

    const supabase = await createClient();

    let query = supabase
      .from('obe_framework')
      .select('*, programs(program_name)')
      .eq('institution_id', context.institutionId)
      .order('created_at', { ascending: true });

    if (context.mode === 'program') {
      query = query.eq('program_id', context.programId);
    } else if (requestedProgramId) {
      const canAccess = await hasProgramAccess(context, requestedProgramId);
      if (!canAccess) return forbiddenProgramResponse();
      query = query.eq('program_id', requestedProgramId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching Framework members:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('OBE Framework Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const body = await request.json();
    const requestedProgramId = String(body?.program_id || '');
    const programId = requestedProgramId || (context.mode === 'program' ? context.programId : '');

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const supabase = await createClient();

    const payload = {
      member_name: body.member_name || 'N/A',
      designation: body.designation || 'N/A',
      program_id: programId,
      email_official: body.email_official,
      email_personal: body.email_personal,
      mobile_official: body.mobile_official,
      mobile_personal: body.mobile_personal,
      linkedin_id: body.linkedin_id,
      pdf_url: body.pdf_url,
      pdf_name: body.pdf_name,
      title: body.title,
      description: body.description,
    };

    let query;

    if (body.id) {
      let updateQuery = supabase
        .from('obe_framework')
        .update(payload)
        .eq('id', body.id)
        .eq('institution_id', context.institutionId);

      if (context.mode === 'program') {
        updateQuery = updateQuery.eq('program_id', context.programId);
      }
      query = updateQuery.select().single();
    } else {
      query = supabase
        .from('obe_framework')
        .insert({
          institution_id: context.institutionId,
          ...payload,
        })
        .select()
        .single();
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error saving framework member:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('OBE Framework API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        if (body?.id) {
          id = String(body.id);
        }
      } catch {
        // ignore parse failures for empty body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    let query = supabase
      .from('obe_framework')
      .delete()
      .eq('id', id)
      .eq('institution_id', context.institutionId);

    if (context.mode === 'program') {
      query = query.eq('program_id', context.programId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting framework member:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OBE Framework DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
