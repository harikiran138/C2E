import pool from "@/lib/postgres";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    console.log(`API Dashboard: Request received for programId: ${programId}`);

    const cookieStore = await cookies();
    const token = cookieStore.get("institution_token")?.value;

    if (!token) {
      console.warn("API Dashboard: Unauthorized - No Token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const institutionId = payload.id as string;
    let dataVars: any = {};

    const client = await pool.connect();
    try {
      // Run independent queries in parallel
      const [nameRes, progRes, obeRes, acRes, allProgsRes] = await Promise.all([
        client.query(
          `SELECT i.institution_name, id.vision, id.mission 
           FROM institutions i
           LEFT JOIN institution_details id ON i.id = id.institution_id
           WHERE i.id = $1`,
          [institutionId],
        ),
        client.query(
          "SELECT COUNT(*) as count FROM programs WHERE institution_id = $1",
          [institutionId],
        ),
        client.query(
          "SELECT COUNT(*) as count FROM obe_framework WHERE institution_id = $1",
          [institutionId],
        ),
        client.query(
          "SELECT COUNT(*) as count FROM academic_council WHERE institution_id = $1",
          [institutionId],
        ),
        client.query(
          "SELECT id, program_name, degree, level, program_code, academic_year, created_at FROM programs WHERE institution_id = $1 ORDER BY created_at DESC",
          [institutionId],
        ),
      ]);

      const institutionName =
        nameRes.rows[0]?.institution_name || "Institution";
      const vision = nameRes.rows[0]?.vision;
      const mission = nameRes.rows[0]?.mission;
      const programsCount = parseInt(progRes.rows[0]?.count || "0");
      const obeCount = parseInt(obeRes.rows[0]?.count || "0");
      const acCount = parseInt(acRes.rows[0]?.count || "0");
      const programsList = allProgsRes.rows || [];

      let dataVars: any = {};
      let stepStatus: Record<string, any> = {};
      stepStatus["process-1"] = obeCount > 0;
      stepStatus["council"] = acCount > 0;

      let pacCount = 0;
      let bosCount = 0;
      let stakeholdersCount = 0;
      let peoCount = 0;
      let poCount = 0;
      let psoCount = 0;
      let vmpeoFeedbackSubmissions = 0;
      let vmpeoFeedbackEntries = 0;

      // Initialize optional stats
      let curriculumCount = 0;
      let courseCount = 0;
      let coCount = 0;
      let curriculumFeedbackCount = 0;
      let reportCount = 0;
      let consistencyMatrixCount = 0;
      let disseminationCount = 0;
      let curriculumDataCount = 0;

      if (programId) {
        // Enforce STRICT relational boundaries: Verify the program actually belongs to this exact institution.
        // Prevents Insecure Direct Object Reference (IDOR) cross-tenant data leaks.
        const progAuthCheck = await client.query(
          "SELECT 1 FROM programs WHERE id = $1 AND institution_id = $2",
          [programId, institutionId]
        );

        if (progAuthCheck.rows.length === 0) {
          return NextResponse.json(
            { error: "Unauthorized access to this Program data." },
            { status: 403 },
          );
        }

        const safeProgramCount = async (
          tableName:
            | "program_vmpeo_feedback_submissions"
            | "program_vmpeo_feedback_entries",
        ) => {
          try {
            const result = await client.query(
              `SELECT COUNT(*) as count FROM ${tableName} WHERE program_id = $1`,
              [programId],
            );
            return parseInt(result.rows[0]?.count || "0");
          } catch (error: any) {
            if (error?.code === "42P01") return 0; // relation does not exist yet
            throw error;
          }
        };

        const results = await Promise.all([
          client.query("SELECT COUNT(*) as count FROM pac_members WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM bos_members WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM representative_stakeholders WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM program_coordinators WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT EXISTS(SELECT 1 FROM program_vmp_versions WHERE program_id = $1 AND is_final = true) as finalized", [programId]).catch(() => ({ rows: [{ finalized: false }] })),
          client.query("SELECT COUNT(*) as count FROM program_peos WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM program_outcomes WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM program_psos WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM curriculum_category_credits WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM curriculum_obe_mappings WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM curriculum_course_outcomes WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM curriculum_feedback WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM audit_logs WHERE metadata->>'programId' = $1 AND action = 'REPORT_GENERATED'", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM consistency_matrix WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM program_dissemination WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
          client.query("SELECT COUNT(*) as count FROM curriculum_generated_courses WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0 }] })),
        ]);

        const [
          pacRes, bosRes, stakeRes, coordRes, vmpRes, peoRes, poRes, psoRes,
          currRes, courseRes, coRes, feedbackRes, reportRes, matrixRes, disseminateRes, dataRes
        ] = results;

        curriculumCount = parseInt(currRes.rows[0]?.count || "0");
        const obeMappedCount = parseInt(courseRes.rows[0]?.count || "0");
        coCount = parseInt(coRes.rows[0]?.count || "0");
        curriculumFeedbackCount = parseInt(feedbackRes.rows[0]?.count || "0");
        reportCount = parseInt(reportRes.rows[0]?.count || "0");
        consistencyMatrixCount = parseInt(matrixRes.rows[0]?.count || "0");
        disseminationCount = parseInt(disseminateRes.rows[0]?.count || "0");
        curriculumDataCount = parseInt(dataRes.rows[0]?.count || "0");
        
        // Ensure courseCount reflects either core courses or generated courses
        courseCount = obeMappedCount || curriculumDataCount;

        pacCount = parseInt(pacRes.rows[0]?.count || "0");
        bosCount = parseInt(bosRes.rows[0]?.count || "0");
        stakeholdersCount = parseInt(stakeRes.rows[0]?.count || "0");
        peoCount = parseInt(peoRes.rows[0]?.count || "0");
        poCount = parseInt(poRes.rows[0]?.count || "0");
        psoCount = parseInt(psoRes.rows[0]?.count || "0");
        vmpeoFeedbackSubmissions = await safeProgramCount(
          "program_vmpeo_feedback_submissions",
        );
        vmpeoFeedbackEntries = await safeProgramCount(
          "program_vmpeo_feedback_entries",
        );
        // Map all 18 process steps to indicators
        stepStatus["council"] = acCount > 0;
        stepStatus["process-1"] = obeCount > 0;
        // process-2 removed
        stepStatus["process-3"] = pacCount > 0;
        stepStatus["process-4"] = bosCount > 0;
        stepStatus["process-5"] = stakeholdersCount > 0;
        stepStatus["process-6"] = vmpRes.rows[0]?.finalized;
        stepStatus["process-7"] = vmpeoFeedbackEntries > 0;
        stepStatus["process-8"] = consistencyMatrixCount > 0;
        stepStatus["process-9"] = poCount > 0;
        stepStatus["process-10"] = psoCount > 0;
        stepStatus["process-11"] = disseminationCount > 0;
        stepStatus["process-12"] = curriculumCount > 0;
        stepStatus["process-13"] = courseCount > 0;
        stepStatus["process-14"] = coCount > 0;
        stepStatus["process-15"] = curriculumDataCount > 0;
        stepStatus["process-16"] = curriculumFeedbackCount > 0;
        stepStatus["process-17"] = true; // Analytics Active
        stepStatus["process-18"] = reportCount > 0;

        dataVars.peoCount = peoCount;
        dataVars.poCount = poCount;
        dataVars.psoCount = psoCount;
        dataVars.vmpeoFeedbackSubmissions = vmpeoFeedbackSubmissions;
        dataVars.vmpeoFeedbackEntries = vmpeoFeedbackEntries;
      }

      // 7. Recent Activities (Filter by program if selected)
      let recentQuery =
        "SELECT id, program_name, created_at FROM programs WHERE institution_id = $1";
      let recentParams = [institutionId];
      if (programId) {
        recentQuery += " AND id = $2";
        recentParams.push(programId);
      }
      recentQuery += " ORDER BY created_at DESC LIMIT 5";

      const recentRes = await client.query(recentQuery, recentParams);
      const activities = (recentRes.rows || []).map((p) => ({
        id: p.id,
        user: { name: "Institutional Admin", avatar: "", initials: "IA" },
        action: "added a new program",
        target: p.program_name,
        timestamp: new Date(p.created_at).toLocaleDateString(),
        type: "program" as const,
      }));

      // 6. Program Specific Data (moved up or updated)
      let activeStudents = 0;
      let totalResponses = 0;
      let avgRating = 0;

      if (programId) {
        // ... (previous program specific queries)
        // Let's add a query for student count and responses if not already there
         const [studentRes, feedbackRes] = await Promise.all([
          client.query(
            "SELECT COUNT(*) as count FROM stakeholders WHERE program_id = $1 AND category = 'Students'",
            [programId],
          ),
          client.query(
            "SELECT COUNT(*) as count, AVG(vision_alignment_rating) as avg_rating FROM stakeholder_feedback WHERE program_id = $1",
            [programId],
          ).catch(() => ({ rows: [{ count: 0, avg_rating: 0 }] })), // Handle missing table or column legacy gracefully
        ]);
        activeStudents = parseInt(studentRes.rows[0]?.count || "0");
        totalResponses = parseInt(feedbackRes.rows[0]?.count || "0");
        avgRating = parseFloat(feedbackRes.rows[0]?.avg_rating || "0");
      } else {
        // Institution-wide stats
        const [studentRes, feedbackRes] = await Promise.all([
          client.query(
            "SELECT COUNT(*) as count FROM stakeholders s JOIN programs p ON s.program_id = p.id WHERE p.institution_id = $1 AND s.category = 'Students'",
            [institutionId],
          ),
          client.query(
            "SELECT COUNT(*) as count, AVG(vision_alignment_rating) as avg_rating FROM stakeholder_feedback WHERE program_id IN (SELECT id FROM programs WHERE institution_id = $1)",
            [institutionId],
          ).catch(() => ({ rows: [{ count: 0, avg_rating: 0 }] })), // Handle missing table or column legacy gracefully
        ]);
        activeStudents = parseInt(studentRes.rows[0]?.count || "0");
        totalResponses = parseInt(feedbackRes.rows[0]?.count || "0");
        avgRating = parseFloat(feedbackRes.rows[0]?.avg_rating || "0");
      }

      const data = {
        ...dataVars,
        institutionName,
        vision,
        mission,
        totalPrograms: programsCount,
        programs: programsList,
        pacMembers: pacCount,
        bosMembers: bosCount,
        stakeholdersCount,
        obeFrameworkCount: obeCount,
        curriculumCount: curriculumCount || 0,
        courseCount: courseCount || 0,
        coCount: coCount || 0,
        curriculumFeedbackCount: curriculumFeedbackCount || 0,
        reportCount: reportCount || 0,
        stepStatus,
        academicCouncilMembers: acCount,
        activeStudents,
        totalResponses,
        avgRating: parseFloat(avgRating.toFixed(1)),
        recentActivities: activities,
      };

      return NextResponse.json(data);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error?.message,
        stack: error?.stack,
      },
      { status: 500 },
    );
  }
}
