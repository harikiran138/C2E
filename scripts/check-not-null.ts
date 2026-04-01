import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkNotNull() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    console.log("--- NOT NULL Columns for public.programs ---");
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'programs' 
        AND table_schema = 'public' 
        AND is_nullable = 'NO'
    `);
    console.log(res.rows.map(r => r.column_name));

  } catch (err) {
    console.error("Error checking columns:", err);
  } finally {
    await client.end();
  }
}

checkNotNull();
