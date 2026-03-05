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
    const setCookieHeaders = typeof loginRes.headers.getSetCookie === "function"
      ? loginRes.headers.getSetCookie()
      : [loginRes.headers.get('set-cookie') || ''];
    const cookies = setCookieHeaders
      .map((cookie) => cookie.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    console.log("Cookies:", cookies);
    
    // Create a program and use the returned UUID for stakeholder list query
    const progRes = await fetch('http://localhost:3000/api/institution/programs', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        program_name: `Stakeholder API Test ${Date.now()}`,
        degree: 'B.Tech',
        level: 'UG',
        duration: 4,
        intake: 60,
        academic_year: '2024-2028',
        program_code: `STK-${Date.now()}`
      })
    });
    const progBodyText = await progRes.text();
    const progData = progBodyText ? JSON.parse(progBodyText) : {};

    if (!progRes.ok || !progData?.program?.id) {
      console.error("Program creation failed", progData);
      return;
    }

    const programId = progData.program.id;
    const stRes = await fetch(`http://localhost:3000/api/institution/stakeholders?programId=${programId}`, {
      headers: { 'Cookie': cookies }
    });
    
    console.log("Stakeholders GET status:", stRes.status);
    console.log("Stakeholders GET body:", await stRes.text());
    
  } catch (e) {
    console.error(e);
  }
}
test();
