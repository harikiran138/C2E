import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type ReportType = "NBA" | "NAAC" | "ABET";

interface AccreditationReportRequest {
  programId: string;
  reportType: ReportType;
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

interface AccreditationReport {
  reportType: ReportType;
  programId: string;
  generatedAt: string;
  curriculumMatrix: {
    headers: string[];
    rows: CurriculumMatrixRow[];
  };
  coPOMatrix: {
    headers: string[];
    rows: COPOMatrixRow[];
  };
  categoryDistribution: CategoryDistributionEntry[];
  courseList: CourseListEntry[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AccreditationReportRequest;
    const programId = String(body.programId || "").trim();
    const reportType = body.reportType as ReportType;

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const VALID_REPORT_TYPES: ReportType[] = ["NBA", "NAAC", "ABET"];
    if (!VALID_REPORT_TYPES.includes(reportType)) {
      return NextResponse.json(
        { error: `reportType must be one of: ${VALID_REPORT_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Fetch all data in parallel
    const [coursesResult, outcomesResult, categoryCreditsResult] = await Promise.all([
      supabase
        .from("curriculum_generated_courses")
        .select("*")
        .eq("program_id", programId)
        .order("semester", { ascending: true })
        .order("course_code", { ascending: true }),
      supabase
        .from("curriculum_course_outcomes")
        .select("*")
        .eq("program_id", programId)
        .order("course_code", { ascending: true })
        .order("co_number", { ascending: true }),
      supabase
        .from("curriculum_category_credits")
        .select("*")
        .eq("program_id", programId),
    ]);

    if (coursesResult.error) throw coursesResult.error;
    if (outcomesResult.error) throw outcomesResult.error;
    if (categoryCreditsResult.error) throw categoryCreditsResult.error;

    const courses = coursesResult.data ?? [];
    const outcomes = outcomesResult.data ?? [];
    const categoryCreditsRows = categoryCreditsResult.data ?? [];

    // Build unique list of category codes for curriculum matrix headers
    const categoryCodes = Array.from(
      new Set(courses.map((c: any) => String(c.category_code || c.category || "")).filter(Boolean)),
    ).sort();

    // Curriculum Matrix
    const curriculumMatrixRows: CurriculumMatrixRow[] = courses.map((c: any) => ({
      courseCode: String(c.course_code || ""),
      courseTitle: String(c.course_title || ""),
      semester: Number(c.semester) || 0,
      category: String(c.category_code || c.category || ""),
      credits: Number(c.credits) || 0,
    }));

    // CO-PO Matrix
    const po_headers = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`);
    const pso_headers = Array.from({ length: 3 }, (_, i) => `PSO${i + 1}`);
    const coPOHeaders = ["Course", "CO", "Statement", ...po_headers, ...pso_headers];

    const coPORows: COPOMatrixRow[] = outcomes.map((o: any) => ({
      courseCode: String(o.course_code || ""),
      coCode: String(o.co_code || ""),
      statement: String(o.statement || ""),
      poMapping: Array.isArray(o.po_mapping) ? o.po_mapping.map(Number) : [],
      psoMapping: Array.isArray(o.pso_mapping) ? o.pso_mapping.map(Number) : [],
    }));

    // Category Distribution
    const totalCreditsAll = courses.reduce((sum: number, c: any) => sum + (Number(c.credits) || 0), 0);

    let categoryDistribution: CategoryDistributionEntry[];

    if (categoryCreditsRows.length > 0) {
      // Use the stored category credits if available
      categoryDistribution = categoryCreditsRows.map((row: any) => {
        const category = String(row.category_code || row.category || "");
        const credits = Number(row.total_credits ?? row.credits) || 0;
        const percentage = totalCreditsAll > 0 ? Math.round((credits / totalCreditsAll) * 10000) / 100 : 0;
        return { category, credits, percentage };
      });
    } else {
      // Compute from generated courses
      const creditsByCategory = new Map<string, number>();
      for (const course of courses) {
        const cat = String(course.category_code || course.category || "");
        if (!cat) continue;
        creditsByCategory.set(cat, (creditsByCategory.get(cat) ?? 0) + (Number(course.credits) || 0));
      }
      categoryDistribution = Array.from(creditsByCategory.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, credits]) => ({
          category,
          credits,
          percentage:
            totalCreditsAll > 0 ? Math.round((credits / totalCreditsAll) * 10000) / 100 : 0,
        }));
    }

    // Course List
    const courseList: CourseListEntry[] = courses.map((c: any) => ({
      semester: Number(c.semester) || 0,
      courseCode: String(c.course_code || ""),
      courseTitle: String(c.course_title || ""),
      credits: Number(c.credits) || 0,
      category: String(c.category_code || c.category || ""),
    }));

    const report: AccreditationReport = {
      reportType,
      programId,
      generatedAt: new Date().toISOString(),
      curriculumMatrix: {
        headers: categoryCodes,
        rows: curriculumMatrixRows,
      },
      coPOMatrix: {
        headers: coPOHeaders,
        rows: coPORows,
      },
      categoryDistribution,
      courseList,
    };

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Accreditation report error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate accreditation report" },
      { status: 500 },
    );
  }
}
