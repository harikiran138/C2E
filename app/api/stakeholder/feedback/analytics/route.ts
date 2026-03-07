import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

interface FeedbackAggregate {
  group: string;
  submissions: number;
  averageRating: number;
  peoRelevanceScore: number;
  curriculumRelevanceScore: number;
}

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function mapFeedbackGroup(raw: string): string {
  const normalized = normalizeText(raw).toLowerCase();
  if (!normalized) return "others";

  if (normalized.includes("student")) return "students";
  if (normalized.includes("faculty") || normalized.includes("academia")) return "faculty";
  if (normalized.includes("alumni")) return "alumni";
  if (normalized.includes("industry") || normalized.includes("employer")) return "industry";

  return "others";
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = normalizeText(searchParams.get("programId"));

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const vmpeoPromise = client
        .query<{
          stakeholder_category: string | null;
          avg_rating: string;
          responses: string;
        }>(
          `SELECT
             s.stakeholder_category,
             COALESCE(AVG(e.rating)::numeric, 0)::text AS avg_rating,
             COUNT(*)::text AS responses
           FROM program_vmpeo_feedback_entries e
           INNER JOIN program_vmpeo_feedback_submissions s ON s.id = e.submission_id
           WHERE s.program_id = $1
           GROUP BY s.stakeholder_category`,
          [programId],
        )
        .catch((error: any) => {
          if (String(error?.code) === "42P01") {
            return { rows: [] as Array<{ stakeholder_category: string | null; avg_rating: string; responses: string }> };
          }
          throw error;
        });

      const stakeholderFeedbackPromise = client
        .query<{
          stakeholder_category: string | null;
          avg_rating: string;
          responses: string;
          avg_peo_relevance: string;
          avg_curriculum_relevance: string;
        }>(
          `SELECT
             s.category AS stakeholder_category,
             COALESCE(AVG(sf.vision_alignment_rating)::numeric, 0)::text AS avg_rating,
             COUNT(*)::text AS responses,
             COALESCE(AVG(sf.peo_relevance_score)::numeric, 0)::text AS avg_peo_relevance,
             COALESCE(AVG(sf.curriculum_relevance_score)::numeric, 0)::text AS avg_curriculum_relevance
           FROM stakeholder_feedback sf
           LEFT JOIN stakeholders s ON s.id = sf.stakeholder_id
           WHERE sf.program_id = $1
           GROUP BY s.category`,
          [programId],
        )
        .catch((error: any) => {
          if (String(error?.code) === "42P01") {
            return {
              rows: [] as Array<{
                stakeholder_category: string | null;
                avg_rating: string;
                responses: string;
                avg_peo_relevance: string;
                avg_curriculum_relevance: string;
              }>,
            };
          }
          throw error;
        });

      const improvementPromise = client
        .query<{ improvement_suggestions: string | null }>(
          `SELECT improvement_suggestions
           FROM stakeholder_feedback
           WHERE program_id = $1
             AND improvement_suggestions IS NOT NULL
             AND trim(improvement_suggestions) <> ''
           ORDER BY submitted_at DESC
           LIMIT 20`,
          [programId],
        )
        .catch((error: any) => {
          if (String(error?.code) === "42P01") {
            return { rows: [] as Array<{ improvement_suggestions: string | null }> };
          }
          throw error;
        });

      const [vmpeoResult, stakeholderResult, improvementResult] = await Promise.all([
        vmpeoPromise,
        stakeholderFeedbackPromise,
        improvementPromise,
      ]);

      const accumulator = new Map<
        string,
        {
          submissions: number;
          weightedRating: number;
          weightedPeoRelevance: number;
          weightedCurriculumRelevance: number;
        }
      >();

      for (const row of vmpeoResult.rows) {
        const group = mapFeedbackGroup(row.stakeholder_category || "");
        const submissions = Number(row.responses || 0);
        const averageRating = Number(row.avg_rating || 0);
        const existing = accumulator.get(group) || {
          submissions: 0,
          weightedRating: 0,
          weightedPeoRelevance: 0,
          weightedCurriculumRelevance: 0,
        };

        existing.submissions += submissions;
        existing.weightedRating += averageRating * submissions;
        accumulator.set(group, existing);
      }

      for (const row of stakeholderResult.rows) {
        const group = mapFeedbackGroup(row.stakeholder_category || "");
        const submissions = Number(row.responses || 0);
        const averageRating = Number(row.avg_rating || 0);
        const peoRelevance = Number(row.avg_peo_relevance || 0);
        const curriculumRelevance = Number(row.avg_curriculum_relevance || 0);

        const existing = accumulator.get(group) || {
          submissions: 0,
          weightedRating: 0,
          weightedPeoRelevance: 0,
          weightedCurriculumRelevance: 0,
        };

        existing.submissions += submissions;
        existing.weightedRating += averageRating * submissions;
        existing.weightedPeoRelevance += peoRelevance * submissions;
        existing.weightedCurriculumRelevance += curriculumRelevance * submissions;
        accumulator.set(group, existing);
      }

      const groups: FeedbackAggregate[] = Array.from(accumulator.entries())
        .map(([group, values]) => {
          const denom = Math.max(values.submissions, 1);
          return {
            group,
            submissions: values.submissions,
            averageRating: round2(values.weightedRating / denom),
            peoRelevanceScore: round2(values.weightedPeoRelevance / denom),
            curriculumRelevanceScore: round2(values.weightedCurriculumRelevance / denom),
          };
        })
        .sort((left, right) => right.submissions - left.submissions);

      const totalSubmissions = groups.reduce((sum, group) => sum + group.submissions, 0);
      const weightedAverageRating =
        totalSubmissions > 0
          ? round2(
              groups.reduce((sum, group) => sum + group.averageRating * group.submissions, 0) /
                totalSubmissions,
            )
          : 0;

      const improvements = improvementResult.rows
        .map((row) => normalizeText(row.improvement_suggestions))
        .filter(Boolean);

      return NextResponse.json({
        programId,
        summary: {
          totalSubmissions,
          weightedAverageRating,
        },
        groups,
        improvementSuggestions: improvements,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Stakeholder feedback analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load stakeholder feedback analytics." },
      { status: 500 },
    );
  }
}
