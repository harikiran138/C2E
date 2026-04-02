import pool from "@/lib/postgres";
import type { PoolClient } from "pg";

interface PeoRow {
  peo_number: number;
  peo_statement: string;
}

interface PoRow {
  po_code: string;
  po_description: string;
}

interface ProgramRow {
  id: string;
  program_name: string;
  degree: string | null;
  vision: string | null;
  mission: string | null;
  institution_id: string;
  peo_po_matrix: unknown;
  consistency_matrix: unknown;
}

export interface ProgramAcademicContext {
  programId: string;
  programName: string;
  institutionId: string;
  degree: string | null;
  displayName: string;
  vision: string;
  mission: string;
  peoCount: number | null;
  poCount: number | null;
  psoCount: number | null;
  peos: string[];
  pos: string[];
  hasPeoPoMatrix: boolean;
  hasConsistencyMatrix: boolean;
}

export interface AcademicFlowValidationOptions {
  strict?: boolean;
  minPeos?: number;
  minPos?: number;
  minPsos?: number;
}

export interface AcademicFlowValidationResult {
  errors: string[];
  warnings: string[];
}

const DEFAULT_MIN_PEOS = 3;
const DEFAULT_MIN_POS = 12;
const DEFAULT_MIN_PSOS = 2;

export function normalizeText(value: unknown): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDisplayProgramName(degree: string | null, programName: string): string {
  const normalizedProgramName = normalizeText(programName);
  const normalizedDegree = normalizeText(degree);
  if (!normalizedDegree) return normalizedProgramName;

  const lowerProgram = normalizedProgramName.toLowerCase();
  const lowerDegree = normalizedDegree.toLowerCase();
  if (lowerProgram.startsWith(lowerDegree)) {
    return normalizedProgramName;
  }
  return `${normalizedDegree} ${normalizedProgramName}`.trim();
}

async function tryReadActiveVision(client: PoolClient, programId: string): Promise<string | null> {
  try {
    const result = await client.query<{ vision_text: string }>(
      `SELECT vision_text
       FROM program_visions
       WHERE program_id = $1
         AND is_selected = TRUE
       ORDER BY updated_at DESC
       LIMIT 1`,
      [programId],
    );
    return normalizeText(result.rows[0]?.vision_text || "");
  } catch (error: any) {
    if (String(error?.code) === "42P01") {
      return null;
    }
    throw error;
  }
}

async function tryReadActiveMission(client: PoolClient, programId: string): Promise<string | null> {
  try {
    const result = await client.query<{ mission_text: string }>(
      `SELECT mission_text
       FROM program_missions
       WHERE program_id = $1
         AND is_active = TRUE
       ORDER BY updated_at DESC
       LIMIT 1`,
      [programId],
    );
    return normalizeText(result.rows[0]?.mission_text || "");
  } catch (error: any) {
    if (String(error?.code) === "42P01") {
      return null;
    }
    throw error;
  }
}

async function tryReadPeos(client: PoolClient, programId: string): Promise<string[]> {
  try {
    const result = await client.query<PeoRow>(
      `SELECT peo_number, peo_statement
       FROM program_peos
       WHERE program_id = $1
       ORDER BY peo_number ASC`,
      [programId],
    );

    return result.rows.map((r) => normalizeText(r.peo_statement)).filter(Boolean);
  } catch (error: any) {
    if (String(error?.code) === "42P01") return [];
    throw error;
  }
}

async function tryReadPos(client: PoolClient, programId: string): Promise<string[]> {
  try {
    const result = await client.query<PoRow>(
      `SELECT po_code, po_description
       FROM program_outcomes
       WHERE program_id = $1
       ORDER BY po_code ASC`,
      [programId],
    );
    return result.rows
      .map((r) => {
        const code = normalizeText(r.po_code).toUpperCase();
        const desc = normalizeText(r.po_description);
        return desc ? `${code} - ${desc}` : code;
      })
      .filter(Boolean);
  } catch (error: any) {
    if (String(error?.code) === "42P01") return [];
    throw error;
  }
}

