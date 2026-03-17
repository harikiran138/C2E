import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";

async function getInstitutionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.id as string) || null;
}

/**
 * GET  /api/institution/obe-framework
 * POST /api/institution/obe-framework   (body has optional `id` for update)
 * DELETE /api/institution/obe-framework?id=<uuid>
 */
export async function GET() {
  try {
    const institutionId = await getInstitutionId();
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Join programs to get program_name
      const result = await client.query(
        `SELECT f.*, p.program_name
         FROM obe_framework f
         LEFT JOIN programs p ON p.id = f.program_id
         WHERE f.institution_id = $1
         ORDER BY f.created_at ASC`,
        [institutionId],
      );
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("OBE Framework Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId();
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const client = await pool.connect();

    try {
      let result;

      const fields = {
        member_name: body.member_name || "N/A",
        designation: body.designation || "N/A",
        program_id: body.program_id || null,
        email_official: body.email_official || null,
        email_personal: body.email_personal || null,
        mobile_official: body.mobile_official || null,
        mobile_personal: body.mobile_personal || null,
        linkedin_id: body.linkedin_id || null,
        pdf_url: body.pdf_url || null,
        pdf_name: body.pdf_name || null,
        title: body.title || null,
        description: body.description || null,
      };

      if (body.id) {
        result = await client.query(
          `UPDATE obe_framework SET
             member_name = $1, designation = $2, program_id = $3,
             email_official = $4, email_personal = $5,
             mobile_official = $6, mobile_personal = $7,
             linkedin_id = $8, pdf_url = $9, pdf_name = $10,
             title = $11, description = $12, updated_at = NOW()
           WHERE id = $13 AND institution_id = $14
           RETURNING *`,
          [
            fields.member_name, fields.designation, fields.program_id,
            fields.email_official, fields.email_personal,
            fields.mobile_official, fields.mobile_personal,
            fields.linkedin_id, fields.pdf_url, fields.pdf_name,
            fields.title, fields.description,
            body.id, institutionId,
          ],
        );
        if (result.rowCount === 0) {
          return NextResponse.json({ error: "Framework item not found" }, { status: 404 });
        }
      } else {
        result = await client.query(
          `INSERT INTO obe_framework
             (institution_id, member_name, designation, program_id,
              email_official, email_personal, mobile_official, mobile_personal,
              linkedin_id, pdf_url, pdf_name, title, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING *`,
          [
            institutionId, fields.member_name, fields.designation, fields.program_id,
            fields.email_official, fields.email_personal,
            fields.mobile_official, fields.mobile_personal,
            fields.linkedin_id, fields.pdf_url, fields.pdf_name,
            fields.title, fields.description,
          ],
        );
      }

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("OBE Framework API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId();
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
      await client.query(
        "DELETE FROM obe_framework WHERE id = $1 AND institution_id = $2",
        [id, institutionId],
      );
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("OBE Framework DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
