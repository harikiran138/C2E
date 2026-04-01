import { Client } from "pg";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runSql() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const sqlFile = process.argv[2];
    if (!sqlFile) throw new Error("Please specify a SQL file or use -e.");
    
    let sql: string;
    if (sqlFile === "-e") {
        sql = process.argv[3];
        console.log(`🚀 Executing immediate SQL...`);
    } else {
        console.log(`🚀 Executing custom SQL: ${sqlFile}`);
        sql = fs.readFileSync(sqlFile, 'utf8');
    }
    
    await client.connect();
    const res = await client.query(sql);
    console.log(`✅ SQL applied successfully.`);
    if (res.rows && res.rows.length > 0) {
      console.table(res.rows);
    } else {
      console.log("No rows returned.");
    }

  } catch (err) {
    console.error("❌ SQL execution failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSql();
