import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

function IsInvalidUUIDError(error: any): boolean {
  return String(error?.code || "") === "22P02";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();
    const curriculumId = String(searchParams.get("curriculumId") || "").trim();

    if (!programId || !isValidUUID(programId)) {
      return NextResponse.json({ error: "Valid programId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    let query = supabase
      .from("curriculum_obe_mappings")
      .select("*")
      .eq("program_id", programId);

    if (curriculumId && isValidUUID(curriculumId)) {
      query = query.eq("curriculum_id", curriculumId);
    } else {
      // If curriculumId is missing or "undefined"/"null", we default to null filtering
      if (!curriculumId || curriculumId.toLowerCase() === "undefined" || curriculumId.toLowerCase() === "null") {
        query = query.is("curriculum_id", null);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ mappings: data ?? [] });
  } catch (error: any) {
    console.error("OBE mappings fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch OBE mappings" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const programId = String(body.programId || "").trim();
    const curriculumId = String(body.curriculumId || "").trim() || null;
    const mappings = body.mappings; // Expecting Map or Record object

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    if (!mappings || typeof mappings !== "object") {
      return NextResponse.json({ error: "mappings object is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Prepare rows for upsert
    const rows = Object.entries(mappings).map(([courseCode, mapping]: [string, any]) => ({
      program_id: programId,
      curriculum_id: curriculumId,
      course_code: courseCode,
      is_obe_core: !!mapping.isOBECore,
      category_override: mapping.categoryOverride || null,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error } = await supabase.from("curriculum_obe_mappings").upsert(rows, {
      onConflict: "program_id, curriculum_id, course_code",
    });

    if (error) throw error;

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error: any) {
    console.error("OBE mappings save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save OBE mappings" },
      { status: 500 },
    );
  }
}
