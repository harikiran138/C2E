const { GoogleGenAI } = require("@google/genai");

async function testKey() {
  const apiKey = "AIzaSyBJhZEmkzbb8qB0H8MokpU9tavsIcUAaSA";
  const genAI = new GoogleGenAI({ apiKey });
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    const text = response.text();
    console.log("Gemini API is working!");
    console.log("Response:", text);
  } catch (error) {
    console.error("Gemini API error:", error.message);
  }
}

testKey();
