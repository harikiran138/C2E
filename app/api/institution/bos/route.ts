import pool from "@/lib/postgres";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const memberId = searchParams.get("id");

    const client = await pool.connect();
    try {
      let queryText = "SELECT * FROM bos_members";
      const params: any[] = [];

      if (programId) {
        queryText += " WHERE program_id = $1";
        params.push(programId);
      } else if (memberId) {
        queryText += " WHERE id = $1";
        params.push(memberId);
      }

      queryText += " ORDER BY created_at ASC";

      const result = await client.query(queryText, params);
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("BoS API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO bos_members (
            program_id,
            member_name,
            member_id,
            organization,
            email,
            mobile_number,
            specialisation,
            category,
            tenure_start_date,
            tenure_end_date,
            linkedin_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          body.program_id,
          body.member_name,
          body.member_id,
          body.organization,
          body.email,
          body.mobile_number,
          body.specialisation,
          body.category,
          body.tenure_start_date || null,
          body.tenure_end_date || null,
          body.linkedin_id,
        ],
      );

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("BoS API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Member ID is required for update" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE bos_members SET
              member_name = $1,
              member_id = $2,
              organization = $3,
              email = $4,
              mobile_number = $5,
              specialisation = $6,
              category = $7,
              tenure_start_date = $8,
              tenure_end_date = $9,
              linkedin_id = $10,
              updated_at = CURRENT_TIMESTAMP
           WHERE id = $11 RETURNING *`,
        [
          fields.member_name,
          fields.member_id,
          fields.organization,
          fields.email,
          fields.mobile_number,
          fields.specialisation,
          fields.category,
          fields.tenure_start_date || null,
          fields.tenure_end_date || null,
          fields.linkedin_id,
          id,
        ],
      );

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("BoS API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("DELETE FROM bos_members WHERE id = $1", [id]);
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("BoS API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
