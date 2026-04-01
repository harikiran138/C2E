import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcrypt";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  console.log("🚀 Starting Security Audit Seeding...");

  const context = {
    institutions: {
      A: { id: uuidv4(), name: "Institution A (Test)" },
      B: { id: uuidv4(), name: "Institution B (Test)" },
    },
    programs: {
      P1: { id: uuidv4(), name: "CSE (Program P1)", degree: "B.Tech", years: 4, level: "UG" },
      P2: { id: uuidv4(), name: "ECE (Program P2)", degree: "B.Tech", years: 4, level: "UG" },
      P3: { id: uuidv4(), name: "MECH (Program P3)", degree: "B.Tech", years: 4, level: "UG" },
    },
    users: {
      SA1: { id: uuidv4(), email: "sa1@test.com", role: "SUPER_ADMIN" },
      IA1: { id: uuidv4(), email: "ia1@test.com", role: "INSTITUTE_ADMIN" },
      IB1: { id: uuidv4(), email: "ib1@test.com", role: "INSTITUTE_ADMIN" },
      PA1: { id: uuidv4(), email: "pa1@test.com", role: "PROGRAM_ADMIN" },
      PA2: { id: uuidv4(), email: "pa2@test.com", role: "PROGRAM_ADMIN" },
      PB1: { id: uuidv4(), email: "pb1@test.com", role: "PROGRAM_ADMIN" },
    },
    password: "TestPassword123!",
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 0. Cleanup old test data
    console.log("🧹 Cleaning up old test data...");
    await client.query("DELETE FROM public.profiles WHERE email LIKE '%@test.com'");
    await client.query("DELETE FROM auth.users WHERE email LIKE '%@test.com'");
    await client.query("DELETE FROM public.institutions WHERE institution_name LIKE '%(Test)'");

    // 1. Insert Institutions
    console.log("🏢 Inserting Institutions...");
    for (const inst of Object.values(context.institutions)) {
      await client.query(
        "INSERT INTO public.institutions (id, institution_name, email, onboarding_status) VALUES ($1, $2, $3, 'COMPLETED')",
        [inst.id, inst.name, `admin@${inst.name.toLowerCase().replace(/ /g, "")}.com`]
      );
    }

    // 2. Insert Programs
    console.log("🎓 Inserting Programs...");
    // P1, P2 under Inst A
    await client.query(
      "INSERT INTO public.programs (id, institution_id, program_name, program_code, degree, duration, level, intake, academic_year, vmpeo_feedback_cycle) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [context.programs.P1.id, context.institutions.A.id, context.programs.P1.name, "CS101", context.programs.P1.degree, context.programs.P1.years, context.programs.P1.level, 60, "2023-24", "brainstorming"]
    );
    await client.query(
      "INSERT INTO public.programs (id, institution_id, program_name, program_code, degree, duration, level, intake, academic_year, vmpeo_feedback_cycle) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [context.programs.P2.id, context.institutions.A.id, context.programs.P2.name, "EC101", context.programs.P2.degree, context.programs.P2.years, context.programs.P2.level, 60, "2023-24", "brainstorming"]
    );
    // P3 under Inst B
    await client.query(
      "INSERT INTO public.programs (id, institution_id, program_name, program_code, degree, duration, level, intake, academic_year, vmpeo_feedback_cycle) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [context.programs.P3.id, context.institutions.B.id, context.programs.P3.name, "ME101", context.programs.P3.degree, context.programs.P3.years, context.programs.P3.level, 60, "2023-24", "brainstorming"]
    );

    // 3. Insert Users (Auth + Profiles)
    console.log("👤 Inserting Users...");
    const hashedPassword = await bcrypt.hash(context.password, 10);

    for (const [key, user] of Object.entries(context.users)) {
      // a. Insert into auth.users
      await client.query(
          `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data) 
           VALUES ($1, $2, $3, NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', $4)`,
          [user.id, user.email, hashedPassword, JSON.stringify({ role: user.role })]
      );

      // b. Insert into public.profiles
      let instId = null;
      let progId = null;

      if (key === "IA1" || key === "PA1" || key === "PA2") instId = context.institutions.A.id;
      if (key === "IB1" || key === "PB1") instId = context.institutions.B.id;
      
      if (key === "PA1") progId = context.programs.P1.id;
      if (key === "PA2") progId = context.programs.P2.id;
      if (key === "PB1") progId = context.programs.P3.id;

      await client.query(
        "INSERT INTO public.profiles (id, email, role, institution_id, program_id) VALUES ($1, $2, $3, $4, $5)",
        [user.id, user.email, user.role, instId, progId]
      );
    }

    // 4. Insert baseline PSOs
    console.log("🎯 Inserting Baseline PSOs...");
    const psos = [
        { prog: "P1", text: "PSO-P1-ONLY" },
        { prog: "P2", text: "PSO-P2-ONLY" },
        { prog: "P3", text: "PSO-P3-ONLY" }
    ];

    for (const pso of psos) {
        const progId = context.programs[pso.prog as keyof typeof context.programs].id;
        const instId = (pso.prog === "P3") ? context.institutions.B.id : context.institutions.A.id;
        
        await client.query(
            "INSERT INTO public.program_psos (program_id, institution_id, pso_statement, pso_number) VALUES ($1, $2, $3, $4)",
            [progId, instId, pso.text, 1]
        );
    }

    await client.query("COMMIT");
    console.log("✅ Seeding completed successfully!");

    // Save context for other tests
    fs.writeFileSync("./audit_context.json", JSON.stringify(context, null, 2));
    console.log("📁 Context saved to audit_context.json");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
