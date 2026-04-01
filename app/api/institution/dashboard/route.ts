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

    const tokenPayload = await verifyToken(token);
    if (!tokenPayload || !tokenPayload.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const institutionId = tokenPayload.id as string;

    const client = await pool.connect();
    try {
      const safeCountQuery = async (sql: string, params: unknown[]) => {
        try {
          const res = await client.query(sql, params);
          return parseInt(res.rows[0]?.count || "0");
        } catch (error: any) {
          if (error?.code === "42P01") return 0;
          console.error(`Query failed: ${sql}`, error);
          return 0;
        }
      };

      // Run independent queries in parallel
      const [nameRes, progCount, obeCount, acCount, allProgsRes] = await Promise.all([
        client.query(
          `SELECT i.institution_name, id.vision, id.mission 
           FROM institutions i
           LEFT JOIN institution_details id ON i.id = id.institution_id
           WHERE i.id = $1`,
          [institutionId],
        ),
        safeCountQuery("SELECT COUNT(*) as count FROM programs WHERE institution_id = $1", [institutionId]),
        safeCountQuery("SELECT COUNT(*) as count FROM obe_frameworks WHERE institution_id = $1", [institutionId]),
        safeCountQuery("SELECT COUNT(*) as count FROM members WHERE institution_id = $1", [institutionId]),
        client.query(
          "SELECT id, program_name, degree, level, program_code, academic_year, created_at FROM programs WHERE institution_id = $1 ORDER BY created_at DESC",
          [institutionId],
        ),
      ]);

      const institutionName = nameRes.rows[0]?.institution_name || "Institution";
      const vision = nameRes.rows[0]?.vision;
      const mission = nameRes.rows[0]?.mission;
      const programsList = allProgsRes.rows || [];

      let stepStatus: Record<string, any> = {};
      stepStatus["process-1"] = obeCount > 0;
      stepStatus["council"] = acCount > 0;

      let programData: any = {};
      let curriculumCount = 0;
      let courseCount = 0;
      let coCount = 0;
      let curriculumFeedbackCount = 0;
      let reportCount = 0;
      let consistencyMatrixCount = 0;
      let disseminationCount = 0;
      let curriculumDataCount = 0;
      
      let pacCount = 0;
      let bosCount = 0;
      let stakeholdersCount = 0;
      let peoCount = 0;
      let poCount = 0;
      let psoCount = 0;
      let vmpeoFeedbackSubmissions = 0;
      let vmpeoFeedbackEntries = 0;

      if (programId) {
        const progAuthCheck = await client.query(
          "SELECT 1 FROM programs WHERE id = $1 AND institution_id = $2",
          [programId, institutionId]
        );

        if (progAuthCheck.rows.length === 0) {
          return NextResponse.json({ error: "Unauthorized access to this Program data." }, { status: 403 });
        }

        const [
          pac, bos, stake, peo, po, pso, matrix, disseminate, dataCount, feedback, reports
        ] = await Promise.all([
          safeCountQuery("SELECT COUNT(*) as count FROM pac_members WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM bos_members WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM stakeholders WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM program_peos WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM program_outcomes WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM program_psos WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM consistency_matrix WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM program_dissemination WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM curriculum_generated_courses WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM curriculum_feedback WHERE program_id = $1", [programId]),
          safeCountQuery("SELECT COUNT(*) as count FROM audit_logs WHERE metadata->>'programId' = $1 AND action = 'REPORT_GENERATED'", [programId]),
        ]);

        pacCount = pac;
        bosCount = bos;
        stakeholdersCount = stake;
        peoCount = peo;
        poCount = po;
        psoCount = pso;
        consistencyMatrixCount = matrix;
        disseminationCount = disseminate;
        curriculumDataCount = dataCount;
        curriculumFeedbackCount = feedback;
        reportCount = reports;

        stepStatus["process-3"] = pacCount > 0;
        stepStatus["process-4"] = bosCount > 0;
        stepStatus["process-5"] = stakeholdersCount > 0;
        stepStatus["process-8"] = consistencyMatrixCount > 0;
        stepStatus["process-9"] = poCount > 0;
        stepStatus["process-10"] = psoCount > 0;
        stepStatus["process-11"] = disseminationCount > 0;
        stepStatus["process-15"] = curriculumDataCount > 0;
        stepStatus["process-16"] = curriculumFeedbackCount > 0;
        stepStatus["process-18"] = reportCount > 0;

        programData = { peoCount, poCount, psoCount };
      }

      // Recent Activities
      let recentQuery = "SELECT id, program_name, created_at FROM programs WHERE institution_id = $1";
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

      // Student and Feedback stats
      let activeStudents = 0;
      let totalResponses = 0;
      let avgRating = 0;

      if (programId) {
        activeStudents = await safeCountQuery("SELECT COUNT(*) as count FROM stakeholders WHERE program_id = $1 AND category = 'Students'", [programId]);
        const feedback = await client.query("SELECT COUNT(*) as count, AVG(vision_alignment_rating) as avg_rating FROM stakeholder_feedback WHERE program_id = $1", [programId]).catch(() => ({ rows: [{ count: 0, avg_rating: 0 }] }));
        totalResponses = parseInt(feedback.rows[0]?.count || "0");
        avgRating = parseFloat(feedback.rows[0]?.avg_rating || "0");
      } else {
        activeStudents = await safeCountQuery("SELECT COUNT(*) as count FROM stakeholders s JOIN programs p ON s.program_id = p.id WHERE p.institution_id = $1 AND s.category = 'Students'", [institutionId]);
        const feedback = await client.query("SELECT COUNT(*) as count, AVG(vision_alignment_rating) as avg_rating FROM stakeholder_feedback WHERE program_id IN (SELECT id FROM programs WHERE institution_id = $1)", [institutionId]).catch(() => ({ rows: [{ count: 0, avg_rating: 0 }] }));
        totalResponses = parseInt(feedback.rows[0]?.count || "0");
        avgRating = parseFloat(feedback.rows[0]?.avg_rating || "0");
      }

      return NextResponse.json({
        ...programData,
        institutionName,
        vision,
        mission,
        totalPrograms: progCount,
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
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error?.message 
    }, { status: 500 });
  }
}
