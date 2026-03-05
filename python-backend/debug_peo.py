import httpx
import asyncio
import json

async def test_peo_generation():
    url = "http://localhost:8001/ai/generate-peos"
    payload = {
        "program_name": "Computer Science and Engineering",
        "vision": "To be globally recognized for innovation-driven engineering education and societal impact.",
        "missions": [
            "To deliver outcome-based education through experiential learning and research-driven teaching.",
            "To cultivate ethical engineers capable of solving complex societal and technological challenges."
        ],
        "priorities": [
            "Artificial Intelligence",
            "Sustainable Development",
            "Entrepreneurship"
        ],
        "peo_count": 4
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
        print("Status Code:", response.status_code)
        print("Response JSON:")
        print(response.text)

if __name__ == "__main__":
    asyncio.run(test_peo_generation())
