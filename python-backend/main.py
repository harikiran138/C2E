import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try reading from .env.local in current directory (root) or parent if running from subfolder
    load_dotenv(".env.local")
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    # Fallback for when running from within python-backend/
    load_dotenv("../.env.local")
    api_key = os.getenv("GEMINI_API_KEY")

if api_key:
    genai.configure(api_key=api_key)
else:
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

@app.get("/")
async def root():
    return {"message": "AI Generation Backend is running"}

@app.post("/ai/generate-vision-mission", response_model=VMGenerateResponse)
async def generate_vm(request: VMGenerateRequest):
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # 1. Generate Vision
        vision_prompt = f"""
You are an academic accreditation expert.

Generate a Program Vision for:
Program: {request.program_name}

Institute Vision:
{request.institute_vision}

Selected Focus Areas:
{", ".join(request.vision_inputs)}

Rules:
- 1–2 lines only
- Future-oriented
- Globally relevant
- Suitable for ANY engineering institution
- Professional tone
- Accreditation ready
- Return ONLY the vision statement text.
        """
        
        vision_response = model.generate_content(vision_prompt)
        generated_vision = vision_response.text.strip()
        
        # 2. Generate Mission
        mission_prompt = f"""
You are an academic accreditation expert.

Generate a Program Mission.

Program: {request.program_name}

Institute Mission:
{request.institute_mission}

Program Vision:
{generated_vision}

Selected Focus Areas:
{", ".join(request.mission_inputs)}

Rules:
- 3–5 action-driven statements merged into one paragraph
- Reflect education quality + skills + innovation + ethics
- Must align with Vision
- Must reflect selected priorities
- Suitable for ANY institution
- Return ONLY the mission paragraph text.
        """
        
        mission_response = model.generate_content(mission_prompt)
        generated_mission = mission_response.text.strip()
        
        return VMGenerateResponse(
            vision=generated_vision,
            mission=generated_mission
        )
        
    except Exception as e:
        print(f"Error generating VM: {str(e)}")
        # Simple fallback logic if API fails
        fallback_vision = f"To be a center of excellence in {request.program_name} education, fostering innovation and professional ethics to meet global challenges."
        fallback_mission = f"We are committed to providing high-quality {request.program_name} education through experiential learning, industry collaboration, and research-led teaching. Our mission is to develop competent engineers who are equipped with technical skills, innovative mindset, and strong ethical values to contribute meaningfully to society and sustainable development."
        
        return VMGenerateResponse(
            vision=fallback_vision,
            mission=fallback_mission
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
