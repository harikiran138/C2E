
import { Pool } from 'pg';

async function findRegion() {
  const regions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'ap-southeast-1',
    'eu-central-1'
  ];
  
  for (const region of regions) {
    const connectionString = `postgres://postgres.ncofwpuabtxddvdjljgj:w8HpdxF%2FCiGp_sn@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    console.log(`Testing region: ${region}...`);
    try {
      const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      const client = await pool.connect();
      console.log(`FOUND REGION! Successful connection to: ${region}`);
      client.release();
      process.exit(0);
    } catch (err: any) {
      if (err.message.includes('Tenant or user not found')) {
        console.log(`${region}: Tenant not found.`);
      } else {
        console.log(`${region}: Other error - ${err.message}`);
      }
    }
  }
  console.error('Project region not found in common AWS regions.');
  process.exit(1);
}

findRegion();
