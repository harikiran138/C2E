import { NextResponse } from "next/server";
import pool from "@/lib/postgres";

export async function GET() {
  try {
    const client = await pool.connect();

    try {
      // List tables
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const tables = tablesRes.rows.map((r) => r.table_name);

      // Check for relevant tables
      const tableList = [
        "academic_council",
        "obe_framework",
        "program_coordinators",
        "pac_members",
        "bos_members",
      ];
      const schemaInfo: any = {};

      for (const table of tableList) {
        if (tables.includes(table)) {
          const res = await client.query(
            `
                  SELECT column_name, data_type, is_nullable
                  FROM information_schema.columns
                  WHERE table_name = $1
              `,
            [table],
          );
          schemaInfo[table] = res.rows;
        }
      }

      return NextResponse.json(
        {
          tables,
          schemaInfo,
        },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
