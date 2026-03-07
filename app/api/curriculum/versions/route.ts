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

    const { data: versions, error } = await supabase
      .from("curriculum_versions")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ versions: versions ?? [] });
  } catch (error: any) {
    console.error("Versions fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch versions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const programId = String(body.programId || "").trim();
    const version = String(body.version || "").trim();
    const year = Number(body.year);
    const regulationName = String(body.regulationName || "").trim();
    const status = String(body.status || "draft").trim().toLowerCase();

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    if (!version) {
      return NextResponse.json({ error: "version is required" }, { status: 400 });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "year is required and must be a valid 4-digit year." },
        { status: 400 },
      );
    }
    if (!["draft", "active", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "status must be one of: draft, active, archived." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: newVersion, error } = await supabase
      .from("curriculum_versions")
      .insert({
        program_id: programId,
        version,
        year,
        regulation_name: regulationName || null,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    // Keep normalized curriculum catalog in sync for accreditation/version tracking.
    const { error: curriculumSyncError } = await supabase
      .from("curriculums")
      .upsert(
        {
          program_id: programId,
          regulation_year: year,
          version,
          total_credits: null,
          approval_status: "draft",
        },
        { onConflict: "program_id, regulation_year, version" },
      );

    if (curriculumSyncError && (curriculumSyncError as any)?.code !== "42P01") {
      console.warn("Curriculum catalog sync warning:", curriculumSyncError.message);
    }

    return NextResponse.json({ version: newVersion }, { status: 201 });
  } catch (error: any) {
    console.error("Version create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create version" },
      { status: 500 },
    );
  }
}
