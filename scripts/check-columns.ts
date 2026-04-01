import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    console.log("--- Columns for public.institutions ---");
    const instRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'institutions' AND table_schema = 'public'
    `);
    console.log(instRes.rows.map(r => r.column_name));

    console.log("\n--- Columns for public.programs ---");
    const progRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'programs' AND table_schema = 'public'
    `);
    console.log(progRes.rows.map(r => r.column_name));

  } catch (err) {
    console.error("Error checking columns:", err);
  } finally {
    await client.end();
  }
}

checkColumns();
