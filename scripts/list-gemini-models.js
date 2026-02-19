const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function listModels() {
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not found in .env.local');
        return;
    }

    console.log('Listing Gemini models...');
    
    try {
        const response = await fetch(`${URL}?key=${GEMINI_API_KEY}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Gemini API Failed: ${response.status} ${response.statusText}`);
            console.error('Error details:', errorText);
            return;
        }

        const data = await response.json();
        console.log('Available Models:');
        data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

listModels();
