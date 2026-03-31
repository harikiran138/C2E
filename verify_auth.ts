async function testSignupAndLogin() {
  const baseUrl = "http://localhost:3000";
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "Password123!";
  const testInstitution = `Test Institution ${Date.now()}`;

  console.log(`Testing Signup with email: ${testEmail}`);
  
  try {
    const signupRes = await fetch(`${baseUrl}/api/institution/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutionName: testInstitution,
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });

    const signupData = await signupRes.json();
    if (!signupRes.ok) {
      throw new Error(`Signup failed: ${signupData.error}`);
    }
    console.log("Signup success:", signupData);

    console.log("Testing Login...");
    const loginRes = await fetch(`${baseUrl}/api/institution/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginData.error}`);
    }
    console.log("Login success:", loginData);
    
    console.log("Verification complete: Signup and Login are working perfectly!");
  } catch (error: any) {
    console.error("Verification failed:", error?.message || error);
    process.exit(1);
  }
}

testSignupAndLogin();
