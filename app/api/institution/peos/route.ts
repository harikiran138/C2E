import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json(
        { error: "Program ID required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: result, error } = await supabase
      .from("program_peos")
      .select("*")
      .eq("program_id", programId)
      .order("peo_number", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Bulk Save / Sync
export async function POST(request: Request) {
  try {
    const { program_id, peos } = await request.json();

    if (!program_id || !Array.isArray(peos)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createClient();

    // Delete existing to full sync
    const { error: deleteError } = await supabase
      .from("program_peos")
      .delete()
      .eq("program_id", program_id);

    if (deleteError) throw deleteError;

    if (peos.length > 0) {
      const peosToInsert = peos.map((peo, i) => ({
        program_id,
        peo_statement: peo.statement,
        peo_number: i + 1,
      }));

      const { error: insertError } = await supabase
        .from("program_peos")
        .insert(peosToInsert);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PEO Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const supabase = await createClient();
    const { error } = await supabase
      .from("program_peos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
