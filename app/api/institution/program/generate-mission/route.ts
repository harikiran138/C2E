import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";
import {
  VISION_APPROVAL_THRESHOLD,
  estimateVisionScore,
  getOwnedProgram,
  getSelectedVision,
  normalizeStringArray,
} from "@/lib/institution/program-vm-governance";

function resolveAiEndpoint(request: NextRequest): string {
  const configuredBase =
    process.env.AI_API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || "";
  const trimmed = configuredBase.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `${trimmed.replace(/\/$/, "")}/ai/generate-vision-mission`;
  }

  if (trimmed.startsWith("/")) {
    return new URL(
      `${trimmed.replace(/\/$/, "")}/ai/generate-vision-mission`,
      request.url,
    ).toString();
  }

  return new URL("/api/ai/generate-vision-mission", request.url).toString();
}

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.id as string) || null;
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const programId = String(body?.program_id || "").trim();
    if (!programId) {
      return NextResponse.json(
        { error: "Program ID is required." },
        { status: 400 },
      );
    }

    const missionInputs = normalizeStringArray(body?.mission_inputs);
    if (missionInputs.length === 0) {
      return NextResponse.json(
        { error: "At least one mission focus area is required." },
        { status: 400 },
      );
    }

    const missionCount = Math.min(
      Math.max(Number(body?.mission_count) || 1, 1),
      10,
    );
    const excludedMissions = normalizeStringArray(body?.exclude_missions);

    const client = await pool.connect();
    try {
      const ownedProgram = await getOwnedProgram(
        client,
        programId,
        institutionId,
      );
      if (!ownedProgram) {
        return NextResponse.json(
          { error: "Program not found or unauthorized." },
          { status: 404 },
        );
      }

      const selectedVision = await getSelectedVision(client, programId);
      if (!selectedVision?.vision_text) {
        return NextResponse.json(
          {
            error:
              "Mission generation blocked: select and save a Vision first.",
          },
          { status: 409 },
        );
      }

      if (selectedVision.vision_score === null) {
        const estimatedVisionScore = estimateVisionScore(
          selectedVision.vision_text,
        );
        const estimatedVisionAnalysis = {
          score: estimatedVisionScore,
          source: "heuristic_estimate",
        };
        await client.query(
          `UPDATE program_visions
           SET vision_score = $2,
               vision_analysis = $3::jsonb,
               updated_at = NOW()
           WHERE id = $1`,
          [
            selectedVision.id,
            estimatedVisionScore,
            JSON.stringify(estimatedVisionAnalysis),
          ],
        );
        await client.query(
          `UPDATE programs
           SET
             program_vision = $2,
             vision = $2,
             vision_score = $3,
             vision_analysis = $4::jsonb,
             updated_at = NOW()
           WHERE id = $1`,
          [
            programId,
            selectedVision.vision_text,
            estimatedVisionScore,
            JSON.stringify(estimatedVisionAnalysis),
          ],
        );
        selectedVision.vision_score = estimatedVisionScore;
      }

      if (selectedVision.vision_score < VISION_APPROVAL_THRESHOLD) {
        return NextResponse.json(
          {
            error: `Mission generation blocked: selected Vision score must be at least ${VISION_APPROVAL_THRESHOLD}.`,
          },
          { status: 409 },
        );
      }

      const institutionResult = await client.query<{
        vision: string | null;
        mission: string | null;
      }>(
        `SELECT vision, mission
         FROM institutions
         WHERE id = $1`,
        [institutionId],
      );

      const institutionVision = institutionResult.rows[0]?.vision || "";
      const institutionMission = institutionResult.rows[0]?.mission || "";

      const aiEndpoint = resolveAiEndpoint(request);
      const aiResponse = await fetch(aiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "mission",
          program_name: ownedProgram.program_name,
          institute_vision: institutionVision,
          institute_mission: institutionMission,
          selected_program_vision: selectedVision.vision_text,
          mission_inputs: missionInputs,
          mission_count: missionCount,
          exclude_missions: excludedMissions,
        }),
      });

      const aiPayload = await aiResponse.json().catch(() => ({}));
      if (!aiResponse.ok) {
        return NextResponse.json(
          {
            error:
              aiPayload?.error ||
              "Mission generation failed while validating against the saved Vision.",
          },
          { status: aiResponse.status || 500 },
        );
      }

      const missions =
        Array.isArray(aiPayload?.missions) && aiPayload.missions.length > 0
          ? aiPayload.missions
              .map((item: unknown) => String(item || "").trim())
              .filter(Boolean)
          : aiPayload?.mission
            ? [String(aiPayload.mission).trim()]
            : [];

      const missionScores =
        aiPayload?.scores && typeof aiPayload.scores === "object"
          ? aiPayload.scores.mission &&
            typeof aiPayload.scores.mission === "object"
            ? aiPayload.scores.mission
            : aiPayload.scores
          : {};

      await client.query(
        `UPDATE programs
         SET
           mission_inputs_used = $2::jsonb,
           mission_priorities = $3::text[],
           mission_options = $4::jsonb,
           generated_by_ai = TRUE,
           updated_at = NOW()
         WHERE id = $1`,
        [
          programId,
          JSON.stringify(missionInputs),
          missionInputs,
          JSON.stringify(missions),
        ],
      );

      return NextResponse.json({
        ok: true,
        selected_vision: {
          id: selectedVision.id,
          text: selectedVision.vision_text,
          score: selectedVision.vision_score,
        },
        missions,
        mission: missions[0] || null,
        scores: missionScores,
        raw_scores: aiPayload?.scores || null,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error generating mission from selected vision:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate mission." },
      { status: 500 },
    );
  }
}
