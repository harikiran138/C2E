import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth";

type StakeholderTokenPayload = {
  role?: string;
  stakeholder_ref_id?: string;
  stakeholder_member_id?: string;
  stakeholder_name?: string;
  stakeholder_category?: string;
  institution_name?: string;
  program_id?: string;
};

async function getStakeholderPayload(
  request: NextRequest,
): Promise<StakeholderTokenPayload | null> {
  const token = request.cookies.get("stakeholder_token")?.value;
  if (!token) return null;

  const payload = (await verifyToken(token)) as StakeholderTokenPayload | null;
  if (!payload || payload.role !== "stakeholder") return null;
  if (!payload.stakeholder_ref_id || !payload.program_id) return null;

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const stakeholder = await getStakeholderPayload(request);
    if (!stakeholder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Detailed consultation survey data is expected in the body
    // We will save it as feedback_json

    const supabase = await createClient();
    
    const { data: result, error } = await supabase
      .from("stakeholder_feedback")
      .insert({
        rep_stakeholder_id: stakeholder.stakeholder_ref_id,
        program_id: stakeholder.program_id,
        feedback_json: body,
      })
      .select("id, submitted_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      id: result.id,
      submittedAt: result.submitted_at,
    });
  } catch (error: any) {
    console.error("Stakeholder consultation submit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit consultation survey" },
      { status: 500 },
    );
  }
}
