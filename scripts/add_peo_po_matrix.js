const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Starting PEO-PO Matrix migration...');

        // Add peo_po_matrix column to programs table
        console.log('Adding peo_po_matrix to programs table...');
        await client.query(`
      ALTER TABLE programs
      ADD COLUMN IF NOT EXISTS peo_po_matrix JSONB DEFAULT NULL;
    `);

        console.log('PEO-PO Matrix migration completed successfully.');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
