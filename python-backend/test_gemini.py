import asyncio
from main import call_gemini_rest_async, api_key
import json
import re

async def main():
    print(f"Key: {api_key[:10]}...")
    prompt = """
You are an academic accreditation expert. Generate exactly 3 distinct Program Vision statement(s).
Program: Computer Science
Institute Vision: To be great
Selected Focus Areas: Innovation, Excellence
Rules: 1–2 lines per statement, Future-oriented, Professional tone. Output ONLY a valid JSON array of strings containing the statements. Example format: ["Vision 1", "Vision 2"]
    """
    try:
        res = await call_gemini_rest_async(prompt)
        print("Raw:")
        print(res)
        
        match = re.search(r'\[.*\]', res, re.DOTALL)
        if match:
            print("Extracted:")
            print(match.group(0))
            data = json.loads(match.group(0))
            print("Parsed:")
            print(data)
    except Exception as e:
        print(e)
        
asyncio.run(main())
