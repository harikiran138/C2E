import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

type ReportType = "NBA" | "NAAC" | "ABET";
type ExportFormat = "json" | "csv" | "excel" | "pdf";

interface AccreditationReportRequest {
  programId: string;
  reportType: ReportType;
  versionId?: string;
  curriculumId?: string;
  academicYear?: string;
  exportFormat?: ExportFormat;
}

interface CurriculumMatrixRow {
  courseCode: string;
  courseTitle: string;
  semester: number;
  category: string;
  credits: number;
}

interface COPOMatrixRow {
  courseCode: string;
  coCode: string;
  statement: string;
  poMapping: number[];
  psoMapping: number[];
  strength: number;
}

interface CategoryDistributionEntry {
  category: string;
  credits: number;
  percentage: number;
}

interface CourseListEntry {
  semester: number;
  courseCode: string;
  courseTitle: string;
  credits: number;
  category: string;
}

interface MissionPeoMatrix {
  missionStatements: string[];
  peoHeaders: string[];
  rows: number[][];
}

interface PeoPoMatrix {
  peoHeaders: string[];
  poHeaders: string[];
  rows: string[][];
}

interface COAttainmentRow {
  courseCode: string;
  coCode: string;
  internalScore: number;
  externalScore: number;
  calculatedAttainment: number;
  academicYear: string;
}

interface POAttainmentRow {
  poId: number;
  attainmentValue: number;
  academicYear: string;
}

interface StakeholderFeedbackRow {
  group: string;
  submissions: number;
  averageRating: number;
}

interface AccreditationReport {
  reportType: ReportType;
  programId: string;
  curriculumId: string | null;
  versionId: string | null;
  generatedAt: string;
  warnings: string[];
  curriculumMatrix: {
    headers: string[];
    rows: CurriculumMatrixRow[];
  };
  missionPeoMatrix: MissionPeoMatrix;
  peoPoMatrix: PeoPoMatrix;
  coPOMatrix: {
    headers: string[];
    rows: COPOMatrixRow[];
  };
  coAttainmentMatrix: {
    headers: string[];
    rows: COAttainmentRow[];
  };
  poAttainmentMatrix: {
    headers: string[];
    rows: POAttainmentRow[];
  };
  categoryDistribution: CategoryDistributionEntry[];
  stakeholderFeedback: StakeholderFeedbackRow[];
  courseList: CourseListEntry[];
  analytics: {
    poAttainmentRadar: Array<{ po: string; attainment: number }>;
    coAttainmentBar: Array<{ co: string; attainment: number }>;
    stakeholderFeedbackGraph: Array<{ group: string; rating: number; submissions: number }>;
    curriculumCreditDistribution: Array<{ category: string; credits: number }>;
  };
}

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeReportType(value: unknown): ReportType | null {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "NBA" || normalized === "NAAC" || normalized === "ABET") {
    return normalized;
  }
  return null;
}

function normalizeExportFormat(value: unknown): ExportFormat {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "csv" || normalized === "excel" || normalized === "pdf") {
    return normalized;
  }
  return "json";
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function parseMissionStatements(mission: string): string[] {
  const normalized = normalizeText(mission);
  if (!normalized) return [];

  const pieces = normalized
    .split(/\.|;|\n|\u2022|\-/g)
    .map((part) => normalizeText(part))
    .filter((part) => part.length >= 8);

  if (pieces.length === 0) return [normalized];
  return pieces.slice(0, 8);
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length >= 3),
  );
}

function lexicalStrength(left: string, right: string): number {
  const a = tokenize(left);
  const b = tokenize(right);
  if (a.size === 0 || b.size === 0) return 0;

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }

  const ratio = overlap / Math.max(a.size, b.size);
  if (ratio >= 0.2) return 3;
  if (ratio >= 0.12) return 2;
  if (ratio >= 0.05) return 1;
  return 0;
}

function strengthLabel(value: number): string {
  if (value >= 3) return "3";
  if (value === 2) return "2";
  if (value === 1) return "1";
  return "-";
}

