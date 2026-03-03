import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";
import {
  VISION_APPROVAL_THRESHOLD,
  clampScore,
  estimateVisionScore,
  getOwnedProgram,
  getSelectedVision,
  normalizeStatement,
  normalizeStringArray,
  upsertActiveMission,
  upsertSelectedVision,
} from "@/lib/institution/program-vm-governance";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.id as string) || null;
}

export async function PUT(request: NextRequest) {
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

    const hasVisionField = Object.prototype.hasOwnProperty.call(
      body,
      "program_vision",
    );
    const hasMissionField = Object.prototype.hasOwnProperty.call(
      body,
      "program_mission",
    );
    const normalizedProgramVision = normalizeStatement(body?.program_vision);
    const normalizedProgramMission = normalizeStatement(body?.program_mission);

    const visionInputs = normalizeStringArray(body?.vision_inputs_used);
    const missionInputs = normalizeStringArray(body?.mission_inputs_used);
    const visionOptions = normalizeStringArray(body?.vision_options);
    const missionOptions = normalizeStringArray(body?.mission_options);
    const generatedByAi =
      typeof body?.generated_by_ai === "boolean" ? body.generated_by_ai : null;

    const visionScore = clampScore(body?.vision_score);
    const missionScore = clampScore(body?.mission_score);
    const visionAnalysis =
      body?.vision_analysis && typeof body.vision_analysis === "object"
        ? (body.vision_analysis as Record<string, unknown>)
        : null;
    const missionAnalysis =
      body?.mission_analysis && typeof body.mission_analysis === "object"
        ? (body.mission_analysis as Record<string, unknown>)
        : null;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const ownedProgram = await getOwnedProgram(
        client,
        programId,
        institutionId,
      );
      if (!ownedProgram) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Program not found or unauthorized." },
          { status: 404 },
        );
      }

      const currentProgramResult = await client.query<{
        generated_by_ai: boolean | null;
        vision_inputs_used: unknown;
        mission_inputs_used: unknown;
        vision_options: unknown;
        mission_options: unknown;
        vision_score: number | null;
        mission_score: number | null;
        vision_analysis: Record<string, unknown> | null;
        mission_analysis: Record<string, unknown> | null;
      }>(
        `SELECT
          generated_by_ai,
          vision_inputs_used,
          mission_inputs_used,
          vision_options,
          mission_options,
          vision_score,
          mission_score,
          vision_analysis,
          mission_analysis
         FROM programs
         WHERE id = $1
         FOR UPDATE`,
        [programId],
      );

      const current = currentProgramResult.rows[0];
      if (!current) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Program not found." },
          { status: 404 },
        );
      }

      const existingSelectedVision = await getSelectedVision(client, programId);
      let selectedVision = existingSelectedVision;
      let visionChanged = false;

      if (hasVisionField) {
        if (!normalizedProgramVision) {
          await client.query(
            `UPDATE program_visions
             SET is_selected = FALSE,
                 updated_at = NOW()
             WHERE program_id = $1
               AND is_selected = TRUE`,
            [programId],
          );
          await client.query(
            `UPDATE program_missions
             SET is_active = FALSE,
                 updated_at = NOW()
             WHERE program_id = $1
               AND is_active = TRUE`,
            [programId],
          );
          selectedVision = null;
          visionChanged = Boolean(existingSelectedVision);
        } else {
          const resolvedVisionScore =
            visionScore ?? estimateVisionScore(normalizedProgramVision);
          const resolvedVisionAnalysis =
            visionAnalysis ??
            ({
              score: resolvedVisionScore,
              source: "heuristic_estimate",
            } as Record<string, unknown>);

          selectedVision = await upsertSelectedVision(client, {
            programId,
            visionText: normalizedProgramVision,
            visionScore: resolvedVisionScore,
            visionAnalysis: resolvedVisionAnalysis,
            source: generatedByAi ? "ai" : "manual",
          });
          const previousText = normalizeStatement(
            existingSelectedVision?.vision_text || "",
          );
          visionChanged =
            !previousText ||
            previousText.toLowerCase() !==
              selectedVision.vision_text.toLowerCase();
        }
      }

      if (!selectedVision && !hasVisionField) {
        selectedVision = await getSelectedVision(client, programId);
      }

      let activeMissionText: string | null = normalizeStatement(
        ownedProgram.program_mission || ownedProgram.mission || "",
      );
      if (!activeMissionText) {
        activeMissionText = null;
      }
      let finalMissionScore: number | null = current.mission_score ?? null;
      let finalMissionAnalysis: Record<string, unknown> | null =
        current.mission_analysis ?? null;

      if (visionChanged) {
        await client.query(
          `UPDATE program_missions
           SET is_active = FALSE,
               updated_at = NOW()
           WHERE program_id = $1
             AND is_active = TRUE`,
          [programId],
        );
        activeMissionText = null;
        finalMissionScore = null;
        finalMissionAnalysis = null;
      }

      if (hasMissionField) {
        if (!normalizedProgramMission) {
          await client.query(
            `UPDATE program_missions
             SET is_active = FALSE,
                 updated_at = NOW()
             WHERE program_id = $1
               AND is_active = TRUE`,
            [programId],
          );
          activeMissionText = null;
          finalMissionScore = null;
          finalMissionAnalysis = null;
        } else {
          if (!selectedVision) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "Mission cannot be saved without a selected Vision." },
              { status: 409 },
            );
          }

          if (selectedVision.vision_score === null) {
            const estimatedScore = estimateVisionScore(
              selectedVision.vision_text,
            );
            const estimatedAnalysis = {
              score: estimatedScore,
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
                estimatedScore,
                JSON.stringify(estimatedAnalysis),
              ],
            );
            selectedVision = {
              ...selectedVision,
              vision_score: estimatedScore,
              vision_analysis: estimatedAnalysis,
            };
          }

          if (
            selectedVision.vision_score === null ||
            selectedVision.vision_score < VISION_APPROVAL_THRESHOLD
          ) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error: `Mission cannot be saved because selected Vision score is below ${VISION_APPROVAL_THRESHOLD}.`,
              },
              { status: 409 },
            );
          }

          const activeMission = await upsertActiveMission(client, {
            programId,
            visionId: selectedVision.id,
            missionText: normalizedProgramMission,
            missionScore: missionScore ?? current.mission_score ?? null,
            missionAnalysis:
              missionAnalysis ?? current.mission_analysis ?? null,
            source: generatedByAi ? "ai" : "manual",
          });

          activeMissionText = activeMission.mission_text;
          finalMissionScore = activeMission.mission_score;
          finalMissionAnalysis = activeMission.mission_analysis;
        }
      } else {
        const activeMission = await client.query<{
          mission_text: string;
          mission_score: number | null;
          mission_analysis: Record<string, unknown> | null;
        }>(
          `SELECT mission_text, mission_score, mission_analysis
           FROM program_missions
           WHERE program_id = $1
             AND is_active = TRUE
           ORDER BY updated_at DESC
           LIMIT 1`,
          [programId],
        );
        if (activeMission.rows[0]) {
          activeMissionText = activeMission.rows[0].mission_text;
          finalMissionScore = activeMission.rows[0].mission_score;
          finalMissionAnalysis = activeMission.rows[0].mission_analysis;
        } else {
          activeMissionText = null;
          finalMissionScore = null;
          finalMissionAnalysis = null;
        }
      }

      const finalVisionText = selectedVision?.vision_text || null;
      const finalVisionScore = selectedVision?.vision_score ?? null;
      const finalVisionAnalysis =
        (selectedVision?.vision_analysis as Record<string, unknown> | null) ||
        null;

      const finalVisionInputs =
        visionInputs.length > 0
          ? visionInputs
          : normalizeStringArray(current.vision_inputs_used);
      const finalMissionInputs =
        missionInputs.length > 0
          ? missionInputs
          : normalizeStringArray(current.mission_inputs_used);
      const finalVisionOptions =
        visionOptions.length > 0
          ? visionOptions
          : normalizeStringArray(current.vision_options);
      const finalMissionOptions =
        missionOptions.length > 0
          ? missionOptions
          : normalizeStringArray(current.mission_options);
      const finalGeneratedByAi =
        generatedByAi !== null
          ? generatedByAi
          : Boolean(current.generated_by_ai);

      await client.query(
        `UPDATE programs
         SET
           program_vision = $2,
           vision = $2,
           vision_score = $3,
           vision_analysis = $4::jsonb,
           program_mission = $5,
           mission = $5,
           mission_score = $6,
           mission_analysis = $7::jsonb,
           vision_inputs_used = $8::jsonb,
           mission_inputs_used = $9::jsonb,
           vision_options = $10::jsonb,
           mission_options = $11::jsonb,
           vision_priorities = $12::text[],
           mission_priorities = $13::text[],
           generated_by_ai = $14,
           updated_at = NOW()
         WHERE id = $1`,
        [
          programId,
          finalVisionText,
          finalVisionScore,
          finalVisionAnalysis ? JSON.stringify(finalVisionAnalysis) : null,
          activeMissionText,
          finalMissionScore,
          finalMissionAnalysis ? JSON.stringify(finalMissionAnalysis) : null,
          JSON.stringify(finalVisionInputs),
          JSON.stringify(finalMissionInputs),
          JSON.stringify(finalVisionOptions),
          JSON.stringify(finalMissionOptions),
          finalVisionInputs,
          finalMissionInputs,
          finalGeneratedByAi,
        ],
      );

      await client.query("COMMIT");

      return NextResponse.json({
        ok: true,
        selected_vision: selectedVision
          ? {
              id: selectedVision.id,
              text: selectedVision.vision_text,
              score: selectedVision.vision_score,
              approved:
                selectedVision.vision_score !== null &&
                selectedVision.vision_score >= VISION_APPROVAL_THRESHOLD,
            }
          : null,
        mission: activeMissionText
          ? {
              text: activeMissionText,
              score: finalMissionScore,
            }
          : null,
        vision_required_for_mission: true,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error updating program vision/mission:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update Vision/Mission." },
      { status: 500 },
    );
  }
}
