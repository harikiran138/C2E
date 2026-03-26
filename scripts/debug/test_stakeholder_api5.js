const http = require('http');

async function test() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/institution/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'director@nillp.ai', password: 'DKMNILLP@5604' })
    });
    
    if (!loginRes.ok) {
        console.error("Login failed", await loginRes.text());
        return;
    }
    
    console.log("Login success");
    const setCookieHeader = loginRes.headers.getSetCookie();
    const reqCookies = setCookieHeader.map(c => c.split(';')[0]).join('; ');
    console.log("Req Cookies:", reqCookies);
    
    // Get programs to find a valid program_id
    const progRes = await fetch('http://localhost:3000/api/institution/programs', {
      headers: { 'Cookie': reqCookies }
    });
    const progData = await progRes.json();
    
    let programId;
    if (!progData.data || progData.data.length === 0) {
       console.log("No programs found.");
       return;
    } else {
       programId = progData.data[0].id;
       console.log("Using Program ID:", programId);
    }
    
    // Test POST to stakeholders
    const stRes = await fetch('http://localhost:3000/api/institution/stakeholders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': reqCookies 
      },
      body: JSON.stringify({
         program_id: programId,
         member_name: "Test Stakeholder",
         email: "test_stakeholder@example.com",
         organization: "Test Org",
         category: "Alumni"
      })
    });
    
    console.log("Stakeholders POST status:", stRes.status);
    console.log("Stakeholders POST body:", await stRes.text());
    
  } catch (e) {
    console.error(e);
  }
}
test();
