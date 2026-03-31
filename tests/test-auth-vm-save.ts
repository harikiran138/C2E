import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const baseUrl = "http://localhost:3000";
const VISION_APPROVAL_THRESHOLD = 90;

function parseCookies(response: Response): string {
  const cookies =
    typeof (response.headers as any).getSetCookie === "function"
      ? (response.headers as any).getSetCookie()
      : [];
  return cookies.map((cookie: string) => cookie.split(";")[0]).join("; ");
}

async function requestJson(
  path: string,
  options: RequestInit = {},
): Promise<{ response: Response; data: any }> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function normalizeStatement(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractScoreMap(payload: any, kind: "vision" | "mission") {
  if (!payload || typeof payload !== "object") return {};
  if (payload[kind] && typeof payload[kind] === "object") return payload[kind];
  return payload;
}

function findScoreInfo(scoreMap: Record<string, any>, statement: string) {
  const normalized = normalizeStatement(statement);
  for (const [key, value] of Object.entries(scoreMap || {})) {
    if (normalizeStatement(key) === normalized) {
      return value as { score?: number } | null;
    }
  }
  return null;
}

function pickApprovedVision(
  visions: string[],
  scoresPayload: any,
): { text: string; score: number | null } | null {
  const scoreMap = extractScoreMap(scoresPayload, "vision");
  let bestApproved: { text: string; score: number } | null = null;
  let bestFallback: { text: string; score: number | null } | null = null;

  for (const vision of visions) {
    const info = findScoreInfo(scoreMap, vision);
    const score =
      typeof info?.score === "number" ? Number(info.score) : null;

    if (score !== null && score >= VISION_APPROVAL_THRESHOLD) {
      if (!bestApproved || score > bestApproved.score) {
        bestApproved = { text: vision, score };
      }
    }

    if (!bestFallback || (score ?? -1) > (bestFallback.score ?? -1)) {
      bestFallback = { text: vision, score };
    }
  }

  return bestApproved || bestFallback;
}

async function main() {
  const stamp = Date.now();
  const email = `vm-${stamp}@example.com`;
  const password = "Password123!";
  const institutionName = `VM Test Institute ${stamp}`;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const signup = await requestJson("/api/institution/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutionName,
        email,
        password,
        confirmPassword: password,
      }),
    });

    if (!signup.response.ok) {
      throw new Error(`Signup failed: ${JSON.stringify(signup.data)}`);
    }

    const cookies = parseCookies(signup.response);
    if (!cookies.includes("institution_token=")) {
      throw new Error("Signup did not return institution_token cookie.");
    }

    const details = await requestJson("/api/institution/details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        institution_name: institutionName,
        institution_type: "Private",
        institution_status: "Autonomous",
        established_year: 2010,
        university_affiliation: "JNTU",
        city: "Visakhapatnam",
        state: "Andhra Pradesh",
        vision:
          "To build globally relevant engineering education through quality, ethics, and innovation.",
        mission:
          "To provide an outcome-based academic ecosystem with strong industry relevance and societal commitment.",
      }),
    });

    if (!details.response.ok) {
      throw new Error(`Institution details save failed: ${JSON.stringify(details.data)}`);
    }

    const programCode = `ME${String(stamp).slice(-4)}`;
    const program = await requestJson("/api/institution/programs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        program_name: "B.Tech Mechanical Engineering",
        degree: "B.Tech",
        level: "UG",
        duration: 4,
        intake: 60,
        academic_year: "2026-27",
        program_code: programCode,
        vision: "",
        mission: "",
      }),
    });

    if (!program.response.ok) {
      throw new Error(`Program creation failed: ${JSON.stringify(program.data)}`);
    }

    const programId = String(program.data.program?.id || "");
    if (!programId) {
      throw new Error("Program ID was not returned.");
    }

    const visionInputs = [
      "Global Engineering Excellence",
      "Ethics and integrity",
      "Sustainable development",
    ];
    const missionInputs = [
      "Outcome Based Education",
      "Industry-aligned curriculum",
      "Ethical engineering practice",
    ];

    let visionGen:
      | {
          response: Response;
          data: any;
        }
      | null = null;
    let selectedVision = "";
    let selectedVisionScore: number | null = null;
    const excludedVisions: string[] = [];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      visionGen = await requestJson("/api/ai/generate-vision-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "vision",
          program_name: "B.Tech Mechanical Engineering",
          institute_vision:
            "To build globally relevant engineering education through quality, ethics, and innovation.",
          institute_mission:
            "To provide an outcome-based academic ecosystem with strong industry relevance and societal commitment.",
          vision_inputs: visionInputs,
          mission_inputs: missionInputs,
          vision_count: 3,
          exclude_visions: excludedVisions,
        }),
      });

      if (!visionGen.response.ok) {
        throw new Error(`Vision generation failed: ${JSON.stringify(visionGen.data)}`);
      }

      const generatedVisions = Array.isArray(visionGen.data.visions)
        ? visionGen.data.visions.map((item: unknown) => String(item || "").trim()).filter(Boolean)
        : [];
      excludedVisions.push(...generatedVisions);

      const preferredVision = pickApprovedVision(
        generatedVisions,
        visionGen.data.scores,
      );
      if (
        preferredVision?.text &&
        preferredVision.score !== null &&
        preferredVision.score >= VISION_APPROVAL_THRESHOLD
      ) {
        selectedVision = preferredVision.text;
        selectedVisionScore = preferredVision.score;
        break;
      }
    }

    if (!visionGen) {
      throw new Error("Vision generation did not produce a response.");
    }

    if (!selectedVision) {
      throw new Error(
        `No generated vision reached score ${VISION_APPROVAL_THRESHOLD} after 3 attempts.`,
      );
    }

    const saveVision = await requestJson("/api/institution/program/update-vm", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        program_id: programId,
        vision: selectedVision,
        vision_inputs_used: visionInputs,
        vision_options: visionGen.data.visions,
        generated_by_ai: true,
        vision_score: selectedVisionScore,
        vision_analysis:
          findScoreInfo(extractScoreMap(visionGen.data.scores, "vision"), selectedVision) ??
          (selectedVisionScore !== null ? { score: selectedVisionScore } : null),
      }),
    });

    if (!saveVision.response.ok) {
      throw new Error(`Vision save failed: ${JSON.stringify(saveVision.data)}`);
    }

    const missionGen = await requestJson("/api/institution/program/generate-mission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        program_id: programId,
        mission_inputs: missionInputs,
        mission_count: 3,
      }),
    });

    if (!missionGen.response.ok) {
      throw new Error(`Mission generation failed: ${JSON.stringify(missionGen.data)}`);
    }

    const selectedMission = String(missionGen.data.missions?.[0] || "");
    if (!selectedMission) {
      throw new Error("No generated mission returned.");
    }

    const saveMission = await requestJson("/api/institution/program/update-vm", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        program_id: programId,
        vision: selectedVision,
        mission: selectedMission,
        vision_inputs_used: visionInputs,
        mission_inputs_used: missionInputs,
        vision_options: visionGen.data.visions,
        mission_options: missionGen.data.missions,
        generated_by_ai: true,
        vision_score: saveVision.data.selected_vision?.score ?? selectedVisionScore,
        vision_analysis:
          findScoreInfo(extractScoreMap(visionGen.data.scores, "vision"), selectedVision) ??
          (selectedVisionScore !== null ? { score: selectedVisionScore } : null),
        mission_score: missionGen.data.scores?.[selectedMission]?.score ?? 95,
        mission_analysis: missionGen.data.scores?.[selectedMission] ?? { score: 95 },
      }),
    });

    if (!saveMission.response.ok) {
      throw new Error(`Mission save failed: ${JSON.stringify(saveMission.data)}`);
    }

    const detailsAfterSave = await requestJson("/api/institution/details", {
      headers: { Cookie: cookies },
    });

    if (!detailsAfterSave.response.ok) {
      throw new Error(`Institution details reload failed: ${JSON.stringify(detailsAfterSave.data)}`);
    }

    const savedProgram = detailsAfterSave.data.programs.find(
      (item: any) => item.id === programId,
    );

    if (!savedProgram) {
      throw new Error("Saved program was not returned by /api/institution/details.");
    }

    if (
      detailsAfterSave.data.institution.vision !==
        "To build globally relevant engineering education through quality, ethics, and innovation." ||
      detailsAfterSave.data.institution.mission !==
        "To provide an outcome-based academic ecosystem with strong industry relevance and societal commitment."
    ) {
      throw new Error("Institution vision/mission were not persisted correctly.");
    }

    const programRow = (
      await pool.query(
        `SELECT
          vision,
          program_vision,
          mission,
          program_mission,
          vision_inputs_used,
          mission_inputs_used,
          vision_options,
          mission_options
         FROM public.programs
         WHERE id = $1`,
        [programId],
      )
    ).rows[0];

    const selectedVisionRow = (
      await pool.query(
        `SELECT vision_text, is_selected
         FROM public.program_visions
         WHERE program_id = $1
           AND is_selected = TRUE
         ORDER BY updated_at DESC
         LIMIT 1`,
        [programId],
      )
    ).rows[0];

    const activeMissionRow = (
      await pool.query(
        `SELECT mission_text, is_active
         FROM public.program_missions
         WHERE program_id = $1
           AND is_active = TRUE
         ORDER BY updated_at DESC
         LIMIT 1`,
        [programId],
      )
    ).rows[0];

    if (programRow.vision !== selectedVision || programRow.program_vision !== selectedVision) {
      throw new Error("Vision was not synced into both program columns.");
    }

    if (programRow.mission !== selectedMission || programRow.program_mission !== selectedMission) {
      throw new Error("Mission was not synced into both program columns.");
    }

    if (selectedVisionRow?.vision_text !== selectedVision) {
      throw new Error("Selected vision row was not stored correctly.");
    }

    if (activeMissionRow?.mission_text !== selectedMission) {
      throw new Error("Active mission row was not stored correctly.");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          institutionId: signup.data.id,
          programId,
          selectedVision,
          selectedMission,
          detailsReload: {
            vision: savedProgram.vision,
            program_vision: savedProgram.program_vision,
            mission: savedProgram.mission,
            program_mission: savedProgram.program_mission,
            vision_inputs_used: savedProgram.vision_inputs_used,
            mission_inputs_used: savedProgram.mission_inputs_used,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
