const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifySchema() {
  const client = await pool.connect();
  try {
    console.log('Verifying OBE Database Schema...');

    // 1. Check Programs Table Columns
    console.log('\nChecking "programs" table columns...');
    const progCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'programs';
    `);
    
    const requiredProgCols = [
      'vision', 'mission', 'peo_brainstorming_start_date', 
      'consistency_matrix', 'lead_society', 'id', 'program_name'
    ];
    
    requiredProgCols.forEach(col => {
      const found = progCols.rows.find(r => r.column_name === col);
      if (found) {
        console.log(`✅ programs.${col} exists (${found.data_type})`);
      } else {
        console.error(`❌ programs.${col} MISSING`);
      }
    });

    // 2. Check PEOs Table
    console.log('\nChecking "program_peos" table...');
    const peoTable = await client.query(`
      SELECT to_regclass('program_peos');
    `);
    if (peoTable.rows[0].to_regclass) {
        console.log('✅ Table "program_peos" exists');
        // Check columns
        const peoCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'program_peos'`);
        const result = peoCols.rows.map(r => r.column_name);
        console.log('   Columns:', result.join(', '));
    } else {
        console.error('❌ Table "program_peos" MISSING');
    }

    // 3. Check POs Table
    console.log('\nChecking "program_outcomes" table...');
    const poTable = await client.query(`
      SELECT to_regclass('program_outcomes');
    `);
    if (poTable.rows[0].to_regclass) {
        console.log('✅ Table "program_outcomes" exists');
    } else {
        console.error('❌ Table "program_outcomes" MISSING');
    }

    // 4. Check PSOs Table
    console.log('\nChecking "program_psos" table...');
    const psoTable = await client.query(`
      SELECT to_regclass('program_psos');
    `);
    if (psoTable.rows[0].to_regclass) {
        console.log('✅ Table "program_psos" exists');
    } else {
        console.error('❌ Table "program_psos" MISSING');
    }

    // 5. Test Relationship: Insert Dummy Data (and Rollback)
    console.log('\nTesting Data Integrity (Transaction)...');
    await client.query('BEGIN');
    
    // Get first program
    const progRes = await client.query('SELECT id FROM programs LIMIT 1');
    if (progRes.rows.length === 0) {
        console.warn('⚠️ No programs found to test relationships.');
    } else {
        const progId = progRes.rows[0].id;
        console.log(`Testing with Program ID: ${progId}`);

        // Insert PEO
        await client.query(`
            INSERT INTO program_peos (program_id, peo_text, peo_number)
            VALUES ($1, 'Test PEO', 1)
        `, [progId]).catch(e => console.error('❌ PEO Insert Failed:', e.message));

        // Insert PSO
        await client.query(`
            INSERT INTO program_psos (program_id, pso_statement, pso_number)
            VALUES ($1, 'Test PSO', 1)
        `, [progId]).catch(e => console.error('❌ PSO Insert Failed:', e.message));

        console.log('✅ Insert tests attempted (Rolled back).');
    }
    
    await client.query('ROLLBACK');

  } catch (err) {
    console.error('Verification Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

verifySchema();
