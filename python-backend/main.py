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
from prompts.refinement import VISION_REFINEMENT_PROMPT, MISSION_REFINEMENT_PROMPT, PEO_REFINEMENT_PROMPT, PSO_REFINEMENT_PROMPT, SCORING_PROMPT, VISION_QUALITY_ENFORCEMENT_PROMPT, VISION_DEBUG_AND_REPAIR_AGENT, VISION_AUTO_VERIFY_AND_FIX_PROMPT
from strategic_scoring import score_vision
from templates import generate_elite_fallback_missions
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

# Simple in-memory cache
ai_cache = {}

VISION_APPROVAL_THRESHOLD = 90
VISION_MAX_REPAIR_ATTEMPTS = 3
VISION_SIMILARITY_THRESHOLD = 0.75
VISION_STARTERS = [
    "To be globally recognized for",
    "To emerge as",
    "To achieve distinction in",
    "To advance as a leading",
    "To be globally respected for",
]


def normalize_whitespace(text: str) -> str:
    return " ".join((text or "").split()).strip()


def extract_tokens(text: str) -> List[str]:
    normalized = normalize_whitespace(text).lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", normalized)
    return [token for token in cleaned.split() if len(token) >= 4]


def vision_similarity(a: str, b: str) -> float:
    tokens_a = set(extract_tokens(a))
    tokens_b = set(extract_tokens(b))
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = len(tokens_a.intersection(tokens_b))
    union = len(tokens_a.union(tokens_b))
    return intersection / union if union else 0.0


def get_vision_starter(statement: str) -> str:
    lower = normalize_whitespace(statement).lower()
    ordered = sorted(VISION_STARTERS, key=len, reverse=True)
    for starter in ordered:
        if lower.startswith(starter.lower()):
            return starter
    return ""


def strip_vision_starter(statement: str) -> str:
    cleaned = normalize_whitespace(statement).rstrip(".")
    ordered = sorted(VISION_STARTERS, key=len, reverse=True)
    lower = cleaned.lower()
    for starter in ordered:
        if lower.startswith(starter.lower()):
            return cleaned[len(starter):].strip()
    return cleaned


def rewrite_vision_starter(statement: str, starter: str) -> str:
    body = strip_vision_starter(statement)
    if not body:
        body = "long-term institutional distinction through strategic innovation and sustainable societal contribution"
    return normalize_whitespace(f"{starter} {body}.")


def to_strategic_focus_phrase(focus_inputs: List[str]) -> str:
    if not focus_inputs:
        return "institutional leadership, innovation leadership, and sustainable societal contribution"

    cleaned: List[str] = []
    for raw in focus_inputs[:3]:
        item = normalize_whitespace(str(raw).lower())
        if re.search(r"\b(global|international|benchmark)\b", item):
            cleaned.append("global standards")
            continue
        if re.search(r"\b(innovation|technology|entrepreneur)\b", item):
            cleaned.append("innovation leadership")
            continue
        if re.search(r"\b(ethic|integrity|professional|responsibility)\b", item):
            cleaned.append("ethical leadership")
            continue
        if re.search(r"\b(sustain|societ|social|community)\b", item):
            cleaned.append("sustainable societal contribution")
            continue
        if re.search(r"\b(outcome|education|teaching|learning|curriculum|pedagogy|classroom)\b", item):
            cleaned.append("scholarly standards")
            continue

        compact = " ".join(item.split()[:3]).strip()
        if compact:
            cleaned.append(compact)

    cleaned = list(dict.fromkeys(cleaned))

    if not cleaned:
        return "institutional leadership, innovation leadership, and sustainable societal contribution"
    if len(cleaned) == 1:
        return cleaned[0]
    if len(cleaned) == 2:
        return f"{cleaned[0]} and {cleaned[1]}"
    return f"{cleaned[0]}, {cleaned[1]}, and {cleaned[2]}"


