const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function testGemini() {
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not found in .env.local');
        return;
    }

    console.log('Testing Gemini API with key:', GEMINI_API_KEY.substring(0, 5) + '...');
    
    const prompt = 'Hello, reply with "Success" if you can hear me.';
    
    try {
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API Failed: ${response.status} ${response.statusText}`);
            console.error('Error details:', errorText);
            return;
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('Gemini Response:', generatedText);
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testGemini();
