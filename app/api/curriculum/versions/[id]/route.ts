import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = String(rawId || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json();
    const status = String(body.status || "").trim();

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const ALLOWED_STATUSES = ["draft", "active", "archived"];
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from("curriculum_versions")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!updated) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({ version: updated });
  } catch (error: any) {
    console.error("Version update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update version" },
      { status: 500 },
    );
  }
}
