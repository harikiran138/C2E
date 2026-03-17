import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    if (!programId || !isValidUUID(programId)) {
      return NextResponse.json({ error: "Valid programId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("curriculum_feedback")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false });

    if (error && isMissingRelationError(error)) {
      return NextResponse.json({ feedback: [] });
    }

    if (error) throw error;

    return NextResponse.json({ feedback: data || [] });
  } catch (error: any) {
    console.error("Curriculum feedback GET error details:", {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details
    });
    return NextResponse.json(
      { error: error.message || "Failed to fetch curriculum feedback" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { programId, stakeholderEmail, feedbackText, rating } = body;

    if (!programId || !isValidUUID(programId) || !feedbackText) {
      return NextResponse.json(
        { error: "Valid programId and feedbackText are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("curriculum_feedback")
      .insert([
        {
          program_id: programId,
          stakeholder_email: stakeholderEmail,
          feedback_text: feedbackText,
          rating: rating || 5,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ feedback: data });
  } catch (error: any) {
    console.error("Curriculum feedback POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save curriculum feedback" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("curriculum_feedback")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Curriculum feedback DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete feedback" },
      { status: 500 }
    );
  }
}
