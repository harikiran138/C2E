import os
import httpx
import json
import asyncio
from typing import Optional, Dict
from dotenv import load_dotenv

load_dotenv()

# Global cache for AI responses
ai_cache: Dict[str, str] = {}

def load_ai_api_key() -> Optional[str]:
    """Load AI API key from environment variables with multiple fallbacks."""
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        load_dotenv(".env.local")
        key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        load_dotenv("../.env.local")
        key = os.getenv("OPENROUTER_API_KEY")
    return key

api_key = load_ai_api_key()

async def call_ai_async(prompt: str, retries: int = 3, use_cache: bool = True) -> str:
    if not api_key:
        raise Exception("AI API KEY not found")
    
    if use_cache and prompt in ai_cache:
        return ai_cache[prompt]
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    data = {
        "model": "google/gemini-2.0-flash-001",
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, headers=headers, json=data)
                
                if response.status_code == 200:
                    result = response.json()
                    choices = result.get('choices', [])
                    if not choices:
                        raise Exception("OpenRouter API returned empty choices list")
                    message = choices[0].get('message', {})
                    generated_text = message.get('content', '').strip()
                    if not generated_text:
                        raise Exception("OpenRouter API returned empty text")
                    ai_cache[prompt] = generated_text
                    return generated_text
                
                if response.status_code == 429:
                    wait_time = (attempt + 1) * 2
                    print(f"DEBUG: Rate limit reached. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                    
                raise Exception(f"OpenRouter API returned error {response.status_code}: {response.text}")
        except Exception as e:
            if attempt == retries - 1:
                raise e
            wait_time = (attempt + 1) * 2
            print(f"DEBUG: Error calling AI (attempt {attempt+1}/{retries}). Retrying in {wait_time}s... Error: {str(e)}")
            await asyncio.sleep(wait_time)
            
    return ""
