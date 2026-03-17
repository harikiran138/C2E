import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function isSchemaColumnError(error: any): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "42703" || // undefined_column
    code === "22P02" || // invalid_text_representation (invalid UUID)
    message.includes("schema cache") ||
    message.includes("column")
  );
}

function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return (
    String(error?.code || "") === "42P01" ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();
    const versionId = String(searchParams.get("versionId") || "").trim();
    const curriculumId = String(searchParams.get("curriculumId") || "").trim();

    if (!programId || !isValidUUID(programId)) {
      return NextResponse.json({ error: "Valid programId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const baseQuery = supabase
      .from("curriculum_generated_courses")
      .select("*")
      .eq("program_id", programId);

    let query = baseQuery;

    if (curriculumId && isValidUUID(curriculumId)) {
      query = query.eq("curriculum_id", curriculumId);
    } else if (versionId && isValidUUID(versionId)) {
      query = query.eq("version_id", versionId);
    } else {
      // If neither is provided OR if they were invalid strings like "undefined", 
      // we default to no version filtering to avoid Postgres type errors.
      // In the original logic, it tried version_id IS NULL.
      if (!curriculumId && !versionId) {
        query = query.is("version_id", null);
      }
    }

    let { data: courses, error } = await query
      .order("semester", { ascending: true })
      .order("course_code", { ascending: true });

    if (error && isSchemaColumnError(error)) {
      console.warn("Retrying courses fetch with fallback due to error:", error.code, error.message);
      const fallback = await baseQuery
        .order("semester", { ascending: true })
        .order("course_code", { ascending: true });
      courses = fallback.data;
      error = fallback.error;
    }

    if (error && isMissingRelationError(error)) {
      return NextResponse.json({
        courses: [],
        warnings: [
          "curriculum_generated_courses table not found; returning an empty course list.",
        ],
      });
    }

    if (error) throw error;

    return NextResponse.json({ courses: courses ?? [] });
  } catch (error: any) {
    console.error("Courses fetch error details:", {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details
    });
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
