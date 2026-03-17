const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectMembers() {
  const client = await pool.connect();
  try {
    const pac = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'pac_members'");
    const bos = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'bos_members'");
    
    console.log('Member tables existence:');
    console.log('pac_members:', pac.rows.length > 0);
    console.log('bos_members:', bos.rows.length > 0);

    if (pac.rows.length > 0) {
      const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'pac_members'");
      console.log('pac_members columns:', cols.rows.map(r => r.column_name));
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

inspectMembers();
