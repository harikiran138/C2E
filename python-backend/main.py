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

class VMGenerateResponse(BaseModel):
    vision: str
    mission: str

# Simple in-memory cache
ai_cache = {}

async def call_gemini_rest_async(prompt: str) -> str:
    if not api_key:
        raise Exception("GEMINI_API_KEY not found")
    
    # Check cache
    if prompt in ai_cache:
        return ai_cache[prompt]
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
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
        # 1. Prepare Prompts
        vision_prompt = f"""
You are an academic accreditation expert. Generate a Program Vision for:
Program: {request.program_name}
Institute Vision: {request.institute_vision}
Selected Focus Areas: {", ".join(request.vision_inputs)}
Rules: 1–2 lines, Future-oriented, Professional tone. Return ONLY the vision statement.
        """
        
        # Note: Mission prompt depends on vision, but we can generate them slightly differently 
        # or use a default vision if we want full parallel. 
        # For better quality, mission usually needs vision.
        
        generated_vision = await call_gemini_rest_async(vision_prompt)
        
        mission_prompt = f"""
You are an academic accreditation expert. Generate a Program Mission paragraph.
Program: {request.program_name}
Institute Mission: {request.institute_mission}
Program Vision: {generated_vision}
Selected Focus Areas: {", ".join(request.mission_inputs)}
Rules: 3–5 action sentences in one paragraph. Align with Vision. Return ONLY the mission.
        """
        
        generated_mission = await call_gemini_rest_async(mission_prompt)
        
        return VMGenerateResponse(vision=generated_vision, mission=generated_mission)
        
    except Exception as e:
        print(f"Error generating VM: {str(e)}")
        # Fallback values
        fb_vision = f"To be a center of excellence in {request.program_name} education, fostering innovation and professional ethics to meet global challenges."
        fb_mission = f"We are committed to providing high-quality {request.program_name} education through experiential learning, industry collaboration, and research-led teaching. Our mission is to develop competent engineers who are equipped with technical skills, innovative mindset, and strong ethical values to contribute meaningfully to society and sustainable development."
        return VMGenerateResponse(vision=fb_vision, mission=fb_mission)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
