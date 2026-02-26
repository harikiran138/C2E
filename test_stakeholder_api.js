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
    const cookies = loginRes.headers.get('set-cookie');
    console.log("Cookies:", cookies);
    
    // Get programs to find a program_id
    const progRes = await fetch('http://localhost:3000/api/institution/dashboard/metrics', {
      headers: { 'Cookie': cookies }
    });
    
    // It's probably easier just to fetch anything that uses the cookie.
    const stRes = await fetch('http://localhost:3000/api/institution/stakeholders?programId=1', {
      headers: { 'Cookie': cookies }
    });
    
    console.log("Stakeholders GET status:", stRes.status);
    console.log("Stakeholders GET body:", await stRes.text());
    
  } catch (e) {
    console.error(e);
  }
}
test();