function safeParseMatrix(matrix: unknown): string[][] {
  if (!Array.isArray(matrix)) return [];
  return matrix
    .map((row) => (Array.isArray(row) ? row.map((cell) => normalizeText(cell)) : []))
    .filter((row) => row.length > 0);
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsvRows(report: AccreditationReport): string[][] {
  const rows: string[][] = [];

  rows.push(["Report Type", report.reportType]);
  rows.push(["Program ID", report.programId]);
  rows.push(["Generated At", report.generatedAt]);
  rows.push([]);

  rows.push(["Curriculum Matrix"]);
  rows.push(["Course Code", "Course Title", "Semester", "Category", "Credits"]);
  for (const row of report.curriculumMatrix.rows) {
    rows.push([
      row.courseCode,
      row.courseTitle,
      String(row.semester),
      row.category,
      String(row.credits),
    ]);
  }
  rows.push([]);

  rows.push(["Mission-PEO Matrix"]);
  rows.push(["Mission Statement", ...report.missionPeoMatrix.peoHeaders]);
  report.missionPeoMatrix.rows.forEach((matrixRow, index) => {
    rows.push([
      report.missionPeoMatrix.missionStatements[index] || `Mission ${index + 1}`,
      ...matrixRow.map((cell) => String(cell)),
    ]);
  });
  rows.push([]);

  rows.push(["PEO-PO Matrix"]);
  rows.push(["PEO", ...report.peoPoMatrix.poHeaders]);
  report.peoPoMatrix.rows.forEach((matrixRow, index) => {
    rows.push([report.peoPoMatrix.peoHeaders[index] || `PEO${index + 1}`, ...matrixRow]);
  });
  rows.push([]);

  rows.push(["CO-PO Matrix"]);
  rows.push(["Course", "CO", "Statement", ...Array.from({ length: 12 }, (_, i) => `PO${i + 1}`), ...Array.from({ length: 3 }, (_, i) => `PSO${i + 1}`), "Strength"]);
  for (const row of report.coPOMatrix.rows) {
    rows.push([
      row.courseCode,
      row.coCode,
      row.statement,
      ...Array.from({ length: 12 }, (_, i) => (row.poMapping.includes(i + 1) ? "1" : "")),
      ...Array.from({ length: 3 }, (_, i) => (row.psoMapping.includes(i + 1) ? "1" : "")),
      String(row.strength),
    ]);
  }
  rows.push([]);

  rows.push(["CO Attainment Matrix"]);
  rows.push(["Course", "CO", "Internal", "External", "Attainment", "Academic Year"]);
  for (const row of report.coAttainmentMatrix.rows) {
    rows.push([
      row.courseCode,
      row.coCode,
      String(row.internalScore),
      String(row.externalScore),
      String(row.calculatedAttainment),
      row.academicYear,
    ]);
  }
  rows.push([]);

  rows.push(["PO Attainment Matrix"]);
  rows.push(["PO", "Attainment", "Academic Year"]);
  for (const row of report.poAttainmentMatrix.rows) {
    rows.push([`PO${row.poId}`, String(row.attainmentValue), row.academicYear]);
  }

  return rows;
}

function buildCsv(report: AccreditationReport): string {
  return buildCsvRows(report)
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n");
}

function excelXmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildExcelXml(report: AccreditationReport): string {
  const rows = buildCsvRows(report);
  const rowXml = rows
    .map(
      (row) =>
        `<Row>${row
          .map(
            (cell) =>
              `<Cell><Data ss:Type="String">${excelXmlEscape(cell)}</Data></Cell>`,
          )
          .join("")}</Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Accreditation Report">
  <Table>
   ${rowXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildSimplePdf(report: AccreditationReport): Buffer {
  const lines = [
    `${report.reportType} Accreditation Report`,
    `Program: ${report.programId}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`,
    "",
    `Courses: ${report.courseList.length}`,
    `CO rows: ${report.coPOMatrix.rows.length}`,
    `CO Attainment rows: ${report.coAttainmentMatrix.rows.length}`,
    `PO Attainment rows: ${report.poAttainmentMatrix.rows.length}`,
    "",
    "Category Credits:",
    ...report.categoryDistribution.map(
      (row) => `- ${row.category}: ${row.credits} credits (${row.percentage}%)`,
    ),
    "",
    "Stakeholder Feedback:",
    ...report.stakeholderFeedback.map(
      (row) => `- ${row.group}: ${row.averageRating}/5 (${row.submissions} responses)`,
    ),
  ];

  const limitedLines = lines.slice(0, 56);
  const content = ["BT", "/F1 10 Tf", "50 760 Td"];
  limitedLines.forEach((line, index) => {
    if (index > 0) {
      content.push("0 -14 Td");
    }
    content.push(`(${escapePdfText(line)}) Tj`);
  });
  content.push("ET");

  const streamText = content.join("\n");
  const streamLength = Buffer.byteLength(streamText, "utf8");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
  );
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  objects.push(
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}\nendstream\nendobj\n`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

async function queryStakeholderFeedback(programId: string): Promise<StakeholderFeedbackRow[]> {
  const client = await pool.connect();
  try {
    const vmpeoRows = await client
      .query<{
        stakeholder_category: string | null;
        avg_rating: string;
        submissions: string;
      }>(
        `SELECT
           s.stakeholder_category,
           AVG(e.rating)::numeric::text AS avg_rating,
           COUNT(*)::text AS submissions
         FROM program_vmpeo_feedback_entries e
         INNER JOIN program_vmpeo_feedback_submissions s ON s.id = e.submission_id
         WHERE s.program_id = $1
         GROUP BY s.stakeholder_category`,
        [programId],
      )
      .catch((error: any) => {
        if (String(error?.code) === "42P01") {
          return {
            rows: [] as Array<{ stakeholder_category: string | null; avg_rating: string; submissions: string }>,
          };
        }
        throw error;
      });

    const aggregation = new Map<string, { total: number; weighted: number }>();

    for (const row of vmpeoRows.rows) {
      const label = normalizeText(row.stakeholder_category || "others").toLowerCase() || "others";
      const submissions = Number(row.submissions || 0);
      const avg = Number(row.avg_rating || 0);
      const existing = aggregation.get(label) || { total: 0, weighted: 0 };
      existing.total += submissions;
      existing.weighted += avg * submissions;
      aggregation.set(label, existing);
    }

    return Array.from(aggregation.entries())
      .map(([group, value]) => ({
        group,
        submissions: value.total,
        averageRating: value.total > 0 ? round2(value.weighted / value.total) : 0,
      }))
      .sort((left, right) => right.submissions - left.submissions);
  } finally {
    client.release();
  }
}

async function generateAccreditationReport(input: {
  programId: string;
  reportType: ReportType;
  versionId: string | null;
  curriculumId: string | null;
  academicYear: string | null;
}): Promise<AccreditationReport> {
  const warnings: string[] = [];
  const client = await pool.connect();

  try {
    const programResult = await client.query<{
      mission: string | null;
      program_mission: string | null;
      peo_po_matrix: unknown;
    }>(
      `SELECT mission, program_mission, peo_po_matrix
       FROM programs
       WHERE id = $1
       LIMIT 1`,
      [input.programId],
    );

    if (programResult.rows.length === 0) {
      throw new Error("Program not found.");
    }

    const program = programResult.rows[0];

    let coursesResult = await client.query<{
      course_code: string;
      course_title: string;
      semester: number;
      category_code: string;
      credits: number;
    }>(
      `SELECT course_code, course_title, semester, category_code, credits
       FROM curriculum_generated_courses
       WHERE program_id = $1
         ${input.curriculumId ? "AND curriculum_id = $2" : input.versionId ? "AND version_id = $2" : "AND version_id IS NULL"}
       ORDER BY semester ASC, course_code ASC`,
      input.curriculumId || input.versionId
        ? [input.programId, input.curriculumId || input.versionId]
        : [input.programId],
    );

    const outcomesQueryWithCurriculum = async () =>
      client.query<{
        course_code: string;
        co_code: string;
        statement: string;
        po_mapping: number[] | null;
        pso_mapping: number[] | null;
        strength: string | null;
      }>(
        `SELECT course_code, co_code, statement, po_mapping, pso_mapping, strength
         FROM curriculum_course_outcomes
         WHERE program_id = $1
           ${input.curriculumId ? "AND curriculum_id = $2" : "AND curriculum_id IS NULL"}
         ORDER BY course_code ASC, co_number ASC`,
        input.curriculumId ? [input.programId, input.curriculumId] : [input.programId],
      );

    const outcomesQueryWithoutCurriculum = async () =>
      client.query<{
        course_code: string;
        co_code: string;
        statement: string;
        po_mapping: number[] | null;
        pso_mapping: number[] | null;
        strength: string | null;
      }>(
        `SELECT course_code, co_code, statement, po_mapping, pso_mapping, strength
         FROM curriculum_course_outcomes
         WHERE program_id = $1
         ORDER BY course_code ASC, co_number ASC`,
        [input.programId],
      );

    let outcomesResult;
    try {
      outcomesResult = await outcomesQueryWithCurriculum();
    } catch (error: any) {
      if (String(error?.code) === "42703") {
        warnings.push(
          "curriculum_course_outcomes.curriculum_id is unavailable; using program-level outcomes.",
        );
        outcomesResult = await outcomesQueryWithoutCurriculum();
      } else {
        throw error;
      }
    }

    const peoResult = await client
      .query<{ peo_number: number; peo_statement: string }>(
        `SELECT peo_number, peo_statement
         FROM program_peos
         WHERE program_id = $1
         ORDER BY peo_number ASC`,
        [input.programId],
      )
      .catch((error: any) => {
        if (String(error?.code) === "42P01") {
          warnings.push("program_peos table not found; mission-PEO and PEO-PO matrices are limited.");
          return { rows: [] as Array<{ peo_number: number; peo_statement: string }> };
        }
        throw error;
      });

    const poResult = await client
      .query<{ po_code: string; po_description: string | null }>(
        `SELECT po_code, po_description
         FROM program_outcomes
         WHERE program_id = $1
         ORDER BY po_code ASC`,
        [input.programId],
      )
      .catch((error: any) => {
        if (String(error?.code) === "42P01") {
          warnings.push("program_outcomes table not found; PEO-PO matrix fallback is limited.");
          return { rows: [] as Array<{ po_code: string; po_description: string | null }> };
        }
        throw error;
      });

    const categoryCreditsResult = await client
      .query<{ category_code: string; credit: string }>(
        `SELECT category_code, credit
         FROM curriculum_category_credits
         WHERE program_id = $1`,
        [input.programId],
      )
      .catch((error: any) => {
        if (String(error?.code) === "42P01") {
          return { rows: [] as Array<{ category_code: string; credit: string }> };
        }
        throw error;
      });

    const coAttainmentResult = await client
      .query<{
        course_code: string;
        co_code: string;
        internal_score: string;
        external_score: string;
        calculated_attainment: string;
        academic_year: string;
      }>(
        `SELECT course_code, co_code, internal_score, external_score, calculated_attainment, academic_year
         FROM co_attainment
         WHERE program_id = $1
           ${input.curriculumId ? "AND curriculum_id = $2" : "AND curriculum_id IS NULL"}
           ${input.academicYear ? `AND academic_year = $${input.curriculumId ? 3 : 2}` : ""}
         ORDER BY course_code ASC, co_code ASC`,
        input.academicYear
          ? input.curriculumId
            ? [input.programId, input.curriculumId, input.academicYear]
            : [input.programId, input.academicYear]
          : input.curriculumId
            ? [input.programId, input.curriculumId]
            : [input.programId],
      )
      .catch((error: any) => {
        if (String(error?.code) === "42P01") {
          warnings.push("co_attainment table not found; CO attainment matrix is unavailable.");
          return {
            rows: [] as Array<{
              course_code: string;
              co_code: string;
              internal_score: string;
              external_score: string;
              calculated_attainment: string;
              academic_year: string;
            }>,
          };
        }
        throw error;
      });

    const poAttainmentResult = await client
      .query<{
        po_id: number;
        attainment_value: string;
        academic_year: string;
      }>(
        `SELECT po_id, attainment_value, academic_year
         FROM po_attainment
         WHERE program_id = $1
           ${input.curriculumId ? "AND curriculum_id = $2" : "AND curriculum_id IS NULL"}
           ${input.academicYear ? `AND academic_year = $${input.curriculumId ? 3 : 2}` : ""}
         ORDER BY po_id ASC`,
        input.academicYear
          ? input.curriculumId
            ? [input.programId, input.curriculumId, input.academicYear]
            : [input.programId, input.academicYear]
          : input.curriculumId
            ? [input.programId, input.curriculumId]
            : [input.programId],
      )
      .catch((error: any) => {
        if (String(error?.code) === "42P01") {
          warnings.push("po_attainment table not found; PO attainment matrix is unavailable.");
          return {
            rows: [] as Array<{ po_id: number; attainment_value: string; academic_year: string }>,
          };
        }
        throw error;
      });

    const curriculumRows: CurriculumMatrixRow[] = coursesResult.rows.map((row) => ({
      courseCode: normalizeText(row.course_code),
      courseTitle: normalizeText(row.course_title),
      semester: Number(row.semester || 0),
      category: normalizeText(row.category_code),
      credits: Number(row.credits || 0),
    }));

    const totalCredits = curriculumRows.reduce((sum, row) => sum + row.credits, 0);

    const categoryDistribution =
      categoryCreditsResult.rows.length > 0
        ? categoryCreditsResult.rows.map((row) => {
            const credits = Number(row.credit || 0);
            return {
              category: normalizeText(row.category_code),
              credits,
              percentage: totalCredits > 0 ? round2((credits / totalCredits) * 100) : 0,
            };
          })
        : Array.from(
            curriculumRows.reduce((map, row) => {
              map.set(row.category, (map.get(row.category) || 0) + row.credits);
              return map;
            }, new Map<string, number>()),
          )
            .map(([category, credits]) => ({
              category,
              credits,
              percentage: totalCredits > 0 ? round2((credits / totalCredits) * 100) : 0,
            }))
            .sort((a, b) => a.category.localeCompare(b.category));

    const courseList: CourseListEntry[] = curriculumRows.map((row) => ({
      semester: row.semester,
      courseCode: row.courseCode,
      courseTitle: row.courseTitle,
      credits: row.credits,
      category: row.category,
    }));

    const missionStatements = parseMissionStatements(
      normalizeText(program.program_mission) || normalizeText(program.mission),
    );

    const peoHeaders = peoResult.rows.map((row) => `PEO${Number(row.peo_number || 0)}`);

    const missionPeoRows = missionStatements.map((statement) =>
      peoResult.rows.map((peo) => lexicalStrength(statement, normalizeText(peo.peo_statement))),
    );

    const poHeaders =
      poResult.rows.length > 0
        ? poResult.rows.map((row) => normalizeText(row.po_code).toUpperCase())
        : Array.from({ length: 12 }, (_, i) => `PO${i + 1}`);

    const peoPoMatrixFromProgram = safeParseMatrix(program.peo_po_matrix);
    const peoPoRows: string[][] =
      peoPoMatrixFromProgram.length > 0
        ? peoPoMatrixFromProgram
        : peoResult.rows.map((peo) =>
            (poResult.rows.length > 0
              ? poResult.rows
              : Array.from({ length: 12 }, (_, i) => ({ po_code: `PO${i + 1}`, po_description: "" }))
            ).map((po) => {
              const score = lexicalStrength(
                normalizeText(peo.peo_statement),
                `${normalizeText(po.po_code)} ${normalizeText(po.po_description)}`,
              );
              return strengthLabel(score);
            }),
          );

    const coPOByKey = new Map<string, { po: Set<number>; pso: Set<number>; strength: number }>();
    const outcomeByKey = new Map<string, { statement: string; po: number[]; pso: number[]; strength: number }>();

    for (const outcome of outcomesResult.rows) {
      const key = `${normalizeText(outcome.course_code)}::${normalizeText(outcome.co_code)}`;
      const po = Array.isArray(outcome.po_mapping)
        ? outcome.po_mapping.map(Number).filter((value) => Number.isFinite(value) && value >= 1 && value <= 12)
        : [];
      const pso = Array.isArray(outcome.pso_mapping)
        ? outcome.pso_mapping.map(Number).filter((value) => Number.isFinite(value) && value >= 1 && value <= 3)
        : [];

      outcomeByKey.set(key, {
        statement: normalizeText(outcome.statement),
        po,
        pso,
        strength: Number(outcome.strength || 2),
      });

      coPOByKey.set(key, {
        po: new Set(po),
        pso: new Set(pso),
        strength: Math.min(3, Math.max(1, Number(outcome.strength || 2))),
      });
    }

    const normalizedMappingQuery = await client
      .query<{
        course_code: string;
        co_code: string;
        po_id: number;
        strength: number;
      }>(
        `SELECT course_code, co_code, po_id, strength
         FROM co_po_mapping
         WHERE program_id = $1
           ${input.curriculumId ? "AND curriculum_id = $2" : "AND curriculum_id IS NULL"}
         ORDER BY course_code ASC, co_code ASC, po_id ASC`,
        input.curriculumId ? [input.programId, input.curriculumId] : [input.programId],
      )
      .catch((error: any) => {
        if (String(error?.code) === "42P01") {
          warnings.push("co_po_mapping table not found; using array-based CO-PO mapping.");
          return {
            rows: [] as Array<{ course_code: string; co_code: string; po_id: number; strength: number }>,
          };
        }
        throw error;
      });

    const normalizedPsoMappingQuery = await client
      .query<{
        course_code: string;
        co_code: string;
        pso_id: number;
        strength: number;
      }>(
        `SELECT course_code, co_code, pso_id, strength
         FROM co_pso_mapping
         WHERE program_id = $1
           ${input.curriculumId ? "AND curriculum_id = $2" : "AND curriculum_id IS NULL"}
         ORDER BY course_code ASC, co_code ASC, pso_id ASC`,
        input.curriculumId ? [input.programId, input.curriculumId] : [input.programId],
      )
      .catch((error: any) => {
        if (String(error?.code) === "42P01") {
          warnings.push("co_pso_mapping table not found; using array-based CO-PSO mapping.");
          return {
            rows: [] as Array<{ course_code: string; co_code: string; pso_id: number; strength: number }>,
          };
        }
        throw error;
      });

    if (normalizedMappingQuery.rows.length > 0) {
      coPOByKey.clear();
      for (const row of normalizedMappingQuery.rows) {
        const key = `${normalizeText(row.course_code)}::${normalizeText(row.co_code)}`;
        const existing = coPOByKey.get(key) || {
          po: new Set<number>(),
          pso: new Set<number>(),
          strength: 1,
        };
        existing.po.add(Number(row.po_id));
        existing.strength = Math.max(existing.strength, Number(row.strength || 1));
        coPOByKey.set(key, existing);
      }

      for (const row of normalizedPsoMappingQuery.rows) {
        const key = `${normalizeText(row.course_code)}::${normalizeText(row.co_code)}`;
        const existing = coPOByKey.get(key) || {
          po: new Set<number>(),
          pso: new Set<number>(),
          strength: 1,
        };
        existing.pso.add(Number(row.pso_id));
        existing.strength = Math.max(existing.strength, Number(row.strength || 1));
        coPOByKey.set(key, existing);
      }
    }

    const coPOMatrixRows: COPOMatrixRow[] = Array.from(coPOByKey.entries())
      .map(([key, mapping]) => {
        const [courseCode, coCode] = key.split("::");
        const fallback = outcomeByKey.get(key);
        return {
          courseCode,
          coCode,
          statement: fallback?.statement || "",
          poMapping: Array.from(mapping.po).sort((a, b) => a - b),
          psoMapping: Array.from(mapping.pso).sort((a, b) => a - b),
          strength: Math.min(3, Math.max(1, Number(mapping.strength || 1))),
        };
      })
      .sort((left, right) => {
        if (left.courseCode === right.courseCode) {
          return left.coCode.localeCompare(right.coCode);
        }
        return left.courseCode.localeCompare(right.courseCode);
      });

    const coAttainmentRows: COAttainmentRow[] = coAttainmentResult.rows.map((row) => ({
      courseCode: normalizeText(row.course_code),
      coCode: normalizeText(row.co_code),
      internalScore: Number(row.internal_score || 0),
      externalScore: Number(row.external_score || 0),
      calculatedAttainment: Number(row.calculated_attainment || 0),
      academicYear: normalizeText(row.academic_year),
    }));

    const poAttainmentRows: POAttainmentRow[] = poAttainmentResult.rows.map((row) => ({
      poId: Number(row.po_id || 0),
      attainmentValue: Number(row.attainment_value || 0),
      academicYear: normalizeText(row.academic_year),
    }));

    const stakeholderFeedback = await queryStakeholderFeedback(input.programId);

    const analytics = {
      poAttainmentRadar: Array.from({ length: 12 }, (_, index) => {
        const poId = index + 1;
        const values = poAttainmentRows.filter((row) => row.poId === poId).map((row) => row.attainmentValue);
        const average =
          values.length > 0 ? round2(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
        return { po: `PO${poId}`, attainment: average };
      }),
      coAttainmentBar: coAttainmentRows.slice(0, 40).map((row) => ({
        co: `${row.courseCode}-${row.coCode}`,
        attainment: row.calculatedAttainment,
      })),
      stakeholderFeedbackGraph: stakeholderFeedback.map((row) => ({
        group: row.group,
        rating: row.averageRating,
        submissions: row.submissions,
      })),
      curriculumCreditDistribution: categoryDistribution.map((row) => ({
        category: row.category,
        credits: row.credits,
      })),
    };

    return {
      reportType: input.reportType,
      programId: input.programId,
      curriculumId: input.curriculumId,
      versionId: input.versionId,
      generatedAt: new Date().toISOString(),
      warnings,
      curriculumMatrix: {
        headers: Array.from(new Set(curriculumRows.map((row) => row.category))).sort(),
        rows: curriculumRows,
      },
      missionPeoMatrix: {
        missionStatements,
        peoHeaders,
        rows: missionPeoRows,
      },
      peoPoMatrix: {
        peoHeaders,
        poHeaders,
        rows: peoPoRows,
      },
      coPOMatrix: {
        headers: [
          "Course",
          "CO",
          "Statement",
          ...Array.from({ length: 12 }, (_, i) => `PO${i + 1}`),
          ...Array.from({ length: 3 }, (_, i) => `PSO${i + 1}`),
          "Strength",
        ],
        rows: coPOMatrixRows,
      },
      coAttainmentMatrix: {
        headers: ["Course", "CO", "Internal", "External", "Attainment", "Academic Year"],
        rows: coAttainmentRows,
      },
      poAttainmentMatrix: {
        headers: ["PO", "Attainment", "Academic Year"],
        rows: poAttainmentRows,
      },
      categoryDistribution,
      stakeholderFeedback,
      courseList,
      analytics,
    };
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AccreditationReportRequest;

    const programId = normalizeText(body.programId);
    const reportType = normalizeReportType(body.reportType);
    const exportFormat = normalizeExportFormat(body.exportFormat);
    const versionId = normalizeText(body.versionId) || null;
    const curriculumId = normalizeText(body.curriculumId) || null;
    const academicYear = normalizeText(body.academicYear) || null;

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    if (!reportType) {
      return NextResponse.json(
        { error: "reportType must be one of: NBA, NAAC, ABET" },
        { status: 400 },
      );
    }

    const report = await generateAccreditationReport({
      programId,
      reportType,
      versionId,
      curriculumId,
      academicYear,
    });

    if (exportFormat === "csv") {
      const csv = buildCsv(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${reportType.toLowerCase()}_accreditation_report.csv"`,
        },
      });
    }

    if (exportFormat === "excel") {
      const xml = buildExcelXml(report);
      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${reportType.toLowerCase()}_accreditation_report.xls"`,
        },
      });
    }
    if (exportFormat === "pdf") {
      const pdfBuffer = buildSimplePdf(report);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${reportType.toLowerCase()}_accreditation_report.pdf"`,
        },
      });
    }

    // Add audit log after successful generation
    const token = (await cookies()).get("institution_token")?.value;
    if (token) {
      const payload = await verifyToken(token);
      const institutionId = payload?.id as string;
      if (institutionId) {
        const auditClient = await pool.connect();
        try {
          await auditClient.query(
            `INSERT INTO audit_logs (institution_id, action, metadata)
             VALUES ($1, 'REPORT_GENERATED', $2)`,
            [institutionId, JSON.stringify({ programId, reportType, exportFormat, academicYear })]
          );
        } catch (e) {
          console.error("Failed to log audit event:", e);
        } finally {
          auditClient.release();
        }
      }
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Accreditation report error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate accreditation report" },
      { status: 500 },
    );
  }
}
