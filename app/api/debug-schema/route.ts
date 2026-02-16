import { NextResponse } from 'next/server';
import pool from '@/lib/postgres';

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

      const tables = tablesRes.rows.map(r => r.table_name);
      
      // Check for pac_members and bos_members tables
      let pacColumns = [];
      let bosColumns = [];
      
      if (tables.includes('pac_members')) {
          const res = await client.query(`
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = 'pac_members'
          `);
          pacColumns = res.rows;
      }

      if (tables.includes('bos_members')) {
          const res = await client.query(`
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = 'bos_members'
          `);
          bosColumns = res.rows;
      }

      return NextResponse.json({ 
        tables,
        pacMembersColumns: pacColumns,
        bosMembersColumns: bosColumns
      }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
