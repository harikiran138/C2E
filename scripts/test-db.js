const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('.env.local not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const env = {};

envLines.forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
});

const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('Testing connection with DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});


async function testConnection() {
  console.log('--- Testing DATABASE_URL ---');
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database with DATABASE_URL');
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0].now);
    client.release();
    await pool.end();
    return; // Success
  } catch (err) {
    console.error('Connection error with DATABASE_URL:', err.message);
    await pool.end();
  }


  const directUrl = env.DIRECT_URL;
  if (directUrl) {
    console.log('\n--- Testing DIRECT_URL (from .env.local) ---');
    await tryConnect(directUrl, 'DIRECT_URL');
  } else {
    // Try to derive DIRECT_URL from DATABASE_URL
    // Format: postgres://[user].[project]:[pass]@[host]:[port]/[db]
    // Target: postgres://postgres:[pass]@db.[project].supabase.co:5432/[db]
    
    try {
        const urlParts = new URL(databaseUrl);
        const username = urlParts.username; // e.g. postgres.ref
        const password = urlParts.password;
        
        let projectRef = '';
        if (username.includes('.')) {
            projectRef = username.split('.')[1];
        }

        if (projectRef) {
            console.log(`\n--- Attempting to derive DIRECT_URL for project: ${projectRef} ---`);
            const derivedDirectUrl = `postgres://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
            await tryConnect(derivedDirectUrl, 'DERIVED_DIRECT_URL');
        } else {
            console.log('\nCould not derive project ref from DATABASE_URL username to attempt direct connection.');
        }

    } catch (e) {
        console.log('Error parsing DATABASE_URL:', e.message);
    }
  }
}

async function tryConnect(connectionString, label) {
    console.log(`Testing connection with ${label}:`, connectionString.replace(/:[^:@]+@/, ':****@'));
    const testPool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000 // 5s timeout
    });

    try {
        const client = await testPool.connect();
        console.log(`SUCCESS: Connected with ${label}`);
        const res = await client.query('SELECT NOW()');
        console.log('Current time from DB:', res.rows[0].now);
        client.release();
    } catch (err) {
        console.error(`FAILURE: Connection error with ${label}:`, err.message);
    } finally {
        await testPool.end();
    }
}

testConnection();


