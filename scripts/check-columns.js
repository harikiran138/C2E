
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

async function checkColumns() {
  const client = await pool.connect();
  try {
    const tables = ['institutions', 'institution_details', 'programs'];
    for (const table of tables) {
      console.log(`\n--- Columns for ${table} ---`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
      `);
      res.rows.forEach(row => {
        console.log(`${row.column_name} (${row.data_type})`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

checkColumns();
