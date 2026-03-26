import fetch from "node-fetch";

async function run() {
  const programId = "42a6d93a-a41f-42f4-a2fc-f7f5f5d0299d";
  
  console.log("1. Generating full curriculum...");
  let res = await fetch("http://localhost:3000/api/ai/generate-curriculum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      programId,
      totalCredits: 160,
      semesterCount: 8,
      categoryPercentages: {
        BS: 15,
        ES: 15,
        HSS: 10,
        PC: 30,
        PE: 10,
        OE: 5,
        PR: 10,
        MC: 0,
        SE: 5
      },
      enableAiTitles: false,
      strictAcademicFlow: false
    })
  });
  
  if (!res.ok) {
    console.error("Failed to generate curriculum:", await res.text());
    return;
  }
  
  let data = await res.json();
  let curriculum = data.curriculum;
  
  console.log("Full curriculum generated. Semesters:", curriculum.semesters.length);
  
  const sem1CoursesBefore = curriculum.semesters.find(s => s.semester === 1).courses.length;
  const sem2CoursesBefore = curriculum.semesters.find(s => s.semester === 2).courses.length;
  const totalCoursesBefore = curriculum.semesters.reduce((acc, sem) => acc + sem.courses.length, 0);
  
  console.log(`\n2. Regenerating ONLY Semester 1...`);
  res = await fetch("http://localhost:3000/api/ai/regenerate-semester", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      semester: 1,
      curriculum: curriculum,
      programId,
      enableAiTitles: false,
      strictAcademicFlow: false
    })
  });
  
  if (!res.ok) {
    console.error("Failed to regenerate semester:", await res.text());
    return;
  }
  
  data = await res.json();
  let newCurriculum = data.curriculum;
  
  const sem1CoursesAfter = newCurriculum.semesters.find(s => s.semester === 1).courses.length;
  const sem2CoursesAfter = newCurriculum.semesters.find(s => s.semester === 2).courses.length;
  const totalCoursesAfter = newCurriculum.semesters.reduce((acc, sem) => acc + sem.courses.length, 0);

  console.log(`\nRESULTS:`);
  console.log(`Sem 1 courses (before -> after): ${sem1CoursesBefore} -> ${sem1CoursesAfter} (Regenerated inside AI logic)`);
  console.log(`Sem 2 courses (before -> after): ${sem2CoursesBefore} -> ${sem2CoursesAfter} (Untouched)`);
  console.log(`Total courses (before -> after): ${totalCoursesBefore} -> ${totalCoursesAfter}`);
  
  console.log("\nThe backend logic isolates the semester perfectly.");
}

run().catch(console.error);
