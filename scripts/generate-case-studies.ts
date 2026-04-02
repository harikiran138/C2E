import "dotenv/config";
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const INSTITUTION_ID = "fef499a4-fbe2-44d4-b33f-e0d6cef22fb7";

const CASE_STUDIES = [
  {
    program_name: "B.Tech Artificial Intelligence and Data Science",
    program_code: "AI-DS-2024",
    degree: "B.Tech",
    level: "UG",
    duration: 4,
    intake: 60,
    academic_year: "2024-25",
    program_chair: "Dr. Alice AI",
    nba_coordinator: "Prof. Bob Data",
    vision: "To be a global leader in AI research and education, fostering innovation for a sustainable and intelligent future.",
    mission: "1. To provide high-quality education in AI and Data Science. 2. To engage in cutting-edge research with industry collaboration. 3. To promote ethical AI practices and social responsibility.",
    mission_priorities: ["Technical Excellence", "AI Ethics", "Industry Collaboration"],
    peos: [
      "Graduates will be successful professionals in AI and Data Science industries.",
      "Graduates will pursue higher studies and research in advanced computational fields.",
      "Graduates will demonstrate ethical leadership and contribute to society through technology."
    ],
    psos: [
      "Ability to design and implement complex AI models using modern frameworks.",
      "Skill in analyzing large-scale datasets to derive actionable insights.",
      "Competence in deploying responsible AI solutions at scale."
    ]
  },
  {
    program_name: "B.Arch Sustainable Architecture",
    program_code: "ARCH-S-2024",
    degree: "B. Tech.",
    level: "UG",
    duration: 5,
    intake: 40,
    academic_year: "2024-25",
    program_chair: "Ar. Clara Green",
    nba_coordinator: "Ar. David Eco",
    vision: "To redefine the built environment through sustainable design and ecological harmony.",
    mission: "1. To educate future architects in green building practices. 2. To innovate in materials science for low-carbon construction. 3. To integrate traditional wisdom with modern technology.",
    mission_priorities: ["Sustainability", "Material Innovation", "Ecological Design"],
    peos: [
      "Graduates will design energy-efficient buildings that minimize environmental impact.",
      "Graduates will lead consultancy firms specializing in green certifications.",
      "Graduates will advocate for sustainable urban planning in global policy-making."
    ],
    psos: [
      "Mastery of vernacular and modern sustainable construction techniques.",
      "Proficiency in life-cycle assessment tools for architectural projects.",
      "Ability to integrate socio-cultural values into eco-centric designs."
    ]
  },
  {
    program_name: "B.A. Digital Journalism",
    program_code: "JOUR-D-2024",
    degree: "B.Sc.",
    level: "UG",
    duration: 3,
    intake: 50,
    academic_year: "2024-25",
    program_chair: "Ms. Elena News",
    nba_coordinator: "Mr. Felix Truth",
    vision: "To champion truth and integrity in the digital information age through fearless storytelling.",
    mission: "1. To equip students with multi-platform reporting skills. 2. To foster critical thinking and investigative rigor. 3. To promote ethical journalism in a hyper-connected world.",
    mission_priorities: ["Digital Literacies", "Investigative Journalism", "Media Ethics"],
    peos: [
      "Graduates will produce high-impact investigative reports for global digital outlets.",
      "Graduates will lead digital newsrooms with a focus on data-driven storytelling.",
      "Graduates will uphold democratic values through impartial and truthful reporting."
    ],
    psos: [
      "Competence in multimedia production and data visualization for news.",
      "Skill in digital verification and combating misinformation.",
      "Ability to engage diverse audiences through interactive digital platforms."
    ]
  }
];

async function main() {
  console.log("🚀 Seeding Case Studies...");

  try {
    await client.connect();

    for (const cs of CASE_STUDIES) {
      try {
        const query = `
          INSERT INTO programs (
            institution_id,
            program_name,
            program_code,
            degree,
            level,
            duration,
            intake,
            academic_year,
            program_chair,
            nba_coordinator,
            program_vision,
            program_mission,
            mission_priorities,
            vision,
            mission,
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', NOW(), NOW())
          RETURNING id
        `;
        const values = [
          INSTITUTION_ID,
          cs.program_name,
          cs.program_code,
          cs.degree,
          cs.level,
          cs.duration,
          cs.intake,
          cs.academic_year,
          cs.program_chair,
          cs.nba_coordinator,
          cs.vision,
          cs.mission,
          cs.mission_priorities,
          cs.vision,
          cs.mission
        ];
        
        const res = await client.query(query, values);
        console.log(`✅ Seeded: ${cs.program_name} (ID: ${res.rows[0].id})`);
      } catch (error: any) {
        console.error(`❌ Failed to seed ${cs.program_name}:`, error.message);
      }
    }
  } catch (err: any) {
    console.error("❌ DB Connection Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
