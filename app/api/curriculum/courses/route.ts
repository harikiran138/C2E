import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();
    const versionId = String(searchParams.get("versionId") || "").trim();
    const curriculumId = String(searchParams.get("curriculumId") || "").trim();

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    let query = supabase
      .from("curriculum_generated_courses")
      .select("*")
      .eq("program_id", programId);

    if (curriculumId) {
      query = query.eq("curriculum_id", curriculumId);
    } else if (versionId) {
      query = query.eq("version_id", versionId);
    } else {
      query = query.is("version_id", null);
    }

    const { data: courses, error } = await query
      .order("semester", { ascending: true })
      .order("course_code", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ courses: courses ?? [] });
  } catch (error: any) {
    console.error("Courses fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
