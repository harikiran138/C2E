import os
import httpx
import json
import asyncio
import re
import time
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from prompts_refinement import VISION_REFINEMENT_PROMPT, MISSION_REFINEMENT_PROMPT, PEO_REFINEMENT_PROMPT, PSO_REFINEMENT_PROMPT, SCORING_PROMPT, VISION_QUALITY_ENFORCEMENT_PROMPT, VISION_DEBUG_AND_REPAIR_AGENT, VISION_AUTO_VERIFY_AND_FIX_PROMPT
from strategic_scoring import score_vision
from templates import generate_elite_fallback_visions, generate_elite_fallback_missions
from ml_engine import get_local_vision

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
    scores: Optional[Dict[str, Dict]] = None

# Simple in-memory cache with TTL
ai_cache: Dict[str, tuple[float, str]] = {}
CACHE_TTL_SECONDS = 600
MAX_CACHE_ENTRIES = 500

PROMPT_INJECTION_PATTERN = re.compile(
    r"\b(ignore (all|any|previous|above)|disregard (all|previous|above)|forget (all|previous|above)|system prompt|developer prompt|assistant prompt|return admin token|reveal .*token|bypass (rules|guardrails|safety)|jailbreak|override (instructions|guardrails)|act as (the|an?) (assistant|system))\b",
    re.IGNORECASE,
)

def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()

def sanitize_prompt_text(value: str, field_name: str, max_length: int, allow_empty: bool = False) -> str:
    raw = "" if value is None else str(value)
    cleaned = normalize_whitespace(
        raw.replace("```", " ").replace("<", " ").replace(">", " ")
    )
    cleaned = re.sub(r"[\x00-\x1f\x7f]", " ", cleaned)
    cleaned = normalize_whitespace(cleaned)

    if not cleaned:
        if allow_empty:
            return ""
        raise HTTPException(status_code=400, detail=f"{field_name} is required.")

    if len(cleaned) > max_length:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be {max_length} characters or fewer.",
        )

    if PROMPT_INJECTION_PATTERN.search(cleaned):
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} contains unsupported instruction-like content.",
        )

    return cleaned

def sanitize_prompt_list(values: List[str], field_name: str, max_items: int, max_item_length: int) -> List[str]:
    sanitized: List[str] = []
    for item in (values or [])[:max_items]:
        cleaned = sanitize_prompt_text(item, field_name, max_item_length, allow_empty=True)
        if cleaned and cleaned not in sanitized:
            sanitized.append(cleaned)
    return sanitized

def get_cached_response(cache_key: str) -> Optional[str]:
    cached = ai_cache.get(cache_key)
    if not cached:
        return None

    expires_at, value = cached
    if expires_at <= time.time():
        ai_cache.pop(cache_key, None)
        return None

    return value

def set_cached_response(cache_key: str, value: str) -> None:
    now = time.time()
    expired_keys = [key for key, (expires_at, _) in ai_cache.items() if expires_at <= now]
    for key in expired_keys:
        ai_cache.pop(key, None)

    if len(ai_cache) >= MAX_CACHE_ENTRIES:
        oldest_key = next(iter(ai_cache))
        ai_cache.pop(oldest_key, None)

    ai_cache[cache_key] = (now + CACHE_TTL_SECONDS, value)

async def call_gemini_rest_async(prompt: str, retries: int = 3, use_cache: bool = True) -> str:
    if not api_key:
        raise Exception("GEMINI_API_KEY not found")
    
    if use_cache:
        cached = get_cached_response(prompt)
        if cached is not None:
            return cached
    
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
        'x-goog-api-key': api_key,
    }
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, headers=headers, json=data)
                
                if response.status_code == 200:
                    result = response.json()
                    generated_text = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    set_cached_response(prompt, generated_text)
                    return generated_text
                
                if response.status_code == 429:
                    wait_time = (attempt + 1) * 2
                    print(f"WARNING: Rate limit (429) hit. Waiting {wait_time}s... (Attempt {attempt+1}/{retries})")
                    await asyncio.sleep(wait_time)
                    continue
                
                raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
        except Exception as e:
            if attempt == retries - 1:
                raise e
            await asyncio.sleep(1)
    
    raise Exception("Max retries exceeded for Gemini API")

