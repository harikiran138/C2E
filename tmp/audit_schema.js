const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function dumpSchema() {
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('--- TABLES ---');
    console.log(tables.join(', '));

    for (const table of tables) {
      console.log(`\n--- TABLE: ${table} ---`);
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      console.table(colsRes.rows);

      const fksRes = await client.query(`
        SELECT
            tc.constraint_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;
      `, [table]);
      if (fksRes.rows.length > 0) {
        console.log('Foreign Keys:');
        console.table(fksRes.rows);
      }
    }

    console.log('\n--- RLS POLICIES ---');
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `);
    console.table(policiesRes.rows);

  } catch (err) {
    console.error('Schema dump failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

dumpSchema();
