import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  password: 'w8HpdxF/CiGp_sn',
  host: 'db.ncofwpuabtxddvdjljgj.supabase.co',
  port: 5432,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

export const query = (text: string, params: any[]) => pool.query(text, params);
export default pool;
