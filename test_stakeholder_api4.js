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
    
    // Just POST to stakeholders with a dummy valid-looking UUID for programId
    // to see if we get 'Unauthorized'
    const programId = "d7b29a67-2856-4c28-98f5-cc1f8510dc7f"; // format
    
    const stRes = await fetch('http://localhost:3000/api/institution/stakeholders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': reqCookies 
      },
      body: JSON.stringify({
         program_id: programId,
         member_name: "Test Stakeholder",
         email: "test@example.com",
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
