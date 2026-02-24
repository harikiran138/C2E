import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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
    const programId = requestedProgramId || (context.mode === 'program' ? context.programId : '');

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const supabase = await createClient();

    const [categoryCreditsResponse, electivesSettingsResponse, semesterCategoriesResponse] = await Promise.all([
      supabase.from('curriculum_category_credits').select('*').eq('program_id', programId),
      supabase.from('curriculum_electives_settings').select('*').eq('program_id', programId).single(),
      supabase.from('curriculum_semester_categories').select('*').eq('program_id', programId),
    ]);

    if (categoryCreditsResponse.error) throw categoryCreditsResponse.error;
    if (semesterCategoriesResponse.error) throw semesterCategoriesResponse.error;
    if (electivesSettingsResponse.error && electivesSettingsResponse.error.code !== 'PGRST116') {
      throw electivesSettingsResponse.error;
    }

    return NextResponse.json({
      categoryCredits: categoryCreditsResponse.data || [],
      electivesSettings: electivesSettingsResponse.data || null,
      semesterCategories: semesterCategoriesResponse.data || [],
    });
  } catch (error: any) {
    console.error('Error fetching curriculum structure:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch curriculum structure' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAccessContext(request);
    if (!context) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const requestedProgramId = searchParams.get('programId');
    const programId = requestedProgramId || (context.mode === 'program' ? context.programId : '');

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 });
    }

    const canAccess = await hasProgramAccess(context, programId);
    if (!canAccess) return forbiddenProgramResponse();

    const body = await request.json();
    const { categoryCredits, electivesSettings, semesterCategories } = body;

    const supabase = await createClient();

    if (categoryCredits && Array.isArray(categoryCredits)) {
      const formattedCategoryCredits = categoryCredits.map((item: any) => ({
        ...item,
        program_id: programId,
      }));
      const { error } = await supabase
        .from('curriculum_category_credits')
        .upsert(formattedCategoryCredits, { onConflict: 'program_id, category_code' });
      if (error) throw error;
    }

    if (electivesSettings) {
      const formattedElectivesSettings = {
        ...electivesSettings,
        program_id: programId,
      };
      const { error } = await supabase
        .from('curriculum_electives_settings')
        .upsert(formattedElectivesSettings, { onConflict: 'program_id' });
      if (error) throw error;
    }

    if (semesterCategories && Array.isArray(semesterCategories)) {
      const formattedSemesterCategories = semesterCategories.map((item: any) => ({
        ...item,
        program_id: programId,
      }));
      const { error } = await supabase
        .from('curriculum_semester_categories')
        .upsert(formattedSemesterCategories, { onConflict: 'program_id, semester' });
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Curriculum structure saved successfully' });
  } catch (error: any) {
    console.error('Error saving curriculum structure:', error);
    return NextResponse.json({ error: error.message || 'Failed to save curriculum structure' }, { status: 500 });
  }
}
