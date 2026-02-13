import { NextResponse } from 'next/server';
import pool from '@/lib/postgres';

export async function GET() {
  try {
    const client = await pool.connect();
    
    // List tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    // Check institutions columns if it exists
    let columns = [];
    if (tablesRes.rows.some(r => r.table_name === 'institutions')) {
        const columnsRes = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'institutions'
        `);
        columns = columnsRes.rows;
    }

    client.release();
    
    return NextResponse.json({ 
      tables: tablesRes.rows.map(r => r.table_name),
      institutionsColumns: columns
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
