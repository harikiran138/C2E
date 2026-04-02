
const fs = require('fs');
const path = require('path');

async function finalVerify() {
  const envPath = path.join(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/GEMINI_API_KEY=(.+)/);
  const apiKey = match[1].trim();

  // Thinking model URL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Explain the concept of Program Specific Outcomes in one short sentence." }] }]
      })
    });

    const data = await response.json();
    if (response.ok) {
       console.log('SUCCESS: API Communication works with Thinking model.');
       console.log('Model Response:', data.candidates[0].content.parts[0].text);
    } else {
       console.log('ERROR:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

finalVerify();
