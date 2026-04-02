import os
import json
import asyncio
from typing import Any, List, Optional, Dict
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from strategic_scoring import guard
from utils.auth import get_current_user, verify_program_context, AuthenticatedUser
from services.vm_service import VMService
from services.peo_service import PEOService
from services.pso_service import PSOService
from services.po_service import POService

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

# Configure AI Provider (OpenRouter)
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

if not api_key:
    print("Warning: API Key not found. Some AI features may be disabled.")

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
    program_id: Optional[str] = None

class VMGenerateResponse(BaseModel):
    vision_statements: List[Dict[str, Any]]
    mission_statements: List[Dict[str, Any]]
    alignment_score: int
    quality_summary: Dict[str, Any]

class PEOGenerateRequest(BaseModel):
    program_name: str
    vision: Optional[str] = ""
    missions: Optional[List[str]] = []
    priorities: List[str]
    count: Optional[int] = 4
    institution_context: Optional[str] = ""
    program_id: Optional[str] = None

class PEOGenerateResponse(BaseModel):
    results: List[str]
    quality: List[Dict[str, Any]]
    alignment_matrix: Optional[List[List[int]]] = None
    scores: Optional[Dict[str, Dict]] = None

class POGenerateRequest(BaseModel):
    program_name: str
    peos: List[str]
    count: Optional[int] = 12
    context: Optional[str] = ""
    program_id: Optional[str] = None

class POGenerateResponse(BaseModel):
    pos: List[str]
    mapping_matrix: List[List[int]]
    quality: List[Dict[str, Any]]

class PSOGenerateRequest(BaseModel):
    program_name: str
    vision: Optional[str] = ""
    missions: Optional[List[str]] = []
    peos: Optional[List[str]] = []
    priorities: List[str]
    count: Optional[int] = 3
    institution_context: Optional[str] = ""
    program_id: Optional[str] = None

class PSOGenerateResponse(BaseModel):
    results: List[Dict[str, Any]]
    validation: Dict[str, Any]

class LocalChatRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = "You are a helpful academic assistant."

class LocalChatResponse(BaseModel):
    text: str

class VisionValidateRequest(BaseModel):
    vision: str
    focus_areas: Optional[List[str]] = None

class MissionValidateRequest(BaseModel):
    mission_list: List[Dict[str, str]]
    vision: str

class PEOValidateRequest(BaseModel):
    statement: str
    priority: str
    program_name: str

class PSOValidateRequest(BaseModel):
    statement: str

# Initialize Governance Services
vm_service = VMService()
peo_service = PEOService()
pso_service = PSOService()
po_service = POService()

@app.post("/ai/local-chat", response_model=LocalChatResponse)
async def local_chat(request: LocalChatRequest) -> LocalChatResponse:
    try:
        from ml_engine import engine
        result = engine.generate_completion(request.prompt, request.system_prompt)
        return LocalChatResponse(text=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@app.get("/")
async def root() -> Dict[str, str]:
    return {"message": "AI Generation Backend (REST) is running with Async & Cache"}

@app.post("/api/v1/generate-vision-mission", response_model=VMGenerateResponse)
async def generate_vision_mission(
    request: VMGenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> VMGenerateResponse:
    """
    Production-grade orchestrated VM generation with Zero-Trust context locking.
    """
    verify_program_context(user, request.program_id)
    try:
        # 1. Prepare inputs
        program_name = request.program_name
        focus_areas = (request.vision_inputs or []) + (request.mission_inputs or [])
        custom_inputs = request.selected_program_vision or ""
        vision_count = request.vision_count or 1
        
        # 2. Heuristic discipline detection
        discipline = "Engineering"
        if "Computer" in program_name: discipline = "Computer Science and Engineering"
        elif "Mechanic" in program_name: discipline = "Mechanical Engineering"
        elif "Civil" in program_name: discipline = "Civil Engineering"
        elif "Electronics" in program_name or "Communication" in program_name: 
            discipline = "Electronics and Communication Engineering"

        # 3. Call Orchestrated Generation
        result = await vm_service.generate_orchestrated_vm(
            program_name=program_name,
            focus_areas=focus_areas,
            custom_inputs=custom_inputs,
            vision_count=vision_count,
            discipline=discipline,
            program_id=request.program_id
        )

        return VMGenerateResponse(**result)

    except Exception as e:
        print(f"CRITICAL ERROR in generate_vision_mission: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/generate-peos", response_model=PEOGenerateResponse)
async def generate_peos(
    request: PEOGenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> PEOGenerateResponse:
    verify_program_context(user, request.program_id)
    try:
        result = await peo_service.generate_peos(
            program_name=request.program_name,
            vision=request.vision or "",
            missions=request.missions or [],
            priorities=request.priorities or [],
            count=request.count or 4,
            institution_context=request.institution_context,
            program_id=request.program_id
        )
        return PEOGenerateResponse(**result)
    except Exception as e:
        print(f"CRITICAL ERROR generating PEOs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/generate-pos", response_model=POGenerateResponse)
async def generate_pos(
    request: POGenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> POGenerateResponse:
    verify_program_context(user, request.program_id)
    try:
        result = await po_service.generate_pos(
            program_name=request.program_name,
            peos=request.peos or [],
            count=request.count or 12,
            program_id=request.program_id
        )
        return POGenerateResponse(**result)
    except Exception as e:
        print(f"CRITICAL ERROR generating POs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/generate-psos", response_model=PSOGenerateResponse)
async def generate_psos(
    request: PSOGenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user)
) -> PSOGenerateResponse:
    verify_program_context(user, request.program_id)
    try:
        result = await pso_service.generate_psos(
            program_name=request.program_name,
            vision=request.vision or "",
            missions=request.missions or [],
            peos=request.peos or [],
            priorities=request.priorities or [],
            count=request.count or 3,
            program_id=request.program_id
        )
        return PSOGenerateResponse(**result)
    except Exception as e:
        print(f"CRITICAL ERROR generating PSOs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Validation Endpoints ---

@app.post("/api/v1/validate-vision")
async def validate_vision(request: VisionValidateRequest) -> Dict[str, Any]:
    try:
        return guard.validate_vision(request.vision, request.focus_areas)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/validate-mission")
async def validate_mission(request: MissionValidateRequest) -> Dict[str, Any]:
    try:
        return guard.validate_mission(request.mission_list, request.vision)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/validate-peo")
async def validate_peo(request: PEOValidateRequest) -> Dict[str, Any]:
    try:
        return guard.validate_peo(request.statement, request.priority, request.program_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/validate-pso")
async def validate_pso(request: PSOValidateRequest) -> Dict[str, Any]:
    try:
        return guard.validate_pso(request.statement)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
