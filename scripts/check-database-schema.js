const { Client } = require('pg');
// require('dotenv').config({ path: '.env.local' }); // Using node --env-file instead

async function checkSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  // The connection string might need ?sslmode=require for Supabase
  // But usually the provided string works. Let's try.
  // Note: pg library parses connection string automatically.
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase connection from external
  });

  try {
    await client.connect();
    console.log('Connected to database successfully.');

    // Query to list all user tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n--- EXISTING TABLES ---');
    if (tablesRes.rows.length === 0) {
        console.log('No tables found in public schema.');
    } else {
        for (const row of tablesRes.rows) {
            console.log(`- ${row.table_name}`);
            
            // Get columns for each table
            const columnsRes = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position;
            `, [row.table_name]);
            
            columnsRes.rows.forEach(col => {
                console.log(`    ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
            });
        }
    }
    console.log('\n--- END SCHEMA CHECK ---');

  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

checkSchema();
