import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';

export async function GET() {
  try {
    const conn = await connectToDatabase();
    return NextResponse.json({ 
      status: 'connected', 
      readyState: conn.readyState,
      dbName: conn.name 
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
}
