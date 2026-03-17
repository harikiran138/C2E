import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/postgres";
import { GeneratedCurriculum } from "@/lib/curriculum/engine";
import { CurriculumValidator } from "@/lib/curriculum/validator";
import { CurriculumRepairEngine } from "@/lib/curriculum/repair-engine";
import { OBEValidator } from "@/lib/curriculum/obe-validator";
import {
  resolveProgramAcademicContext,
  validateAcademicFlowReadiness,
} from "@/lib/curriculum/program-context";
import { getOwnedProgram } from "@/lib/institution/program-vm-governance";

interface SaveCurriculumRequest {
  programId?: string;
  versionId?: string;
  curriculumId?: string;
  strictAcademicFlow?: boolean;
  categoryCredits?: any[];
  electivesSettings?: Record<string, any> | null;
  semesterCategories?: any[];
  curriculum?: GeneratedCurriculum | null;
}

function getDesignPercentTotal(categoryCredits: any[]): number {
  return categoryCredits.reduce(
    (acc, row) => acc + (Number(row?.design_percent) || 0),
    0,
  );
}

function getCategoryDesignPercent(
  categoryCredits: any[],
  categoryCode: string,
): number {
  const row = categoryCredits.find(
    (item) => String(item?.category_code || "").toUpperCase() === categoryCode,
  );
  return Number(row?.design_percent) || 0;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SaveCurriculumRequest;
  const programId = String(body.programId || "").trim();

  if (!programId) {
    return NextResponse.json({ error: "programId is required" }, { status: 400 });
  }

  // 1. Authentication Check (Manual JWT Verify)
  const cookieStore = await cookies();
  const token = cookieStore.get("institution_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload || !payload.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const institutionId = String(payload.id);
  const client = await pool.connect();

  try {
    // 2. Ownership Check
    const program = await getOwnedProgram(client, programId, institutionId);
    if (!program) {
      return NextResponse.json(
        { error: "Program not found or access denied." },
        { status: 403 },
      );
    }

    const versionId = String(body.versionId || "").trim() || null;
    let curriculumId = String(body.curriculumId || "").trim() || null;
    const repairActions: Array<{ step: string; detail: string }> = [];

    // 3. Resolve Business Context (Reuses existing logic)
    const contextResult = await resolveProgramAcademicContext(programId, client);
    const warnings: string[] = [...contextResult.warnings];
    
    if (!contextResult.context || contextResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: contextResult.errors[0] || "Failed to resolve program context.",
          warnings,
        },
        { status: 400 },
      );
    }

    // 4. Academic Readiness & OBE Validation
    const readiness = validateAcademicFlowReadiness(contextResult.context, {
      strict: body.strictAcademicFlow !== false,
      minPsos: 0,
    });
    warnings.push(...readiness.warnings);
    if (readiness.errors.length > 0) {
      return NextResponse.json(
        { error: readiness.errors[0], errors: readiness.errors, warnings },
        { status: 400 },
      );
    }

    const obeValidation = new OBEValidator(contextResult.context).validate();
    warnings.push(...obeValidation.warnings);
    if (obeValidation.blocked && body.strictAcademicFlow !== false) {
      return NextResponse.json(
        { error: obeValidation.errors[0], errors: obeValidation.errors, warnings },
        { status: 400 },
      );
    }

    // 5. Percent Validation
    if (Array.isArray(body.categoryCredits) && body.categoryCredits.length > 0) {
      const mcDesignPercent = getCategoryDesignPercent(body.categoryCredits, "MC");
      if (Math.abs(mcDesignPercent) > 0.01) {
        return NextResponse.json(
          { error: "Audit / Mandatory Courses (MC) Design % must be exactly 0." },
          { status: 400 },
        );
      }

      const total = getDesignPercentTotal(body.categoryCredits);
      if (Math.abs(total - 100) > 0.01) {
        return NextResponse.json(
          {
            error: `Design percentage total must be exactly 100. Current total is ${total.toFixed(2)}.`,
          },
          { status: 400 },
        );
      }
    }

    // 6. DB Operations (Raw SQL transactions)
    await client.query("BEGIN");

    // Fetch Version Details if versionId is provided
    let versionRow: any = null;
    if (versionId) {
      const vRes = await client.query(
        "SELECT id, program_id, year, version FROM curriculum_versions WHERE id = $1 LIMIT 1",
        [versionId],
      );
      versionRow = vRes.rows[0];
      if (!versionRow || String(versionRow.program_id) !== programId) {
        throw new Error("Invalid versionId for this program.");
      }
    }

    // Find or Create Curriculum ID
    if (!curriculumId) {
      const regulationYear = Number(versionRow?.year) || new Date().getUTCFullYear();
      const versionLabel = String(versionRow?.version || "").trim() ||
                           String(body.curriculum?.mode || "Working Draft").trim();
      const totalCredits = body.curriculum ? 160 : null;

      const cRes = await client.query(
        `INSERT INTO curriculums (program_id, regulation_year, version, total_credits)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (program_id, regulation_year, version) DO UPDATE 
         SET total_credits = EXCLUDED.total_credits, updated_at = NOW()
         RETURNING id`,
        [programId, regulationYear, versionLabel, totalCredits],
      );
      curriculumId = cRes.rows[0].id;
    }

    // Save Category Credits
    if (Array.isArray(body.categoryCredits) && body.categoryCredits.length > 0) {
      for (const row of body.categoryCredits) {
        await client.query(
          `INSERT INTO curriculum_category_credits (
            program_id, category_code, design_percent, credit, 
            courses_t, courses_p, courses_tu, courses_ll,
            hours_ci, hours_t, hours_li, hours_twd, hours_total,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (program_id, category_code) DO UPDATE SET
            design_percent = EXCLUDED.design_percent,
            credit = EXCLUDED.credit,
            courses_t = EXCLUDED.courses_t,
            courses_p = EXCLUDED.courses_p,
            courses_tu = EXCLUDED.courses_tu,
            courses_ll = EXCLUDED.courses_ll,
            hours_ci = EXCLUDED.hours_ci,
            hours_t = EXCLUDED.hours_t,
            hours_li = EXCLUDED.hours_li,
            hours_twd = EXCLUDED.hours_twd,
            hours_total = EXCLUDED.hours_total,
            updated_at = NOW()`,
          [
            programId, row.category_code, row.design_percent, row.credit,
            row.courses_t, row.courses_p, row.courses_tu, row.courses_ll,
            row.hours_ci, row.hours_t, row.hours_li, row.hours_twd, row.hours_total
          ],
        );
      }
    }

    // Save Electives Settings
    if (body.electivesSettings && typeof body.electivesSettings === "object") {
      const es = body.electivesSettings;
      await client.query(
        `INSERT INTO curriculum_electives_settings (
          program_id, conventional_elective, trans_disciplinary_elective, total_credits, updated_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (program_id) DO UPDATE SET
          conventional_elective = EXCLUDED.conventional_elective,
          trans_disciplinary_elective = EXCLUDED.trans_disciplinary_elective,
          total_credits = EXCLUDED.total_credits,
          updated_at = NOW()`,
        [programId, es.conventional_elective, es.trans_disciplinary_elective, es.total_credits],
      );
    }

    // Save Semester Categories
    if (Array.isArray(body.semesterCategories) && body.semesterCategories.length > 0) {
      for (const sc of body.semesterCategories) {
        await client.query(
          `INSERT INTO curriculum_semester_categories (
            program_id, semester, no_of_credits, 
            courses_bs, courses_es, courses_hss, courses_pc, courses_oe, 
            courses_mc, courses_ae, courses_se, courses_int, courses_pro, courses_others,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          ON CONFLICT (program_id, semester) DO UPDATE SET
            no_of_credits = EXCLUDED.no_of_credits,
            courses_bs = EXCLUDED.courses_bs,
            courses_es = EXCLUDED.courses_es,
            courses_hss = EXCLUDED.courses_hss,
            courses_pc = EXCLUDED.courses_pc,
            courses_oe = EXCLUDED.courses_oe,
            courses_mc = EXCLUDED.courses_mc,
            courses_ae = EXCLUDED.courses_ae,
            courses_se = EXCLUDED.courses_se,
            courses_int = EXCLUDED.courses_int,
            courses_pro = EXCLUDED.courses_pro,
            courses_others = EXCLUDED.courses_others,
            updated_at = NOW()`,
          [
            programId, sc.semester, sc.no_of_credits,
            sc.courses_bs, sc.courses_es, sc.courses_hss, sc.courses_pc, sc.courses_oe,
            sc.courses_mc, sc.courses_ae, sc.courses_se, sc.courses_int, sc.courses_pro, sc.courses_others
          ],
        );
      }
    }

    // Save Curriculum Courses
    if (body.curriculum) {
      let curriculumToSave = body.curriculum;
      let validation = new CurriculumValidator(curriculumToSave).validate();
      warnings.push(...validation.warnings);

      if (!validation.passed) {
        const repaired = CurriculumRepairEngine.repair(curriculumToSave);
        repairActions.push(...repaired.actions);
        warnings.push(...repaired.warnings);
        curriculumToSave = repaired.curriculum;
        validation = new CurriculumValidator(curriculumToSave).validate();
        warnings.push(...validation.warnings);
      }

      if (!validation.passed) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: validation.errors[0] || "Curriculum validation failed.",
            errors: validation.errors,
            warnings,
            repairActions,
          },
          { status: 400 },
        );
      }

      // Delete existing courses for this branch
      if (curriculumId) {
        await client.query(
          "DELETE FROM curriculum_generated_courses WHERE program_id = $1 AND curriculum_id = $2",
          [programId, curriculumId],
        );
      } else if (versionId) {
        await client.query(
          "DELETE FROM curriculum_generated_courses WHERE program_id = $1 AND version_id = $2",
          [programId, versionId],
        );
      } else {
        await client.query(
          "DELETE FROM curriculum_generated_courses WHERE program_id = $1 AND version_id IS NULL",
          [programId],
        );
      }

      // Insert new courses
      const flatCourses = curriculumToSave.semesters.flatMap((s) =>
        s.courses.map((c) => ({
          program_id: programId,
          curriculum_id: curriculumId,
          version_id: versionId,
          semester: s.semester,
          category_code: c.category,
          course_code: c.courseCode,
          course_title: c.courseTitle,
          credits: c.credits,
          t_hours: c.tHours,
          tu_hours: c.tuHours,
          ll_hours: c.llHours,
          tw_hours: c.twHours,
          total_hours: c.learningHours || c.totalHours,
          curriculum_mode: curriculumToSave.mode || "AICTE_MODEL",
          generated_at: curriculumToSave.generatedAt || new Date().toISOString(),
        })),
      );

      for (const course of flatCourses) {
        await client.query(
          `INSERT INTO curriculum_generated_courses (
            program_id, curriculum_id, version_id, semester, category_code, 
            course_code, course_title, credits, t_hours, tu_hours, ll_hours, 
            tw_hours, total_hours, curriculum_mode, generated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            course.program_id, course.curriculum_id, course.version_id, course.semester, course.category_code,
            course.course_code, course.course_title, course.credits, course.t_hours, course.tu_hours, course.ll_hours,
            course.tw_hours, course.total_hours, course.curriculum_mode, course.generated_at
          ],
        );
      }
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      repairActions,
      warnings,
    });
  } catch (error: any) {
    if (client) await client.query("ROLLBACK");
    console.error("Curriculum save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save curriculum" },
      { status: 500 },
    );
  } finally {
    if (client) client.release();
  }
}
