import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function checkPostgres() {
  console.log('\n--- 1. Testing Postgres Connection ---');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is missing in .env.local');
    return;
  }

  const isSupabase = dbUrl.includes('pooler.supabase.com') || dbUrl.includes('supabase.co');
  console.log(`Using Database URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Connecting to Supabase Pooler: ${isSupabase ? 'Yes' : 'No'}`);

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000
  });

  try {
    const start = Date.now();
    const client = await pool.connect();
    const duration = Date.now() - start;
    console.log(`✅ Postgres Connected in ${duration}ms`);
    
    const res = await client.query('SELECT version()');
    console.log(`📡 DB Version: ${res.rows[0].version}`);
    
    const tables = await client.query("SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
    console.log(`📊 Tables in public schema: ${tables.rows[0].count}`);
    
    client.release();
  } catch (err: any) {
    console.error('❌ Postgres Connection Failed:');
    console.error(`   Error Message: ${err.message}`);
    if (err.message.includes('SSL')) {
      console.error('   💡 Suggestion: This looks like an SSL issue. Check if SSL is required.');
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'EADDRNOTAVAIL') {
      console.error('   💡 Suggestion: Network timeout or port exhaustion. Check your firewall or ISP (IPv6 issues?).');
    }
  } finally {
    await pool.end();
  }
}

async function checkSupabaseAuth() {
  console.log('\n--- 2. Testing Supabase Auth API ---');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Supabase URL or Anon Key is missing in .env.local');
    return;
  }

  console.log(`URL: ${url}`);
  const supabase = createClient(url, key);

  try {
    const start = Date.now();
    const { data, error } = await supabase.auth.getSession();
    const duration = Date.now() - start;
    
    if (error) {
      console.error(`❌ Supabase Auth API Error: ${error.message}`);
    } else {
      console.log(`✅ Supabase Auth API Connected in ${duration}ms (Session: ${data.session ? 'Found' : 'None'})`);
    }
  } catch (err: any) {
    console.error(`❌ Supabase Client Runtime Error: ${err.message}`);
  }
}

async function checkGemini() {
  console.log('\n--- 3. Testing Gemini API Connectivity ---');
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error('❌ OPENROUTER_API_KEY is missing in .env.local');
    return;
  }

  const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  
  try {
    const start = Date.now();
    const response = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
    });
    const duration = Date.now() - start;

    if (response.ok) {
      console.log(`✅ Gemini API Connected in ${duration}ms`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Gemini API returned ${response.status}: ${errorText.substring(0, 100)}...`);
    }
  } catch (err: any) {
    console.error(`❌ Gemini Connectivity Error: ${err.message}`);
    if (err.message.includes('timeout') || err.message.includes('fetch failed')) {
      console.error('   💡 Suggestion: This matches the ConnectTimeoutError in logs. Potentially an IPv6 vs IPv4 routing issue.');
    }
  }
}

async function runAll() {
  console.log('🚀 Starting Supabase Connectivity Diagnostics...');
  await checkPostgres();
  await checkSupabaseAuth();
  await checkGemini();
  console.log('\n--- Diagnostics Complete ---');
}

runAll();
