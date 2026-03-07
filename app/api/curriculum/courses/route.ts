import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: courses, error } = await supabase
      .from("curriculum_generated_courses")
      .select("*")
      .eq("program_id", programId)
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