async function tryCountRows(
  client: PoolClient,
  table: "program_peos" | "program_outcomes" | "program_psos",
  programId: string,
): Promise<number | null> {
  try {
    const result = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM ${table}
       WHERE program_id = $1`,
      [programId],
    );
    return Number(result.rows[0]?.count || 0);
  } catch (error: any) {
    if (String(error?.code) === "42P01") {
      return null;
    }
    throw error;
  }
}

export async function resolveProgramAcademicContext(
  programId: string,
  providedClient?: PoolClient,
): Promise<{ context: ProgramAcademicContext | null; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const normalizedProgramId = normalizeText(programId);
  if (!normalizedProgramId) {
    errors.push("programId is required.");
    return { context: null, errors, warnings };
  }

  let client = providedClient;
  let shouldRelease = false;

  try {
    if (!client) {
      client = await pool.connect();
      shouldRelease = true;
    }

    let program: ProgramRow | undefined;
    try {
      const programResult = await client.query<ProgramRow>(
        `SELECT
          id,
          program_name,
          degree,
          vision,
          mission,
          institution_id,
          peo_po_matrix,
          consistency_matrix
         FROM programs
         WHERE id = $1
         LIMIT 1`,
        [normalizedProgramId],
      );
      program = programResult.rows[0];
    } catch (error: any) {
      if (String(error?.code) === "42703") {
        console.warn("Retrying program context fetch with legacy schema fallback...");
        // Fallback: Query only the core columns
        const fallbackResult = await client.query<ProgramRow>(
          `SELECT
            id,
            program_name,
            degree,
            vision,
            mission,
            institution_id
           FROM programs
           WHERE id = $1
           LIMIT 1`,
          [normalizedProgramId],
        );
        program = fallbackResult.rows[0];
      } else {
        throw error;
      }
    }

    if (!program) {
      errors.push("Program not found for the provided programId.");
      return { context: null, errors, warnings };
    }

    const selectedVision = await tryReadActiveVision(client, normalizedProgramId);
    const activeMission = await tryReadActiveMission(client, normalizedProgramId);
    const peos = await tryReadPeos(client, normalizedProgramId);
    const pos = await tryReadPos(client, normalizedProgramId);
    const peoCount = peos.length || (await tryCountRows(client, "program_peos", normalizedProgramId));
    const poCount = pos.length || (await tryCountRows(client, "program_outcomes", normalizedProgramId));
    const psoCount = await tryCountRows(client, "program_psos", normalizedProgramId);

    if (peoCount === null) {
      warnings.push(
        "program_peos table was not found; PEO dependency validation was skipped.",
      );
    }
    if (poCount === null) {
      warnings.push(
        "program_outcomes table was not found; PO dependency validation was skipped.",
      );
    }
    if (psoCount === null) {
      warnings.push(
        "program_psos table was not found; PSO dependency validation was skipped.",
      );
    }

    const effectiveVision = normalizeText(
      selectedVision || program.vision,
    );
    const effectiveMission = normalizeText(
      activeMission || program.mission,
    );

    const context: ProgramAcademicContext = {
      programId: program.id,
      programName: normalizeText(program.program_name),
      institutionId: program.institution_id,
      degree: normalizeText(program.degree) || null,
      displayName: buildDisplayProgramName(program.degree, program.program_name),
      vision: effectiveVision,
      mission: effectiveMission,
      peoCount,
      poCount,
      psoCount,
      peos,
      pos,
      hasPeoPoMatrix: !!program.peo_po_matrix,
      hasConsistencyMatrix: !!program.consistency_matrix,
    };

    return { context, errors, warnings };
  } catch (error: any) {
    errors.push(error?.message || "Failed to resolve program context.");
    return { context: null, errors, warnings };
  } finally {
    if (client && shouldRelease) {
      client.release();
    }
  }
}

export function validateAcademicFlowReadiness(
  context: ProgramAcademicContext,
  options?: AcademicFlowValidationOptions,
): AcademicFlowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const strict = options?.strict !== false;
  const minPeos = Math.max(0, Math.floor(Number(options?.minPeos ?? DEFAULT_MIN_PEOS)));
  const minPos = Math.max(0, Math.floor(Number(options?.minPos ?? DEFAULT_MIN_POS)));
  const minPsos = Math.max(0, Math.floor(Number(options?.minPsos ?? DEFAULT_MIN_PSOS)));

  const report = (message: string) => {
    if (strict) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  };

  if (!context.vision) {
    report("Program Vision is missing. Complete Vision phase before curriculum generation.");
  }
  if (!context.mission) {
    report("Program Mission is missing. Complete Mission phase before curriculum generation.");
  }

  if (context.peoCount !== null && context.peoCount < minPeos) {
    report(
      `Program has ${context.peoCount} PEO(s). At least ${minPeos} PEOs are required for aligned curriculum generation.`,
    );
  } else if (context.peoCount === null) {
    warnings.push("PEO count could not be verified because program_peos is unavailable.");
  }

  if (context.poCount !== null && context.poCount < minPos) {
    report(
      `Program has ${context.poCount} PO(s). At least ${minPos} POs are required for NBA-aligned curriculum generation.`,
    );
  } else if (context.poCount === null) {
    warnings.push("PO count could not be verified because program_outcomes is unavailable.");
  }

  if (context.psoCount !== null && context.psoCount < minPsos) {
    report(
      `Program has ${context.psoCount} PSO(s). At least ${minPsos} PSOs are required for program-specific curriculum alignment.`,
    );
  } else if (context.psoCount === null) {
    warnings.push("PSO count could not be verified because program_psos is unavailable.");
  }

  if (!context.hasPeoPoMatrix) {
    warnings.push(
      "PEO-PO matrix is not configured yet. Add matrix mapping for full OBE traceability.",
    );
  }

  if (!context.hasConsistencyMatrix) {
    warnings.push(
      "Consistency matrix is not configured yet. Add matrix validation for full academic pipeline integrity.",
    );
  }

  return { errors, warnings };
}
