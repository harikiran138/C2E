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
    const year = body.year !== undefined ? Number(body.year) : null;
    const regulationName = String(body.regulationName || "").trim();

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    if (!version) {
      return NextResponse.json({ error: "version is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: newVersion, error } = await supabase
      .from("curriculum_versions")
      .insert({
        program_id: programId,
        version,
        year: year ?? null,
        regulation_name: regulationName || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ version: newVersion }, { status: 201 });
  } catch (error: any) {
    console.error("Version create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create version" },
      { status: 500 },
    );
  }
}
