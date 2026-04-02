import pool from "../lib/postgres";

async function checkSchema() {
  const client = await pool.connect();
  try {
    const tables = ['program_peos', 'program_outcomes', 'program_psos', 'program_specific_outcomes', 'peos'];
    for (const table of tables) {
      console.log(`\n--- TABLE: ${table} ---`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      console.log(JSON.stringify(res.rows, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
