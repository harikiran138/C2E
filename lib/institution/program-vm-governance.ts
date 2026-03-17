import type { PoolClient } from "pg";

export const VISION_APPROVAL_THRESHOLD = 90;

const GLOBAL_POSITIONING_CUES = [
  "globally recognized",
  "globally respected",
  "internationally recognized",
  "distinction in",
  "leading",
  "leadership in",
  "to emerge as",
  "to be known for",
];

const OPERATIONAL_LEAKAGE_CUES = [
  "teach",
  "teaching",
  "curriculum",
  "coursework",
  "train",
  "training",
  "learning",
  "laboratory",
  "labs",
  "classroom",
  "internship",
  "placement",
];

const MARKETING_CUES = [
  "destination",
  "hub",
  "world-class",
  "unparalleled",
  "premier",
];

export interface ProgramOwnership {
  id: string;
  institution_id: string;
  program_name: string;
  program_code: string | null;
  vision_score: number | null;
  vision: string | null;
  mission: string | null;
}

export interface SelectedVisionRecord {
  id: string;
  program_id: string;
  vision_text: string;
  vision_score: number | null;
  vision_analysis: Record<string, unknown> | null;
  source: string;
  is_selected: boolean;
}

export function normalizeStatement(value: unknown): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of value) {
    const normalized = normalizeStatement(item);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

export function clampScore(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return Math.round(numeric);
}

export function estimateVisionScore(statement: string): number {
  const normalized = normalizeStatement(statement);
  if (!normalized) return 0;

  const lower = normalized.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const sentenceCount = normalized
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;

  const globalCueHits = GLOBAL_POSITIONING_CUES.filter((cue) =>
    lower.includes(cue),
  ).length;
  const operationalHits = OPERATIONAL_LEAKAGE_CUES.filter((cue) =>
    lower.includes(cue),
  ).length;
  const marketingHits = MARKETING_CUES.filter((cue) =>
    lower.includes(cue),
  ).length;

  const hasStrategicConnector = /\bthrough\b|\bvia\b|\bby\b/.test(lower);
  const hasInstitutionalCue =
    /\binstitutional\b|\bprofessional\b|\bstandards\b|\brelevance\b|\bimpact\b/.test(
      lower,
    );

  let score = 55;
  if (words.length >= 12 && words.length <= 30) score += 12;
  else if (words.length >= 8 && words.length <= 35) score += 6;

  if (sentenceCount === 1) score += 8;
  if (globalCueHits >= 1) score += 15;
  if (globalCueHits === 1) score += 5;
  if (hasStrategicConnector) score += 7;
  if (hasInstitutionalCue) score += 8;

  score -= operationalHits * 8;
  score -= marketingHits * 6;
  if (globalCueHits > 1) score -= (globalCueHits - 1) * 6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function getOwnedProgram(
  client: PoolClient,
  programId: string,
  institutionId: string,
): Promise<ProgramOwnership | null> {
  const result = await client.query<ProgramOwnership>(
    `SELECT
      id,
      institution_id,
      program_name,
      program_code,
      vision_score,
      vision,
      mission
     FROM programs
     WHERE id = $1 AND institution_id = $2`,
    [programId, institutionId],
  );
  return result.rows[0] || null;
}

export async function getSelectedVision(
  client: PoolClient,
  programId: string,
): Promise<SelectedVisionRecord | null> {
  const selected = await client.query<SelectedVisionRecord>(
    `SELECT
      id,
      program_id,
      vision_text,
      vision_score,
      vision_analysis,
      source,
      is_selected
     FROM program_visions
     WHERE program_id = $1
       AND is_selected = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
    [programId],
  );
  return selected.rows[0] || null;
}

export async function upsertSelectedVision(
  client: PoolClient,
  args: {
    programId: string;
    visionText: string;
    visionScore: number | null;
    visionAnalysis: Record<string, unknown> | null;
    source: string;
  },
): Promise<SelectedVisionRecord> {
  const normalizedVision = normalizeStatement(args.visionText);
  if (!normalizedVision) {
    throw new Error("Vision statement is required.");
  }

  await client.query(
    `UPDATE program_visions
     SET is_selected = FALSE,
         updated_at = NOW()
     WHERE program_id = $1
       AND is_selected = TRUE`,
    [args.programId],
  );

  const existing = await client.query<{ id: string }>(
    `SELECT id
     FROM program_visions
     WHERE program_id = $1
       AND LOWER(TRIM(vision_text)) = LOWER(TRIM($2))
     ORDER BY updated_at DESC
     LIMIT 1`,
    [args.programId, normalizedVision],
  );

  let selectedVisionId: string;
  if (existing.rows[0]?.id) {
    selectedVisionId = existing.rows[0].id;
    await client.query(
      `UPDATE program_visions
       SET vision_text = $2,
           vision_score = $3,
           vision_analysis = $4::jsonb,
           source = $5,
           is_selected = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [
        selectedVisionId,
        normalizedVision,
        args.visionScore,
        args.visionAnalysis ? JSON.stringify(args.visionAnalysis) : null,
        args.source,
      ],
    );
  } else {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO program_visions (
        program_id,
        vision_text,
        vision_score,
        vision_analysis,
        source,
        is_selected,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4::jsonb, $5, TRUE, NOW(), NOW())
      RETURNING id`,
      [
        args.programId,
        normalizedVision,
        args.visionScore,
        args.visionAnalysis ? JSON.stringify(args.visionAnalysis) : null,
        args.source,
      ],
    );
    selectedVisionId = inserted.rows[0].id;
  }

  const selected = await getSelectedVision(client, args.programId);
  if (!selected || selected.id !== selectedVisionId) {
    throw new Error("Failed to select program vision.");
  }
  return selected;
}

export async function upsertActiveMission(
  client: PoolClient,
  args: {
    programId: string;
    visionId: string;
    missionText: string;
    missionScore: number | null;
    missionAnalysis: Record<string, unknown> | null;
    source: string;
  },
): Promise<{
  id: string;
  mission_text: string;
  mission_score: number | null;
  mission_analysis: Record<string, unknown> | null;
}> {
  const normalizedMission = normalizeStatement(args.missionText);
  if (!normalizedMission) {
    throw new Error("Mission statement is required.");
  }

  await client.query(
    `UPDATE program_missions
     SET is_active = FALSE,
         updated_at = NOW()
     WHERE program_id = $1
       AND is_active = TRUE`,
    [args.programId],
  );

  const existing = await client.query<{ id: string }>(
    `SELECT id
     FROM program_missions
     WHERE program_id = $1
       AND vision_id = $2
       AND LOWER(TRIM(mission_text)) = LOWER(TRIM($3))
     ORDER BY updated_at DESC
     LIMIT 1`,
    [args.programId, args.visionId, normalizedMission],
  );

  let missionId: string;
  if (existing.rows[0]?.id) {
    missionId = existing.rows[0].id;
    await client.query(
      `UPDATE program_missions
       SET mission_text = $2,
           mission_score = $3,
           mission_analysis = $4::jsonb,
           source = $5,
           is_active = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [
        missionId,
        normalizedMission,
        args.missionScore,
        args.missionAnalysis ? JSON.stringify(args.missionAnalysis) : null,
        args.source,
      ],
    );
  } else {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO program_missions (
        program_id,
        vision_id,
        mission_text,
        mission_score,
        mission_analysis,
        source,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, TRUE, NOW(), NOW())
      RETURNING id`,
      [
        args.programId,
        args.visionId,
        normalizedMission,
        args.missionScore,
        args.missionAnalysis ? JSON.stringify(args.missionAnalysis) : null,
        args.source,
      ],
    );
    missionId = inserted.rows[0].id;
  }

  const active = await client.query<{
    id: string;
    mission_text: string;
    mission_score: number | null;
    mission_analysis: Record<string, unknown> | null;
  }>(
    `SELECT id, mission_text, mission_score, mission_analysis
     FROM program_missions
     WHERE program_id = $1
       AND is_active = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
    [args.programId],
  );

  if (!active.rows[0] || active.rows[0].id !== missionId) {
    throw new Error("Failed to activate mission statement.");
  }

  return active.rows[0];
}
