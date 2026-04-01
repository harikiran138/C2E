import { Client } from "pg";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function applyMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    const obe_tables = [
        'program_visions', 'program_missions', 'program_peos', 'program_outcomes',
        'program_psos', 'program_step_completions', 'program_dissemination',
        'program_vmpeo_feedback_entries', 'program_vmpeo_feedback_submissions',
        'stakeholders', 'stakeholder_feedback', 'curriculum_versions',
        'curriculum_category_credits', 'curriculum_electives_settings',
        'curriculum_semester_categories', 'curriculum_generated_courses',
        'curriculum_course_outcomes', 'peos', 'peo_drafts'
    ];

    console.log("🔧 Synchronizing schema: Adding institution_id to all tables...");
    for (const t of obe_tables) {
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${t}' AND column_name = 'institution_id') THEN
                    ALTER TABLE public.${t} ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;
                END IF;
            END $$;
        `);
    }
    console.log("✅ Schema synchronized.");

    const migrationFiles = [
        "supabase/migrations/20260401000001_v5_hierarchy_rbac.sql"
    ];

    for (const file of migrationFiles) {
        console.log(`🚀 Applying migration: ${file}`);
        const sql = fs.readFileSync(file, 'utf8');
        await client.query(sql);
        console.log(`✅ Success.`);
    }

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await client.end();
  }
}

applyMigrations();
