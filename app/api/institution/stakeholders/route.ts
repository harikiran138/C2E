import pool from "@/lib/postgres";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.id) return null;
  return String(payload.id);
}

const SELECT_FIELDS = `
  rs.id,
  rs.program_id,
  rs.member_name,
  rs.member_id,
  rs.organization,
  rs.email,
  rs.mobile_number,
  rs.specialisation,
  rs.category,
  rs.linkedin_id,
  rs.is_approved,
  rs.last_login_at,
  rs.created_at,
  rs.updated_at
`;

const RETURNING_FIELDS = `
  id,
  program_id,
  member_name,
  member_id,
  organization,
  email,
  mobile_number,
  specialisation,
  category,
  linkedin_id,
  is_approved,
  last_login_at,
  created_at,
  updated_at
`;

const RETURNING_FIELDS_WITH_ALIAS = `
  rs.id,
  rs.program_id,
  rs.member_name,
  rs.member_id,
  rs.organization,
  rs.email,
  rs.mobile_number,
  rs.specialisation,
  rs.category,
  rs.linkedin_id,
  rs.is_approved,
  rs.last_login_at,
  rs.created_at,
  rs.updated_at
`;

const DEFAULT_STAKEHOLDER_PASSWORD = "apassword";

function buildCode(value: string, fallback: string): string {
  const safe = String(value || "").trim();
  if (!safe) return fallback;

  const words = safe
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return fallback;
  if (words.length === 1) {
    const token = words[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return token.slice(0, 6) || fallback;
  }

  const acronym = words
    .map((word) => word[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 6);

  return acronym || fallback;
}

async function generateStakeholderId(
  client: any,
  programId: string,
  institutionName: string,
  programCode: string | null,
) {
  const instCode = buildCode(institutionName, "INST");
  const progCode = buildCode(programCode || "", "PROG");
  const prefix = `${instCode}-${progCode}`;

  const result = await client.query(
    `SELECT member_id
     FROM representative_stakeholders
     WHERE program_id = $1
       AND member_id LIKE $2`,
    [programId, `${prefix}-%`],
  );

  let maxCounter = 0;
  for (const row of result.rows) {
    const memberId = String(row.member_id || "");
    const match = memberId.match(/-(\d+)$/);
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isNaN(value) && value > maxCounter) {
      maxCounter = value;
    }
  }

  // Append a short random suffix to prevent session collisions during rapid stress tests
  const suffix = Math.floor(100 + Math.random() * 899);
  return `${prefix}-${String(maxCounter + 1).padStart(3, "0")}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const memberId = searchParams.get("id");

    const client = await pool.connect();
    try {
      let queryText = `
        SELECT ${SELECT_FIELDS}
        FROM representative_stakeholders rs
        INNER JOIN programs p ON p.id = rs.program_id
        WHERE p.institution_id = $1
      `;
      const params: any[] = [institutionId];

      if (programId) {
        params.push(programId);
        queryText += ` AND rs.program_id = $${params.length}`;
      }

      if (memberId) {
        params.push(memberId);
        queryText += ` AND rs.id = $${params.length}`;
      }

      queryText += " ORDER BY rs.created_at ASC";

      const result = await client.query(queryText, params);
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Stakeholders API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.program_id || !body.member_name || !body.email) {
      return NextResponse.json(
        { error: "program_id, member_name and email are required." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const programRes = await client.query(
        `SELECT p.id, p.program_code, i.institution_name
         FROM programs p
         INNER JOIN institutions i ON i.id = p.institution_id
         WHERE p.id = $1 AND p.institution_id = $2
         LIMIT 1`,
        [String(body.program_id), institutionId],
      );

      if (programRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Program not found or unauthorized." },
          { status: 404 },
        );
      }

      const program = programRes.rows[0];
      const generatedStakeholderId = await generateStakeholderId(
        client,
        String(body.program_id),
        String(program.institution_name),
        program.program_code ? String(program.program_code) : null,
      );

      const passwordHash = await bcrypt.hash(DEFAULT_STAKEHOLDER_PASSWORD, 10);

      const result = await client.query(
        `INSERT INTO representative_stakeholders (
            program_id,
            member_name,
            member_id,
            organization,
            email,
            mobile_number,
            specialisation,
            category,
            linkedin_id,
            is_approved,
            login_password_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10)
         RETURNING ${RETURNING_FIELDS}`,
        [
          String(body.program_id),
          String(body.member_name),
          generatedStakeholderId,
          body.organization ? String(body.organization) : null,
          String(body.email),
          body.mobile_number ? String(body.mobile_number) : null,
          body.specialisation ? String(body.specialisation) : null,
          body.category ? String(body.category) : null,
          body.linkedin_id ? String(body.linkedin_id) : null,
          passwordHash,
        ],
      );

      await client.query("COMMIT");

      return NextResponse.json({
        data: result.rows[0],
        defaults: {
          password: DEFAULT_STAKEHOLDER_PASSWORD,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Stakeholders API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Stakeholder ID is required for update" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const existingRes = await client.query(
        `SELECT rs.id, rs.member_id, rs.is_approved
         FROM representative_stakeholders rs
         INNER JOIN programs p ON p.id = rs.program_id
         WHERE rs.id = $1 AND p.institution_id = $2
         LIMIT 1`,
        [id, institutionId],
      );

      if (existingRes.rows.length === 0) {
        return NextResponse.json(
          { error: "Stakeholder not found or unauthorized" },
          { status: 404 },
        );
      }

      const existing = existingRes.rows[0];
      const nextApproved =
        typeof fields.is_approved === "boolean"
          ? fields.is_approved
          : Boolean(existing.is_approved);

      const result = await client.query(
        `UPDATE representative_stakeholders rs
         SET member_name = $1,
             organization = $2,
             email = $3,
             mobile_number = $4,
             specialisation = $5,
             category = $6,
             linkedin_id = $7,
             is_approved = $8,
             updated_at = CURRENT_TIMESTAMP
         FROM programs p
         WHERE rs.id = $9
           AND p.id = rs.program_id
           AND p.institution_id = $10
         RETURNING ${RETURNING_FIELDS_WITH_ALIAS}`,
        [
          fields.member_name ? String(fields.member_name) : null,
          fields.organization ? String(fields.organization) : null,
          fields.email ? String(fields.email) : null,
          fields.mobile_number ? String(fields.mobile_number) : null,
          fields.specialisation ? String(fields.specialisation) : null,
          fields.category ? String(fields.category) : null,
          fields.linkedin_id ? String(fields.linkedin_id) : null,
          nextApproved,
          id,
          institutionId,
        ],
      );

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: "Stakeholder not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Stakeholders API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM representative_stakeholders rs
         USING programs p
         WHERE rs.id = $1
           AND p.id = rs.program_id
           AND p.institution_id = $2
         RETURNING rs.id`,
        [id, institutionId],
      );

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: "Stakeholder not found or unauthorized" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Stakeholders API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