def build_deterministic_vision(program_name: str, focus_inputs: List[str], index: int) -> str:
    focus_phrase = to_strategic_focus_phrase(focus_inputs)
    templates = [
        f"To be globally recognized for long-term {program_name} distinction through {focus_phrase} with sustained societal and professional relevance.",
        f"To emerge as a long-horizon {program_name} benchmark for globally respected distinction through {focus_phrase} and enduring strategic relevance.",
        f"To achieve distinction in {program_name} through sustained {focus_phrase} and long-term institutional contribution.",
        f"To advance as a leading {program_name} program through sustained {focus_phrase}, institutional leadership, and enduring strategic contribution.",
        f"To be globally respected for sustained {program_name} excellence through {focus_phrase} with long-horizon societal relevance.",
    ]
    return templates[index % len(templates)]


def build_safe_diversity_vision(program_name: str, index: int) -> str:
    templates = [
        f"To be globally recognized for long-term {program_name} distinction through institutional leadership, innovation foresight, and sustainable societal contribution.",
        f"To emerge as a long-horizon {program_name} benchmark for globally respected distinction through strategic innovation leadership and enduring public value.",
        f"To achieve distinction in {program_name} through sustained institutional leadership, responsible innovation, and long-term societal contribution.",
        f"To advance as a leading {program_name} program through strategic distinction, institutional leadership, and enduring professional and societal relevance.",
        f"To be globally respected for sustained {program_name} excellence through ethical institutional leadership, innovation strength, and long-horizon societal value.",
    ]
    return templates[index % len(templates)]


def enforce_vision_diversity(visions: List[str], program_name: str, focus_inputs: List[str]) -> List[str]:
    diversified: List[str] = []
    used_starters = set()

    for idx, statement in enumerate(visions):
        candidate = normalize_whitespace(statement)
        attempts = 0

        while attempts < 6:
            starter = VISION_STARTERS[(idx + attempts) % len(VISION_STARTERS)]
            candidate = rewrite_vision_starter(candidate, starter)
            score_info = score_vision(candidate)
            starter_key = get_vision_starter(candidate)
            repeated_starter = starter_key in used_starters if starter_key else False
            too_similar = any(
                vision_similarity(candidate, existing) > VISION_SIMILARITY_THRESHOLD
                for existing in diversified
            )

            if (
                score_info["score"] >= VISION_APPROVAL_THRESHOLD
                and not score_info.get("hard_fail")
                and not repeated_starter
                and not too_similar
            ):
                break

            candidate = build_deterministic_vision(program_name, focus_inputs, idx + attempts + len(visions))
            attempts += 1

        final_check = score_vision(candidate)
        final_starter = get_vision_starter(candidate)
        final_too_similar = any(
            vision_similarity(candidate, existing) > VISION_SIMILARITY_THRESHOLD
            for existing in diversified
        )
        if (
            final_check["score"] < VISION_APPROVAL_THRESHOLD
            or final_check.get("hard_fail")
            or (final_starter in used_starters if final_starter else False)
            or final_too_similar
        ):
            replacement = candidate
            for safety_idx in range(len(VISION_STARTERS) * 3):
                safe_candidate = build_safe_diversity_vision(program_name, idx + safety_idx)
                safe_starter = get_vision_starter(safe_candidate)
                safe_too_similar = any(
                    vision_similarity(safe_candidate, existing) > VISION_SIMILARITY_THRESHOLD
                    for existing in diversified
                )
                safe_score = score_vision(safe_candidate)
                if (
                    safe_score["score"] >= VISION_APPROVAL_THRESHOLD
                    and not safe_score.get("hard_fail")
                    and (safe_starter not in used_starters if safe_starter else True)
                    and not safe_too_similar
                ):
                    replacement = safe_candidate
                    break
            candidate = replacement

        diversified.append(candidate)
        starter_key = get_vision_starter(candidate)
        if starter_key:
            used_starters.add(starter_key)

    return diversified

