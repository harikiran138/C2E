import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load .env.local if DATABASE_URL is missing (ensures local dev stability)
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.local" });
}

// For Vercel/Production, it's highly recommended to use the Supabase Connection Pooler
// to avoid DNS resolution issues (IPv6) and connection limits in serverless functions.
const isSupabasePooler =
  process.env.DATABASE_URL?.includes("pooler.supabase.com") ||
  process.env.DATABASE_URL?.includes("supabase.co");

function createPool() {
  const baseConfig = {
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(
      process.env.PG_CONNECTION_TIMEOUT_MS || 10000,
    ),
    allowExitOnIdle: process.env.NODE_ENV !== "production",
  };

  if (process.env.DATABASE_URL) {
    return new Pool({
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
      ssl:
        isSupabasePooler || process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
  }

  return new Pool({
    ...baseConfig,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME,
  });
}

declare global {
  var __c2ePool: Pool | undefined;
}

const pool = global.__c2ePool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__c2ePool = pool;
}

if (!process.env.DATABASE_URL && !process.env.DB_NAME) {
  console.warn("⚠️ Warning: DATABASE_URL and DB_NAME are missing from environment.");
}

export const query = (text: string, params: any[]) => pool.query(text, params);
export default pool;
