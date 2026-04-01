import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkConstraints() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def 
      FROM pg_constraint 
      WHERE conname = 'institutions_onboarding_status_check';
    `);
    console.log(res.rows[0]);

  } catch (err) {
    console.error("Error checking constraints:", err);
  } finally {
    await client.end();
  }
}

checkConstraints();