async def call_gemini_rest_async(prompt: str, retries: int = 3, use_cache: bool = True) -> str:
    if not api_key:
        raise Exception("GEMINI_API_KEY not found")
    
    if use_cache and prompt in ai_cache:
        return ai_cache[prompt]
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
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
                    ai_cache[prompt] = generated_text
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
        visions = []
        missions = []
        vision_scores = {}

        if request.mode in ['vision', 'both']:
            vision_prompt = f"""
You are generating a PROGRAM VISION statement for an engineering institution.

STRICT RULES:

1. Vision must represent a 10–15 year long-term institutional aspiration.
2. Vision must describe WHERE the program will stand in the future — not HOW it will educate students.
3. Do NOT use operational/process language: education, teaching, learning, curriculum, pedagogy, provide, deliver, develop, cultivate, train, prepare, implement, foster.
4. Each Vision must contain exactly ONE global positioning phrase:
   - globally recognized
   - globally respected
   - global leadership
   - global distinction
   - leading advancement
5. Do not stack multiple global/international phrases in one statement.
6. Limit each Vision to maximum 3 strategic pillars.
7. Maintain professional accreditation tone (ABET/NBA compatible).
8. No exaggerated claims such as guarantee, best in all, world-class in everything.
9. Length: 15–25 words.
10. Each Vision must use a different opening phrase and distinct structural framing.
11. If similarity between two Vision statements is above 70%, rewrite the weaker one.
12. Vision must NOT describe curriculum or teaching process. That belongs to Mission.

Before generating, internally:
- Abstract selected themes into long-term institutional positioning.
- Convert educational themes into future impact language.
- Ensure no operational drift.

Program: {request.program_name}
Institute Vision: {request.institute_vision}
Selected Focus Areas: {", ".join(request.vision_inputs)}

Generate exactly {request.vision_count} UNIQUE and DISTINCT Vision statements.
If multiple statements are requested, ensure they target different institutional outcomes (e.g., one on innovation, one on ethics, one on global impact).

Vision must begin with one of:
- To be globally recognized for
- To emerge as
- To achieve distinction in
- To advance as a leading
- To be globally respected for

Output must be a plain JSON array of strings containing ONLY the final statements. Example: ["Vision 1", "Vision 2"]

Entropy Seed: {{seed}}
"""
            # CHUNKED GENERATION LOGIC
            all_visions = []
            unique_visions_global = set()
            visions_remaining = max(1, request.vision_count)
            
            chunk_size = 10
            max_total_retries = 20
            total_attempts = 0

            while visions_remaining > 0 and total_attempts < max_total_retries:
                total_attempts += 1
                current_chunk_request = min(chunk_size, visions_remaining)
                
                # Update prompt for this chunk with a unique seed
                current_seed = f"{time.time()}_{total_attempts}"
                current_chunk_prompt = vision_prompt.replace(f"exactly {request.vision_count}", f"exactly {current_chunk_request}")
                current_chunk_prompt = current_chunk_prompt.replace("{seed}", current_seed)
                
                if all_visions:
                    current_chunk_prompt += f"\n\nSTRICTLY avoid these already generated visions: {', '.join(all_visions[-5:])}"

                # Bypass cache for main generation to ensure variety
                vision_text = await call_gemini_rest_async(current_chunk_prompt, use_cache=False)
                
                try:
                    match = re.search(r'\[.*\]', vision_text, re.DOTALL)
                    if match:
                        chunk_parsed = json.loads(match.group(0))
                    else:
                        chunk_parsed = [v.strip().strip('"').strip("'") for v in vision_text.split('\n') if len(v.strip()) > 10]
                except:
                    chunk_parsed = [v.strip().strip('"').strip("'") for v in vision_text.split('\n') if len(v.strip()) > 10]

                for v in chunk_parsed:
                    v_clean = normalize_whitespace(v)
                    v_key = v_clean.lower()
                    if not v_clean or v_key in unique_visions_global or visions_remaining <= 0:
                        continue

                    too_similar = any(
                        vision_similarity(v_clean, existing) > VISION_SIMILARITY_THRESHOLD
                        for existing in all_visions
                    )
                    if too_similar:
                        continue

                    assessment = score_vision(v_clean)
                    if assessment.get("hard_fail"):
                        continue

                    all_visions.append(v_clean)
                    unique_visions_global.add(v_key)
                    visions_remaining -= 1

            while len(all_visions) < request.vision_count:
                deterministic = build_deterministic_vision(request.program_name, request.vision_inputs, len(all_visions))
                d_key = deterministic.lower()
                if d_key not in unique_visions_global:
                    all_visions.append(deterministic)
                    unique_visions_global.add(d_key)
            
            visions = all_visions[:request.vision_count]
                
            # RECURSIVE FEEDBACK LOOP (GOVERNANCE STAGE)
            refined_visions = []
            for idx, v in enumerate(visions):
                current_v = normalize_whitespace(v)

                for loop_idx in range(VISION_MAX_REPAIR_ATTEMPTS):
                    assessment = score_vision(current_v)
                    print(
                        f"DEBUG: Vision Assessment -> Attempt: {loop_idx+1}, Score: {assessment['score']}, "
                        f"HardFail: {assessment.get('hard_fail')}, Text: {current_v[:50]}..."
                    )

                    if assessment["score"] >= VISION_APPROVAL_THRESHOLD and not assessment.get("hard_fail"):
                        break

                    print(
                        f"DEBUG: Score {assessment['score']} < {VISION_APPROVAL_THRESHOLD}. "
                        "Triggering Auto-Verify & Fix Agent..."
                    )
                    refinement_prompt = VISION_AUTO_VERIFY_AND_FIX_PROMPT.format(
                        generated_vision=current_v
                    )
                    try:
                        repaired = await call_gemini_rest_async(refinement_prompt, use_cache=False)
                        repaired = normalize_whitespace(repaired.strip().strip('"').strip("'"))
                        if repaired:
                            current_v = repaired
                    except Exception:
                        print("DEBUG: API limitation during refinement. Attempting local fallback generation...")
                        local_v = get_local_vision(request.program_name, request.vision_inputs)
                        if local_v:
                            current_v = normalize_whitespace(local_v)
                        else:
                            break

                final_assessment = score_vision(current_v)
                if final_assessment["score"] < VISION_APPROVAL_THRESHOLD or final_assessment.get("hard_fail"):
                    deterministic = build_deterministic_vision(request.program_name, request.vision_inputs, idx)
                    deterministic_assessment = score_vision(deterministic)
                    if deterministic_assessment["score"] >= VISION_APPROVAL_THRESHOLD and not deterministic_assessment.get("hard_fail"):
                        current_v = deterministic
                    else:
                        current_v = build_safe_diversity_vision(request.program_name, idx)

                refined_visions.append(current_v)

            diversified = enforce_vision_diversity(refined_visions, request.program_name, request.vision_inputs)

            # Deterministic fill if diversity filtering reduced count.
            fill_cursor = request.vision_count
            while len(diversified) < request.vision_count:
                candidate = build_deterministic_vision(request.program_name, request.vision_inputs, fill_cursor)
                fill_cursor += 1
                if any(vision_similarity(candidate, existing) > VISION_SIMILARITY_THRESHOLD for existing in diversified):
                    continue
                diversified.append(candidate)

            visions = diversified[:request.vision_count]
            vision_scores = {v: score_vision(v) for v in visions}

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

Entropy Seed: {{seed}}
             """
            m_seed = f"{time.time()}_mission"
            mission_prompt = mission_prompt.replace("{seed}", m_seed)
            mission_text = await call_gemini_rest_async(mission_prompt, use_cache=False)
            print(f"DEBUG: Gemini Mission Raw Response -> {mission_text}")
            try:
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
        
    except Exception as e:
        print(f"CRITICAL ERROR generating VM: {str(e)}")
        # Deterministic strict fallback for Vision governance.
        fb_visions = []
        for idx in range(max(1, request.vision_count)):
            candidate = build_deterministic_vision(request.program_name, request.vision_inputs, idx)
            assessment = score_vision(candidate)
            if assessment["score"] < VISION_APPROVAL_THRESHOLD or assessment.get("hard_fail"):
                candidate = build_safe_diversity_vision(request.program_name, idx)
            fb_visions.append(candidate)

        fb_visions = enforce_vision_diversity(fb_visions, request.program_name, request.vision_inputs)

        fb_missions = generate_elite_fallback_missions(request.program_name, request.mission_count)
            
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
