import httpx
import asyncio
import json

async def test_peo_generation():
    payload = {
        "programName": "Computer Science and Engineering",
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
        "count": 4
    }
    
    url = "http://localhost:8001/api/v1/generate-peos"
    
    print("Testing /ai/generate-peos endpoint...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            print("Status Code:", response.status_code)
            print("Response JSON:")
            print(json.dumps(data, indent=2))
            
            peos = data.get("results", [])
            print(f"\\nGenerated {len(peos)} PEOs.")
            for i, peo in enumerate(peos):
                words = len(peo.split())
                print(f"PEO {i+1} ({words} words): {peo}")
                
            matrix = data.get("alignment_matrix", [])
            print(f"\\nAlignment Matrix: {matrix}")
            
        except httpx.HTTPError as e:
            print(f"HTTP Error: {e}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_peo_generation())
