import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Existing Tables in public schema:");
    console.log(res.rows.map(r => r.table_name));

    const authRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'auth'
    `);
    console.log("\nExisting Tables in auth schema:");
    console.log(authRes.rows.map(r => r.table_name));

  } catch (err) {
    console.error("Error checking schema:", err);
  } finally {
    await client.end();
  }
}

checkSchema();
