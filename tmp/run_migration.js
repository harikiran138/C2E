const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260317_curriculum_feedback.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    // Split SQL into commands by semicolon, but be careful with DO blocks
    // For simplicity, we can run the whole block if the driver supports it, 
    // or just run it as one query if it doesn't contain multiple statements that pg can't handle.
    // Actually, pg.query can handle multiple statements if separated by semicolons.
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
