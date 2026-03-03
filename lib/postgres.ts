import { Pool } from "pg";

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

export const query = (text: string, params: any[]) => pool.query(text, params);
export default pool;
