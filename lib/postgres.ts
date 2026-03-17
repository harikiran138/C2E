import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load .env.local if DATABASE_URL is missing (ensures local dev stability)
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

// For Vercel/Production, it's highly recommended to use the Supabase Connection Pooler
// to avoid DNS resolution issues (IPv6) and connection limits in serverless functions.
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
      }
    : {
        ssl:
          process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME,
      },
);

if (!process.env.DATABASE_URL && !process.env.DB_NAME) {
  console.warn("⚠️ Warning: DATABASE_URL and DB_NAME are missing from environment.");
}

export const query = (text: string, params: any[]) => pool.query(text, params);
export default pool;
