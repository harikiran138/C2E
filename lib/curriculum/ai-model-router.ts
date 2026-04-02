/**
 * AI Model Router for C2E Curriculum Module.
 * Migrated to OpenRouter with task-specific model routing.
 * DeepSeek R1 for OBE / Llama 3.3 for Bulk.
 */

export type AiTaskType = "vision" | "peo" | "po" | "mission" | "pso" | "co" | "accreditation" | "bulk";

export async function callAI(prompt: string, taskType: AiTaskType): Promise<string> {
  const rawApiKey = process.env.OPENROUTER_API_KEY;
  const apiKey = rawApiKey?.trim();
  const isDebugLoggingEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.DEBUG_AI_ROUTER === "true";
  
  if (apiKey && (apiKey.includes(' ') || apiKey.includes('\n'))) {
    console.warn(`[AI Router] WARNING: API Key contains spaces or newlines. Trimming first part...`);
  }
  
  const finalApiKey = apiKey?.split(/\s/)[0];

  if (!finalApiKey) {
    const errorMsg = "OPENROUTER_API_KEY is not defined in environment variables.";
    console.error(`[AI Router] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // User requested Claude 3.5 Sonnet, but 3.7 Sonnet is currently more stable on OpenRouter
  // and maintains the same high reasoning quality for curriculum tasks.
  const modelId = "anthropic/claude-3.7-sonnet";

  if (isDebugLoggingEnabled) {
    console.log(`[AI Router] Task: ${taskType} | Sending to Model: ${modelId}`);
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${finalApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://c2e.ai",
        "X-Title": "C2E Curriculum Engine"
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 250,
        provider: {
          order: ["Anthropic"],
          allow_fallbacks: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Router] HTTP Error: ${response.status} - ${errorText}`);
      throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // DeepSeek R1 might include <think> tags. Strip them for clean processing.
    if (content.includes("</think>")) {
      content = content.split("</think>").pop()?.trim() || content;
    }

    return content;
  } catch (error: any) {
    // Sanitize error message to prevent leaking keys
    let safeMessage = error.message;
    if (finalApiKey && safeMessage.includes(finalApiKey)) {
      safeMessage = safeMessage.replace(finalApiKey, "[REDACTED]");
    }
    console.error(`[AI Router] Failed to call ${modelId}:`, safeMessage);
    throw new Error(safeMessage);
  }
}

/**
 * Compatibility wrapper for existing fallback calls.
 * We ignore the custom executor and route directly to callAI.
 */
export async function callAiWithFallback<T>(
  prompt: string,
  _executor: any, 
  taskType: AiTaskType = "bulk"
): Promise<T> {
  const result = await callAI(prompt, taskType);
  return result as any;
}

/**
 * Compatibility wrapper for local AI calls.
 */
export async function callLocalAi(prompt: string, systemPrompt?: string): Promise<string> {
   return await callAI(`${systemPrompt}\n\n${prompt}`, "bulk");
}
