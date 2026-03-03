import pool from "@/lib/postgres";

export type FeedbackCategory = "vision" | "mission" | "peo";

export interface VmpeoReportFilters {
  programId: string;
  category?: string | null;
  stakeholder?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface VmpeoReportRow {
  submissionId: string;
  instituteName: string;
  stakeholderId: string;
  stakeholderName: string;
  stakeholderCategory: string | null;
  category: FeedbackCategory;
  categoryLabel: string;
  rating: number;
  comment: string | null;
  date: string;
  feedbackCycle: "brainstorming" | "finalization";
  peoNumber: number | null;
  peoStatement: string | null;
}

export interface VmpeoCommentGroup {
  peoNumber: number;
  peoStatement: string;
  averageRating: number;
  totalResponses: number;
  comments: Array<{
    stakeholderId: string;
    stakeholderName: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

export interface VmpeoSummary {
  totalEntries: number;
  totalSubmissions: number;
  averageVision: number | null;
  averageMission: number | null;
  visionApprovalPercentage: number;
  averagePeoScores: Array<{
    peoNumber: number;
    peoStatement: string;
    averageRating: number;
    totalResponses: number;
  }>;
}

export interface VmpeoReportResult {
  program: {
    id: string;
    name: string;
    timelineStartAt: string | null;
    timelineEndAt: string | null;
    feedbackCycle: "brainstorming" | "finalization";
  };
  filters: {
    category: FeedbackCategory | null;
    stakeholder: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
  rows: VmpeoReportRow[];
  summary: VmpeoSummary;
  commentsByPeo: VmpeoCommentGroup[];
  availableStakeholders: Array<{
    stakeholderId: string;
    stakeholderName: string;
  }>;
}

function normalizeFeedbackCategory(
  raw?: string | null,
): FeedbackCategory | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "vision" || value === "mission" || value === "peo") {
    return value;
  }
  return null;
}

function normalizeDateBoundary(
  raw?: string | null,
  endOfDay = false,
): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function categoryLabel(
  category: FeedbackCategory,
  peoNumber: number | null,
): string {
  if (category === "peo") {
    const number = peoNumber || 0;
    return `PEO-${String(number).padStart(2, "0")}`;
  }
  return category === "vision" ? "Vision" : "Mission";
}

export async function fetchVmpeoFeedbackReport(
  input: VmpeoReportFilters,
): Promise<VmpeoReportResult> {
  const category = normalizeFeedbackCategory(input.category);
  const stakeholder = input.stakeholder?.trim()
    ? input.stakeholder.trim()
    : null;
  const fromDate = normalizeDateBoundary(input.fromDate, false);
  const toDate = normalizeDateBoundary(input.toDate, true);

  const client = await pool.connect();
  try {
    const programRes = await client.query(
      `SELECT id, program_name, vmpeo_feedback_start_at, vmpeo_feedback_end_at, vmpeo_feedback_cycle
       FROM programs
       WHERE id = $1
       LIMIT 1`,
      [input.programId],
    );

    if (programRes.rows.length === 0) {
      throw new Error("Program not found");
    }

    const program = programRes.rows[0];
    const params: Array<string> = [input.programId];
    const conditions: string[] = ["s.program_id = $1"];

    if (category) {
      params.push(category);
      conditions.push(`e.category = $${params.length}`);
    }

    if (stakeholder) {
      params.push(`%${stakeholder}%`);
      conditions.push(
        `LOWER(s.stakeholder_member_id) LIKE LOWER($${params.length})`,
      );
    }

    if (fromDate) {
      params.push(fromDate);
      conditions.push(`s.submitted_at >= $${params.length}`);
    }

    if (toDate) {
      params.push(toDate);
      conditions.push(`s.submitted_at <= $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const rowsRes = await client.query(
      `SELECT
          s.id AS submission_id,
          s.institution_name,
          s.stakeholder_member_id,
          s.stakeholder_name,
          s.stakeholder_category,
          s.feedback_cycle,
          s.submitted_at,
          e.category,
          e.peo_number,
          e.peo_statement,
          e.rating,
          e.comment
       FROM program_vmpeo_feedback_entries e
       INNER JOIN program_vmpeo_feedback_submissions s ON s.id = e.submission_id
       WHERE ${whereClause}
       ORDER BY s.submitted_at DESC, e.category ASC, e.peo_number ASC NULLS LAST`,
      params,
    );

    const rows: VmpeoReportRow[] = rowsRes.rows.map((row) => ({
      submissionId: String(row.submission_id),
      instituteName: String(row.institution_name),
      stakeholderId: String(row.stakeholder_member_id),
      stakeholderName: String(row.stakeholder_name),
      stakeholderCategory: row.stakeholder_category
        ? String(row.stakeholder_category)
        : null,
      category: row.category as FeedbackCategory,
      categoryLabel: categoryLabel(
        row.category as FeedbackCategory,
        row.peo_number ?? null,
      ),
      rating: Number(row.rating),
      comment: row.comment ? String(row.comment) : null,
      date: new Date(row.submitted_at).toISOString(),
      feedbackCycle: row.feedback_cycle as "brainstorming" | "finalization",
      peoNumber: row.peo_number != null ? Number(row.peo_number) : null,
      peoStatement: row.peo_statement ? String(row.peo_statement) : null,
    }));

    const submissionIds = new Set<string>();
    const stakeholderMap = new Map<string, string>();

    let visionTotal = 0;
    let visionCount = 0;
    let missionTotal = 0;
    let missionCount = 0;
    let visionApproved = 0;

    const peoMap = new Map<
      number,
      {
        statement: string;
        total: number;
        count: number;
        comments: VmpeoCommentGroup["comments"];
      }
    >();

    rows.forEach((row) => {
      submissionIds.add(row.submissionId);
      if (!stakeholderMap.has(row.stakeholderId)) {
        stakeholderMap.set(row.stakeholderId, row.stakeholderName);
      }

      if (row.category === "vision") {
        visionTotal += row.rating;
        visionCount += 1;
        if (row.rating >= 4) visionApproved += 1;
      }

      if (row.category === "mission") {
        missionTotal += row.rating;
        missionCount += 1;
      }

      if (row.category === "peo" && row.peoNumber != null) {
        const existing = peoMap.get(row.peoNumber) || {
          statement:
            row.peoStatement || `PEO-${String(row.peoNumber).padStart(2, "0")}`,
          total: 0,
          count: 0,
          comments: [],
        };

        existing.total += row.rating;
        existing.count += 1;

        if (row.comment && row.comment.trim()) {
          existing.comments.push({
            stakeholderId: row.stakeholderId,
            stakeholderName: row.stakeholderName,
            rating: row.rating,
            comment: row.comment.trim(),
            date: row.date,
          });
        }

        peoMap.set(row.peoNumber, existing);
      }
    });

    const averagePeoScores = Array.from(peoMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([peoNumber, group]) => ({
        peoNumber,
        peoStatement: group.statement,
        averageRating:
          group.count > 0 ? roundToTwo(group.total / group.count) : 0,
        totalResponses: group.count,
      }));

    const commentsByPeo = Array.from(peoMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([peoNumber, group]) => ({
        peoNumber,
        peoStatement: group.statement,
        averageRating:
          group.count > 0 ? roundToTwo(group.total / group.count) : 0,
        totalResponses: group.count,
        comments: group.comments.sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .filter((entry) => entry.comments.length > 0);

    const summary: VmpeoSummary = {
      totalEntries: rows.length,
      totalSubmissions: submissionIds.size,
      averageVision:
        visionCount > 0 ? roundToTwo(visionTotal / visionCount) : null,
      averageMission:
        missionCount > 0 ? roundToTwo(missionTotal / missionCount) : null,
      visionApprovalPercentage:
        visionCount > 0 ? roundToTwo((visionApproved / visionCount) * 100) : 0,
      averagePeoScores,
    };

    return {
      program: {
        id: String(program.id),
        name: String(program.program_name),
        timelineStartAt: program.vmpeo_feedback_start_at
          ? new Date(program.vmpeo_feedback_start_at).toISOString()
          : null,
        timelineEndAt: program.vmpeo_feedback_end_at
          ? new Date(program.vmpeo_feedback_end_at).toISOString()
          : null,
        feedbackCycle: (program.vmpeo_feedback_cycle || "brainstorming") as
          | "brainstorming"
          | "finalization",
      },
      filters: {
        category,
        stakeholder,
        fromDate,
        toDate,
      },
      rows,
      summary,
      commentsByPeo,
      availableStakeholders: Array.from(stakeholderMap.entries()).map(
        ([stakeholderId, stakeholderName]) => ({
          stakeholderId,
          stakeholderName,
        }),
      ),
    };
  } finally {
    client.release();
  }
}

export function buildVmpeoReportCsv(report: VmpeoReportResult): string {
  const lines: string[] = [];

  lines.push(
    "Institute Name,Stakeholder ID,Stakeholder Name,Category,Rating,Comment,Date,Feedback Cycle",
  );
  report.rows.forEach((row) => {
    const escaped = [
      row.instituteName,
      row.stakeholderId,
      row.stakeholderName,
      row.categoryLabel,
      String(row.rating),
      row.comment || "",
      new Date(row.date).toISOString(),
      row.feedbackCycle,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    lines.push(escaped.join(","));
  });

  lines.push("");
  lines.push(
    `"Average Vision Rating","${report.summary.averageVision ?? "NA"}"`,
  );
  lines.push(
    `"Average Mission Rating","${report.summary.averageMission ?? "NA"}"`,
  );
  lines.push(
    `"Vision Approval Percentage","${report.summary.visionApprovalPercentage}%"`,
  );

  if (report.summary.averagePeoScores.length > 0) {
    lines.push("");
    lines.push("PEO Number,PEO Statement,Average Rating,Total Responses");
    report.summary.averagePeoScores.forEach((peo) => {
      const escaped = [
        `PEO-${String(peo.peoNumber).padStart(2, "0")}`,
        peo.peoStatement,
        String(peo.averageRating),
        String(peo.totalResponses),
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
      lines.push(escaped.join(","));
    });
  }

  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildVmpeoPrintableHtml(report: VmpeoReportResult): string {
  const rowsHtml = report.rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.instituteName)}</td>
        <td>${escapeHtml(row.stakeholderId)}</td>
        <td>${escapeHtml(row.categoryLabel)}</td>
        <td style="text-align:center;">${row.rating}</td>
        <td>${escapeHtml(row.comment || "-")}</td>
        <td>${escapeHtml(new Date(row.date).toLocaleString())}</td>
      </tr>
    `,
    )
    .join("");

  const peoSummaryHtml = report.summary.averagePeoScores
    .map(
      (peo) =>
        `<tr><td>PEO-${String(peo.peoNumber).padStart(2, "0")}</td><td>${escapeHtml(peo.peoStatement)}</td><td>${peo.averageRating}</td><td>${peo.totalResponses}</td></tr>`,
    )
    .join("");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>VMPEO Feedback Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; color: #111827; }
      h1, h2, h3 { margin: 0 0 8px; }
      p { margin: 0 0 8px; }
      .meta { margin-bottom: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; vertical-align: top; }
      th { background: #f3f4f6; text-align: left; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
      .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #fff; }
      @media print {
        body { margin: 10mm; }
      }
    </style>
  </head>
  <body>
    <h1>Vision, Mission and PEO Feedback Report</h1>
    <p><strong>Program:</strong> ${escapeHtml(report.program.name)}</p>
    <div class="meta">
      <p><strong>Timeline:</strong> ${escapeHtml(report.program.timelineStartAt || "Not Set")} to ${escapeHtml(report.program.timelineEndAt || "Not Set")}</p>
      <p><strong>Feedback Cycle:</strong> ${escapeHtml(report.program.feedbackCycle)}</p>
      <p><strong>Total Submissions:</strong> ${report.summary.totalSubmissions}</p>
      <p><strong>Total Entries:</strong> ${report.summary.totalEntries}</p>
      <p><strong>Average Vision Rating:</strong> ${report.summary.averageVision ?? "NA"}</p>
      <p><strong>Average Mission Rating:</strong> ${report.summary.averageMission ?? "NA"}</p>
      <p><strong>Vision Approval Percentage:</strong> ${report.summary.visionApprovalPercentage}%</p>
    </div>

    <h2>Feedback Entries</h2>
    <table>
      <thead>
        <tr>
          <th>Institute Name</th>
          <th>Stakeholder ID</th>
          <th>Category</th>
          <th>Rating</th>
          <th>Comment</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="6" style="text-align:center;">No feedback found for selected filters.</td></tr>'}
      </tbody>
    </table>

    <h2 style="margin-top: 20px;">Average Score Per PEO</h2>
    <table>
      <thead>
        <tr>
          <th>PEO</th>
          <th>Statement</th>
          <th>Average Rating</th>
          <th>Total Responses</th>
        </tr>
      </thead>
      <tbody>
        ${peoSummaryHtml || '<tr><td colspan="4" style="text-align:center;">No PEO feedback available.</td></tr>'}
      </tbody>
    </table>

    <script>
      window.addEventListener('load', () => window.print());
    </script>
  </body>
</html>
  `;
}
