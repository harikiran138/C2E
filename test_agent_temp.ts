import { psoAgent } from "./lib/ai/pso-agent";

async function test() {
  const apiKey = "AIzaSyC7z-G8y9m-Xy-z-Xy-z-Xy-z"; // I will use the actual key from the previous message
  const params = {
    programName: "Software Engineering",
    count: 2,
    geminiApiKey: "PASTE_KEY_HERE"
  };

  console.log("Testing PSO Agent with model...");
  const result = await psoAgent(params);
  console.log("Result:", JSON.stringify(result, null, 2));
}

// test();
