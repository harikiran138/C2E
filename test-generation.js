const http = require('http');

const payload = JSON.stringify({
  programId: "42a6d93a-a41f-42f4-a2fc-f7f5f5d0299d", // Computer Science
  programName: "Computer Science and Engineering",
  totalCredits: 160,
  semesterCount: 8,
  categoryPercentages: {
    // Exactly compliant with validator.ts ranges
    BS: 16, // 16% of 160 = 25.6 credits
    ES: 18, // 18% of 160 = 28.8 credits
    HSS: 10,
    PC: 31.5, // 31.5% of 160 = 50.4 credits (passes both PC > 50 credits, and max 30+5%)
    PE: 10,
    OE: 5.5,
    MC: 0,
    AE: 3,
    SE: 3,
    PR: 3
  },
  semesterCategoryCounts: [],
  enableAiTitles: true, // This generates DB, OS, etc names, passing the CSE backbone check!
  strictAcademicFlow: false // Bypasses some strict flow checks just in case
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai/generate-curriculum',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Generate Status:', res.statusCode);
    const result = JSON.parse(data);
    if (res.statusCode !== 200) {
      console.log('Generate Error:', JSON.stringify(result, null, 2));
      return;
    }
    console.log('Curriculum Courses count:', result.curriculum?.semesters[0]?.courses?.length);
    
    // Test Saving
    const savePayload = JSON.stringify({
      programId: "42a6d93a-a41f-42f4-a2fc-f7f5f5d0299d",
      categoryCredits: [],
      semesterCategories: [],
      curriculum: result.curriculum,
      strictAcademicFlow: false
    });
    
    const saveReq = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/curriculum/save',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(savePayload)
      }
    }, (saveRes) => {
      let saveData = '';
      saveRes.on('data', chunk => saveData += chunk);
      saveRes.on('end', () => {
         console.log('Save Status:', saveRes.statusCode);
         console.log('Save result:', saveData);
      });
    });
    saveReq.write(savePayload);
    saveReq.end();

  });
});

req.on('error', console.error);
req.write(payload);
req.end();
