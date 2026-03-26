/**
 * AI Model Router for C2E Curriculum Module.
 * Handles multi-model fallback and retry logic.
 * Fallback Path: Gemini 2.0 Flash -> Gemini 1.5 Pro -> TinyLlama (Local)
 */

export type AiProvider = "gemini" | "local";

export interface ModelConfig {
  name: string;
  provider: AiProvider;
  modelId: string;
}

const MODELS: ModelConfig[] = [
  { name: "Gemini 2.0 Flash", provider: "gemini", modelId: "gemini-2.0-flash" },
  { name: "Gemini 1.5 Pro", provider: "gemini", modelId: "gemini-1.5-pro" },
  { name: "TinyLlama", provider: "local", modelId: "tiny-llama" },
];

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

/**
 * Calls AI models in sequence with exponential backoff retry.
 * The executor receives the modelId and provider to handle different API formats.
 */
export async function callAiWithFallback<T>(
  prompt: string,
  executor: (modelId: string, provider: AiProvider, prompt: string) => Promise<T>
): Promise<T> {
  let lastError: any;

  for (const model of MODELS) {
    console.log(`[AI Router] Attempting with model: ${model.name} (${model.provider})`);
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await executor(model.modelId, model.provider, prompt);
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`[AI Router] Attempt ${attempt} failed for ${model.name}: ${error.message}`);
        
        // Don't retry if it's a 4xx error (except 429) unless it's the last model
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
           console.error(`[AI Router] Non-retryable error ${error.status} for ${model.name}.`);
           break; 
        }

        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_BACKOFF * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`[AI Router] Model ${model.name} exhausted all retries. Falling back...`);
  }

  throw new Error(`[AI Router] All models and retries failed. Last error: ${lastError?.message}`);
}

/**
 * Helper to call the local TinyLlama instance running via python-backend/main.py
 */
export async function callLocalAi(prompt: string, systemPrompt?: string): Promise<string> {
  const url = "http://localhost:8001/ai/local-chat";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, system_prompt: systemPrompt }),
    });

    if (!response.ok) {
      throw new Error(`Local AI Error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (error: any) {
    if (error.name === "TypeError" || error.code === "ECONNREFUSED") {
      console.error(`[Local-AI] Could not connect to Python backend at ${url}. Ensure the FastAPI server is running on port 8001.`);
    }
    throw error;
  }
}