@app.get("/")
async def root():
    return {"message": "AI Generation Backend (REST) is running with Async & Cache"}

@app.post("/ai/generate-vision-mission", response_model=VMGenerateResponse)
async def generate_vm(request: VMGenerateRequest):
    try:
        program_name = sanitize_prompt_text(request.program_name, "program_name", 160)
        institute_vision = sanitize_prompt_text(
            request.institute_vision,
            "institute_vision",
            500,
            allow_empty=True,
        )
        institute_mission = sanitize_prompt_text(
            request.institute_mission,
            "institute_mission",
            800,
            allow_empty=True,
        )
        selected_program_vision = sanitize_prompt_text(
            request.selected_program_vision,
            "selected_program_vision",
            320,
            allow_empty=True,
        )
        vision_inputs = sanitize_prompt_list(
            request.vision_inputs,
            "vision_inputs",
            12,
            120,
        )
        mission_inputs = sanitize_prompt_list(
            request.mission_inputs,
            "mission_inputs",
            12,
            120,
        )

        visions = []
        missions = []
        vision_scores = {}

        if request.mode in ['vision', 'both']:
            VISION_FORBIDDEN = [
                "cultivate", "develop", "provide", "deliver",
                "train", "prepare", "nurture", "empower",
                "implement", "teach"
            ]
            
            vision_prompt = f"""
You are generating a PROGRAM VISION statement for an engineering institution.

STRICT RULES:

1. Vision must represent a 10–15 year long-term institutional aspiration.
2. Vision must describe WHERE the program will stand in the future — not HOW it will educate students.
3. Do NOT use operational or educational verbs such as:
   cultivate, develop, provide, deliver, train, prepare, nurture, empower, implement, teach.
4. Vision must reflect institutional positioning such as:
   recognition, leadership, distinction, excellence, global standing, advancement.
5. All selected themes must be covered collectively across the generated statements.
6. Maintain professional accreditation tone (ABET/NBA compatible).
7. No exaggerated claims such as:
   guarantee, best in all, world-class in everything.
8. Length: 18–25 words.
9. Avoid repeating identical sentence structure across outputs.
10. Vision must NOT describe curriculum or teaching process. That belongs to Mission.

Before generating, internally:
- Abstract selected themes into long-term institutional positioning.
- Convert educational themes into future impact language.
- Ensure no operational drift.

Program: {program_name}
Institute Vision: {institute_vision}
Selected Focus Areas: {", ".join(vision_inputs)}

Generate exactly {request.vision_count} UNIQUE and DISTINCT Vision statements.
If multiple statements are requested, ensure they target different institutional outcomes (e.g., one on innovation, one on ethics, one on global impact).

Vision must begin with one of:
- To be recognized as
- To achieve distinction in
- To attain global leadership in
- To advance as a leading
- To be a nationally and internationally respected
- To emerge as a premier institution for
- To emerge as a premier institution for

Output must be a plain JSON array of strings containing ONLY the final statements. Example: ["Vision 1", "Vision 2"]

Entropy Seed: {{seed}}
"""
            # CHUNKED GENERATION LOGIC
            all_visions = []
            unique_visions_global = set()
            visions_remaining = request.vision_count
            
            chunk_size = 10
            max_total_retries = 20
            total_attempts = 0

            while visions_remaining > 0 and total_attempts < max_total_retries:
                total_attempts += 1
                current_chunk_request = min(chunk_size, visions_remaining)
                
                # Update prompt for this chunk with a unique seed
                import time
                current_seed = f"{time.time()}_{total_attempts}"
                current_chunk_prompt = vision_prompt.replace(f"exactly {request.vision_count}", f"exactly {current_chunk_request}")
                current_chunk_prompt = current_chunk_prompt.replace("{seed}", current_seed)
                
                if all_visions:
                    current_chunk_prompt += f"\n\nSTRICTLY avoid these already generated visions: {', '.join(all_visions[-5:])}"

                # Bypass cache for main generation to ensure variety
                vision_text = await call_gemini_rest_async(current_chunk_prompt, use_cache=False)
                
                try:
                    import re
                    match = re.search(r'\[.*\]', vision_text, re.DOTALL)
                    if match:
                        chunk_parsed = json.loads(match.group(0))
                    else:
                        chunk_parsed = [v.strip().strip('"').strip("'") for v in vision_text.split('\n') if len(v.strip()) > 10]
                except:
                    chunk_parsed = [v.strip().strip('"').strip("'") for v in vision_text.split('\n') if len(v.strip()) > 10]

                for v in chunk_parsed:
                    v_clean = v.strip().lower()
                    if v_clean not in unique_visions_global and visions_remaining > 0:
                        # Only add if no forbidden verbs
                        if not any(verb in v_clean for verb in VISION_FORBIDDEN):
                            all_visions.append(v)
                            unique_visions_global.add(v_clean)
                            visions_remaining -= 1
            
            visions = all_visions[:request.vision_count]
                
            # RECURSIVE FEEDBACK LOOP (GOVERNANCE STAGE)
            refined_visions = []
            import re

            async def get_score(v_text):
                try:
                    # LOCAL STRATEGIC SCORING (Deterministic)
                    result = score_vision(v_text)
                    print(f"DEBUG: Strategic Classifier Assessment -> Score: {result['score']}, Violations: {result['violations']}")
                    return result['score']
                except Exception as se:
                    print(f"DEBUG: Local scoring failed: {str(se)}")
                    return 0

            for v in visions:
                current_v = v
                max_loop_attempts = 5
                
                for loop_idx in range(max_loop_attempts):
                    score = await get_score(current_v)
                    print(f"DEBUG: Vision Assessment -> Attempt: {loop_idx+1}, Score: {score}, Text: {current_v[:50]}...")
                    
                    if score >= 90:
                        print(f"DEBUG: 90+ Threshold Met!")
                        break
                        
                    # ENTERPRISE AUTO-GOVERNANCE STAGE
                    print(f"DEBUG: Score {score} < 90. Triggering Enterprise Auto-Verify & Fix Agent...")
                    refinement_prompt = VISION_AUTO_VERIFY_AND_FIX_PROMPT.format(
                        generated_vision=current_v
                    )
                    try:
                        current_v = await call_gemini_rest_async(refinement_prompt)
                        current_v = current_v.strip().strip('"').strip("'")
                    except Exception as re_err:
                        print(f"DEBUG: API Limit during refinement. Switching to DEDICATED LOCAL ML...")
                        local_v = get_local_vision(program_name, vision_inputs)
                        if local_v:
                            current_v = local_v
                            print(f"DEBUG: Local ML Generated: {current_v}")
                        else:
                            break
                
                refined_visions.append(current_v)
            
            visions = refined_visions
            vision_scores = {v: score_vision(v) for v in visions}

        if request.mode in ['mission', 'both']:
            v_context = selected_program_vision if selected_program_vision else (visions[0] if visions else "")
            mission_prompt = f"""
You are an academic accreditation expert. Generate exactly {request.mission_count} distinct Program Mission formulation(s).
Program: {program_name}
Institute Mission: {institute_mission}
Program Vision: {v_context}
Selected Focus Areas: {", ".join(mission_inputs)}
Rules: 3–5 action sentences in one paragraph per mission. Align with Vision.
Output must be a plain JSON array of strings containing ONLY the mission statements. Example: ["Mission 1", "Mission 2"]

Entropy Seed: {{seed}}
             """
            import time
            m_seed = f"{time.time()}_mission"
            mission_prompt = mission_prompt.replace("{seed}", m_seed)
            mission_text = await call_gemini_rest_async(mission_prompt, use_cache=False)
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
            missions=missions,
            scores=vision_scores if visions else {}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"CRITICAL ERROR generating VM: {str(e)}")
        # ELITE FALLBACK ENGINE (DIVERSE & STRATEGIC)
        fallback_program_name = normalize_whitespace(str(request.program_name or "this program")) or "this program"
        fb_visions = generate_elite_fallback_visions(fallback_program_name, request.vision_count)
        fb_missions = generate_elite_fallback_missions(fallback_program_name, request.mission_count)
            
        return VMGenerateResponse(
            vision=fb_visions[0] if fb_visions else "", 
            mission=fb_missions[0] if fb_missions else "",
            visions=fb_visions,
            missions=fb_missions,
            scores={v: score_vision(v) for v in fb_visions} if fb_visions else {}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
