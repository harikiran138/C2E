import { NextResponse } from 'next/server';
import pool from '@/lib/postgres';

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    return NextResponse.json({ 
      message: 'Connected to Supabase Postgres successfully', 
      timestamp: result.rows[0].now 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Postgres connection error:', error);
    return NextResponse.json(
      { message: 'Failed to connect to Supabase Postgres', error: error.message },
      { status: 500 }
    );
  }
}
