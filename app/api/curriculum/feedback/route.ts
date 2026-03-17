import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("curriculum_feedback")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ feedback: data || [] });
  } catch (error: any) {
    console.error("Curriculum feedback GET error:", error);
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

    if (!programId || !feedbackText) {
      return NextResponse.json(
        { error: "programId and feedbackText are required" },
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
