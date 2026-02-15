const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});


// Use direct connection URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace('aws-0-ap-south-1.pooler.supabase.com', 'db.xjqjczrffkdomkclnxks.supabase.co').replace('6543', '5432'),
  ssl: {
    rejectUnauthorized: false
  }
});

async function dropConstraint() {
  const client = await pool.connect();
  try {
    console.log('Attempting to drop constraint "institutions_id_fkey"...');
    
    // Check if constraint exists
    const checkQuery = `
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'institutions_id_fkey';
    `;
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rowCount === 0) {
      console.log('Constraint "institutions_id_fkey" does not exist (maybe already dropped).');
    } else {
      // Drop the constraint
      await client.query('ALTER TABLE institutions DROP CONSTRAINT institutions_id_fkey;');
      console.log('Successfully dropped constraint "institutions_id_fkey".');
    }

  } catch (err) {
    console.error('Error dropping constraint:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

dropConstraint();
