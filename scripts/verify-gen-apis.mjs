import fs from 'fs';
import path from 'path';

const filesToVerify = [
  'lib/ai/vision-hybrid-generator.ts',
  'lib/ai/mission-agent.ts',
  'lib/ai/pso-agent.ts',
  'lib/ai/po-agent.ts',
  'lib/ai/peo-agent.ts',
  'app/api/generate/vision-mission/route.ts',
  'scripts/test-gemini.js'
];

console.log('--- Verifying Gemini Model Names ---');
filesToVerify.forEach(file => {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasWrongModel = content.includes('gemini-2.5-flash');
    const hasCorrectModel = content.includes('gemini-1.5-flash');
    console.log(`${file}: ${hasWrongModel ? '❌ has gemini-2.5-flash' : '✅ no gemini-2.5-flash'} | ${hasCorrectModel ? '✅ has gemini-1.5-flash' : '❓ no gemini-1.5-flash'}`);
  } else {
    console.log(`${file}: 📁 file not found`);
  }
});

console.log('\n--- Verifying PSO Result Structure ---');
const psoAgentPath = path.resolve(process.cwd(), 'lib/ai/pso-agent.ts');
if (fs.existsSync(psoAgentPath)) {
    const content = fs.readFileSync(psoAgentPath, 'utf8');
    const hasResultsKey = content.includes('results: details.map');
    console.log(`lib/ai/pso-agent.ts: ${hasResultsKey ? '✅ includes results: details.map' : '❌ missing results key'}`);
}
