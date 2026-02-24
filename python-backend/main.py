import os
import httpx
import json
import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    load_dotenv(".env.local")
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    load_dotenv("../.env.local")
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Warning: GEMINI_API_KEY not found")

class VMGenerateRequest(BaseModel):
    program_name: str
    institute_vision: str
    institute_mission: str
    vision_inputs: List[str]
    mission_inputs: List[str]
    mode: Optional[str] = "both"
    vision_count: Optional[int] = 1
    mission_count: Optional[int] = 1
    selected_program_vision: Optional[str] = ""

class VMGenerateResponse(BaseModel):
    vision: Optional[str] = None
    mission: Optional[str] = None
    visions: Optional[List[str]] = None
    missions: Optional[List[str]] = None

# Simple in-memory cache
ai_cache = {}

async def call_gemini_rest_async(prompt: str) -> str:
    if not api_key:
        raise Exception("GEMINI_API_KEY not found")
    
    # Check cache
    if prompt in ai_cache:
        return ai_cache[prompt]
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, headers=headers, json=data)
        if response.status_code != 200:
            raise Exception(f"Gemini API error: {response.text}")
        
        result = response.json()
        try:
            generated_text = result['candidates'][0]['content']['parts'][0]['text'].strip()
            ai_cache[prompt] = generated_text # Cache result
            return generated_text
        except (KeyError, IndexError):
            raise Exception("Unexpected response format from Gemini API")

@app.get("/")
async def root():
    return {"message": "AI Generation Backend (REST) is running with Async & Cache"}

@app.post("/ai/generate-vision-mission", response_model=VMGenerateResponse)
async def generate_vm(request: VMGenerateRequest):
    try:
        visions = []
        missions = []

        if request.mode in ['vision', 'both']:
            vision_prompt = f"""
You are an academic accreditation expert. Generate exactly {request.vision_count} distinct Program Vision statement(s).
Program: {request.program_name}
Institute Vision: {request.institute_vision}
Selected Focus Areas: {", ".join(request.vision_inputs)}
Rules: 1–2 lines per statement, Future-oriented, Professional tone.
Output must be a plain JSON array of strings containing ONLY the statements. Example: ["Vision 1", "Vision 2"]
            """
            vision_text = await call_gemini_rest_async(vision_prompt)
            print(f"DEBUG: Gemini Vision Raw Response -> {vision_text}")
            try:
                import re
                match = re.search(r'\[.*\]', vision_text, re.DOTALL)
                if match:
                    visions = json.loads(match.group(0))
                else:
                    raise Exception("No JSON array found")
            except Exception as e:
                print(f"DEBUG: Vision Parse Error -> {str(e)}")
                visions = [vision_text.replace('```json', '').replace('```', '').strip()]

        if request.mode in ['mission', 'both']:
            v_context = request.selected_program_vision if request.selected_program_vision else (visions[0] if visions else "")
            mission_prompt = f"""
You are an academic accreditation expert. Generate exactly {request.mission_count} distinct Program Mission formulation(s).
Program: {request.program_name}
Institute Mission: {request.institute_mission}
Program Vision: {v_context}
Selected Focus Areas: {", ".join(request.mission_inputs)}
Rules: 3–5 action sentences in one paragraph per mission. Align with Vision.
Output must be a plain JSON array of strings containing ONLY the mission statements. Example: ["Mission 1", "Mission 2"]
            """
            mission_text = await call_gemini_rest_async(mission_prompt)
            print(f"DEBUG: Gemini Mission Raw Response -> {mission_text}")
            try:
                import re
                match = re.search(r'\[.*\]', mission_text, re.DOTALL)
                if match:
                    missions = json.loads(match.group(0))
                else:
                    raise Exception("No JSON array found")
            except Exception as e:
                print(f"DEBUG: Mission Parse Error -> {str(e)}")
                missions = [mission_text.replace('```json', '').replace('```', '').strip()]

        return VMGenerateResponse(
            vision=visions[0] if visions else None,
            mission=missions[0] if missions else None,
            visions=visions,
            missions=missions
        )
        
    except Exception as e:
        print(f"CRITICAL ERROR generating VM: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback values
        fb_visions = [f"To be a center of excellence in {request.program_name} education, fostering innovation and professional ethics to meet global challenges."] * request.vision_count
        fb_missions = [f"We are committed to providing high-quality {request.program_name} education through experiential learning, industry collaboration, and research-led teaching. Our mission is to develop competent engineers who are equipped with technical skills, innovative mindset, and strong ethical values to contribute meaningfully to society and sustainable development."] * request.mission_count
        return VMGenerateResponse(
            vision=fb_visions[0], 
            mission=fb_missions[0],
            visions=fb_visions,
            missions=fb_missions
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
