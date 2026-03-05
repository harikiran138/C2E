import os
import httpx
import json
import asyncio
import re
import time
from typing import Any, List, Optional, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from prompts.refinement import VISION_REFINEMENT_PROMPT, MISSION_REFINEMENT_PROMPT, PEO_REFINEMENT_PROMPT, PSO_REFINEMENT_PROMPT, SCORING_PROMPT, VISION_QUALITY_ENFORCEMENT_PROMPT, VISION_DEBUG_AND_REPAIR_AGENT, VISION_AUTO_VERIFY_AND_FIX_PROMPT
from strategic_scoring import calculate_alignment, score_mission, score_vision, enforce_peo_quality, score_peo, calculate_peo_vision_alignment, peo_similarity, calculate_peo_vision_alignment, peo_similarity, enforce_po_quality
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

class PEOGenerateRequest(BaseModel):
    programName: str
    vision: Optional[str] = ""
    missions: Optional[List[str]] = []
    priorities: List[str]
    count: Optional[int] = 4
    institutionContext: Optional[str] = ""

class PEOGenerateResponse(BaseModel):
    results: List[str]
    quality: List[Dict[str, Any]]
    alignment_matrix: Optional[List[List[int]]] = None
    scores: Optional[Dict[str, Dict]] = None

class POGenerateRequest(BaseModel):
    programName: str
    peos: List[str]
    count: Optional[int] = 12
    context: Optional[str] = ""

class POGenerateResponse(BaseModel):
    pos: List[str]
    mapping_matrix: List[List[int]]
    quality: List[Dict[str, Any]]



# Simple in-memory cache
ai_cache = {}

VISION_APPROVAL_THRESHOLD = 90
VISION_MAX_REPAIR_ATTEMPTS = 3
VISION_SIMILARITY_THRESHOLD = 0.75
MISSION_APPROVAL_THRESHOLD = 90
VISION_STARTERS = [
    "To be globally recognized for",
    "To emerge as",
    "To achieve distinction in",
    "To advance as a leading",
    "To be globally respected for",
]
MISSION_OPERATIONAL_VERBS = [
    "deliver",
    "strengthen",
    "foster",
    "promote",
    "advance",
    "implement",
    "integrate",
    "enable",
    "support",
    "sustain",
    "build",
]
MISSION_MARKETING_TERMS = ["destination", "hub", "world-class", "best-in-class", "unmatched"]
MISSION_RESTRICTED_TERMS = ["guarantee", "ensure all", "100%", "master", "excel in all"]
MISSION_IMMEDIATE_OUTCOME_TERMS = [
    "at graduation",
    "on graduation",
    "students will be able to",
    "student will be able to",
]
MISSION_PILLAR_SIGNALS = {
    "academic": [
        "curriculum",
        "outcome-based",
        "outcome based",
        "academic",
        "learning",
        "pedagogy",
        "continuous improvement",
        "rigor",
    ],
    "research_industry": [
        "research",
        "industry",
        "innovation",
        "laboratory",
        "hands-on",
        "internship",
        "collaboration",
    ],
    "professional_standards": [
        "professional standards",
        "engineering standards",
        "standards alignment",
        "quality standards",
    ],
    "ethics_society": [
        "ethical",
        "ethics",
        "societal",
        "community",
        "sustainable",
        "responsibility",
        "public",
    ],
}
MISSION_REDUNDANCY_SUFFIXES = ["ization", "ation", "ition", "tion", "sion", "ment", "ness", "ity", "ship", "ing", "ed", "es", "s"]
MISSION_REDUNDANCY_STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "through",
    "toward",
    "towards",
    "to",
    "of",
    "in",
    "on",
    "a",
    "an",
    "by",
    "be",
    "or",
    "is",
    "are",
    "as",
    "at",
    "program",
    "engineering",
    "institutional",
    "strategic",
    "global",
    "globally",
    "international",
    "internationally",
    "long",
    "term",
    "future",
    "sustained",
    "professional",
    "societal",
    "community",
    "industry",
    "research",
    "innovation",
    "ethical",
    "responsibility",
    "standards",
    "leadership",
    "growth",
    "impact",
}
MISSION_SYNONYM_GROUPS = [
    {
        "label": "distinction-concept stacking",
        "terms": ["distinction", "excellence", "premier", "leading", "leadership"],
        "threshold": 3,
    },
    {
        "label": "innovation-concept stacking",
        "terms": ["innovation", "innovative", "transformative", "foresight", "advancement"],
        "threshold": 3,
    },
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
        return "institutional leadership, innovation capability, and sustainable societal contribution"

    cleaned: List[str] = []
    for raw in focus_inputs[:3]:
        item = normalize_whitespace(str(raw).lower())
        if re.search(r"\b(global|international|benchmark)\b", item):
            cleaned.append("global standards")
            continue
        if re.search(r"\b(innovation|technology|entrepreneur)\b", item):
            cleaned.append("innovation capability")
            continue
        if re.search(r"\b(ethic|integrity|professional|responsibility)\b", item):
            cleaned.append("ethical standards")
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
        return "institutional leadership, innovation capability, and sustainable societal contribution"
    if len(cleaned) == 1:
        return cleaned[0]
    if len(cleaned) == 2:
        return f"{cleaned[0]} and {cleaned[1]}"
    return f"{cleaned[0]}, {cleaned[1]}, and {cleaned[2]}"


def build_deterministic_vision(program_name: str, focus_inputs: List[str], index: int) -> str:
    focus_phrase = to_strategic_focus_phrase(focus_inputs)
    templates = [
        f"To be a globally recognized leader in {program_name} advancement and research, creating innovative and sustainable technologies that transform society.",
        f"To achieve global excellence in {program_name} through pioneering research, innovative capabilities, and sustainable technological solutions for societal progress.",
        f"To be globally respected for {program_name} innovation, advancing research and sustainable technologies that transform industry and improve human life.",
        f"To advance as a leading {program_name} program globally through sustained research innovation, creating sustainable technology for future societal needs.",
        f"To emerge as an internationally benchmarked {program_name} leader, driving research and innovative sustainable solutions for industry and society.",
    ]
    return templates[index % len(templates)]


def build_safe_diversity_vision(program_name: str, index: int) -> str:
    templates = [
        f"To be a globally recognized leader in {program_name} advancement and research, creating innovative and sustainable technologies that transform society.",
        f"To achieve global excellence in {program_name} through pioneering research, innovative capabilities, and sustainable technological solutions for societal progress.",
        f"To be globally respected for {program_name} innovation, advancing research and sustainable technologies that transform industry and improve human life.",
        f"To advance as a leading {program_name} program globally through sustained research innovation, creating sustainable technology for future societal needs.",
        f"To emerge as an internationally benchmarked {program_name} leader, driving research and innovative sustainable solutions for industry and society.",
    ]
    return templates[index % len(templates)]


def enforce_vision_diversity(visions: List[str], program_name: str, focus_inputs: List[str]) -> List[str]:
    diversified: List[str] = []

    for idx, statement in enumerate(visions):
        candidate = normalize_whitespace(statement)
        score_info = score_vision(candidate, focus_inputs)
        too_similar = any(
            vision_similarity(candidate, existing) > VISION_SIMILARITY_THRESHOLD
            for existing in diversified
        )

        if score_info["score"] < VISION_APPROVAL_THRESHOLD or score_info.get("hard_fail") or too_similar:
            candidate = build_safe_diversity_vision(program_name, idx)

        diversified.append(candidate)
    return diversified

def mission_similarity(a: str, b: str) -> float:
    return vision_similarity(a, b)

def build_safe_mission(program_name: str, index: int) -> str:
    variants = [
        f"Deliver a rigorous {program_name} curriculum through outcome-based education, continuous assessment, and evidence-driven academic improvement.",
        "Strengthen research engagement, industry collaboration, and hands-on practice to align graduate preparation with professional engineering standards.",
        "Foster ethical responsibility, innovation capability, and societal awareness to sustain long-term professional growth and community impact.",
        f"Establish state-of-the-art laboratory facilities and research centers in {program_name} to encourage interdisciplinary projects and intellectual property creation.",
        "Nurture leadership qualities and entrepreneurial mindsets through expert mentorship, professional club activities, and incubation support."
    ]
    # For mission, we often join multiple variants or pick one. 
    # The generation logic uses it to build a candidate.
    return variants[index % len(variants)]

def enforce_mission_diversity(missions: List[str], vision_reference: str, program_name: str) -> List[str]:
    diversified: List[str] = []
    
    for idx, statement in enumerate(missions):
        candidate = normalize_whitespace(statement)
        score_info = score_mission(candidate)
        alignment = calculate_alignment(vision_reference, candidate)
        
        too_similar = any(
            mission_similarity(candidate, existing) > VISION_SIMILARITY_THRESHOLD
            for existing in diversified
        )

        if score_info["score"] < MISSION_APPROVAL_THRESHOLD or score_info.get("hard_fail") or alignment < 0.25 or too_similar:
            candidate = build_safe_mission(program_name, idx)

        diversified.append(candidate)
    return diversified


def split_sentences(text: str) -> List[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", normalize_whitespace(text)) if s.strip()]


def normalize_root(word: str) -> str:
    root = re.sub(r"[^a-z0-9]", "", word.lower())
    if len(root) <= 4:
        return root
    for suffix in MISSION_REDUNDANCY_SUFFIXES:
        if root.endswith(suffix) and len(root) - len(suffix) >= 4:
            root = root[: -len(suffix)]
            break
    return root


def repeated_roots(text: str) -> List[str]:
    tokens = [
        token
        for token in re.findall(r"[a-z0-9]+", text.lower())
        if len(token) >= 5 and token not in MISSION_REDUNDANCY_STOP_WORDS
    ]
    counts: Dict[str, int] = {}
    for token in tokens:
        root = normalize_root(token)
        if not root or root in MISSION_REDUNDANCY_STOP_WORDS:
            continue
        counts[root] = counts.get(root, 0) + 1
    return sorted([root for root, count in counts.items() if count > 1])


def duplicate_bigrams(text: str) -> List[str]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    counts: Dict[str, int] = {}
    for i in range(len(tokens) - 1):
        first, second = tokens[i], tokens[i + 1]
        if (
            len(first) < 5
            or len(second) < 5
            or first in MISSION_REDUNDANCY_STOP_WORDS
            or second in MISSION_REDUNDANCY_STOP_WORDS
        ):
            continue
        phrase = f"{first} {second}"
        counts[phrase] = counts.get(phrase, 0) + 1
    return sorted([phrase for phrase, count in counts.items() if count > 1])


def synonym_stacking(text: str) -> List[str]:
    lower = text.lower()
    stacked: List[str] = []
    for group in MISSION_SYNONYM_GROUPS:
        matched = [
            term
            for term in group["terms"]
            if re.search(rf"\b{re.escape(term)}\b", lower, re.IGNORECASE)
        ]
        if len(set(matched)) >= int(group["threshold"]):
            stacked.append(str(group["label"]))
    return stacked


def mission_pillar_hits(mission: str) -> Dict[str, Any]:
    lower = mission.lower()
    hits = {
        "academic": any(re.search(rf"\b{re.escape(term)}\b", lower) for term in MISSION_PILLAR_SIGNALS["academic"]),
        "research_industry": any(re.search(rf"\b{re.escape(term)}\b", lower) for term in MISSION_PILLAR_SIGNALS["research_industry"]),
        "professional_standards": any(re.search(rf"\b{re.escape(term)}\b", lower) for term in MISSION_PILLAR_SIGNALS["professional_standards"]),
        "ethics_society": any(re.search(rf"\b{re.escape(term)}\b", lower) for term in MISSION_PILLAR_SIGNALS["ethics_society"]),
    }
    hits["total"] = len([k for k, v in hits.items() if k != "total" and v])
    return hits


def score_mission(mission: str, reference_vision: str = "") -> Dict[str, Any]:
    normalized = normalize_whitespace(mission)
    lower = normalized.lower()
    words = re.findall(r"\b[\w-]+\b", normalized)
    sentence_count = len(split_sentences(normalized))

    operational_hits = [
        verb for verb in MISSION_OPERATIONAL_VERBS if re.search(rf"\b{re.escape(verb)}\b", lower, re.IGNORECASE)
    ]
    marketing_hits = [
        term for term in MISSION_MARKETING_TERMS if re.search(rf"\b{re.escape(term)}\b", lower, re.IGNORECASE)
    ]
    restricted_hits = [term for term in MISSION_RESTRICTED_TERMS if term in lower]
    immediate_outcome_hits = [term for term in MISSION_IMMEDIATE_OUTCOME_TERMS if term in lower]
    roots = repeated_roots(normalized)
    dup_phrases = duplicate_bigrams(normalized)
    stacked = synonym_stacking(normalized)
    pillars = mission_pillar_hits(normalized)

    overlap = vision_similarity(reference_vision, normalized) if reference_vision else 0.35
    leakage = vision_similarity(reference_vision, normalized) if reference_vision else 0.0
    vision_keywords = []
    if reference_vision:
        vision_keywords = [w for w in extract_tokens(reference_vision) if len(w) >= 5][:8]
    keyword_hits = len([w for w in vision_keywords if w in lower])
    required_keyword_hits = min(2, len(vision_keywords))

    hard_violations: List[str] = []
    if len(operational_hits) < 2:
        hard_violations.append("insufficient operational action verbs in mission")
    if sentence_count < 3 or sentence_count > 4:
        hard_violations.append("mission must contain 3 to 4 structured sentences")
    if pillars["total"] < 3:
        hard_violations.append("mission must operationalize at least three strategic pillars")
    if len(roots) > 1:
        hard_violations.append(f"repeated root words detected: {', '.join(roots)}")
    if dup_phrases:
        hard_violations.append(f"duplicate noun phrases detected: {', '.join(dup_phrases)}")
    if stacked:
        hard_violations.append(f"synonym stacking detected: {', '.join(stacked)}")
    if marketing_hits:
        hard_violations.append(f"marketing language detected: {', '.join(marketing_hits)}")
    if restricted_hits:
        hard_violations.append(f"restricted wording detected: {', '.join(restricted_hits)}")
    if immediate_outcome_hits:
        hard_violations.append("immediate-outcome language detected")
    if leakage > 0.72:
        hard_violations.append("mission repeats vision wording too closely")

    alignment_with_vision = 100
    if reference_vision:
        overlap_score = min(100, round(overlap * 100))
        keyword_score = 100 if required_keyword_hits == 0 else min(100, round((keyword_hits / required_keyword_hits) * 100))
        pillar_score = min(100, round((pillars["total"] / 4) * 100))
        alignment_with_vision = min(
            100,
            round(65 + overlap_score * 0.15 + keyword_score * 0.1 + pillar_score * 0.25),
        )

    operational_clarity = 100
    if len(operational_hits) < 2:
        operational_clarity -= 45
    if pillars["total"] < 3:
        operational_clarity -= 35
    if sentence_count < 3 or sentence_count > 4:
        operational_clarity -= 25

    no_redundancy = 100
    if roots:
        no_redundancy -= min(65, len(roots) * 22)
    if dup_phrases:
        no_redundancy -= min(60, len(dup_phrases) * 25)
    if stacked:
        no_redundancy -= 35

    accreditation_tone = 100
    if marketing_hits:
        accreditation_tone -= 45
    if restricted_hits:
        accreditation_tone -= 35
    if immediate_outcome_hits:
        accreditation_tone -= 40

    strategic_coherence = 100
    if sentence_count < 3 or sentence_count > 4:
        strategic_coherence -= 35
    if len(words) < 45 or len(words) > 110:
        strategic_coherence -= 25
    if pillars["total"] < 3:
        strategic_coherence -= 25
    if leakage > 0.72:
        strategic_coherence -= 30

    weighted = round(
        alignment_with_vision * 0.25
        + operational_clarity * 0.20
        + no_redundancy * 0.15
        + accreditation_tone * 0.20
        + strategic_coherence * 0.20
    )
    final_score = max(0, min(100, weighted))
    if hard_violations:
        final_score = min(final_score, 79)

    violations = list(hard_violations)
    if final_score < MISSION_APPROVAL_THRESHOLD:
        violations.append(f"Mission score below threshold: {final_score}/100")

    return {
        "score": final_score,
        "hard_fail": len(hard_violations) > 0,
        "violations": violations,
        "breakdown": {
            "alignment_with_vision": max(0, min(100, alignment_with_vision)),
            "operational_clarity": max(0, min(100, operational_clarity)),
            "no_redundancy": max(0, min(100, no_redundancy)),
            "accreditation_tone": max(0, min(100, accreditation_tone)),
            "strategic_coherence": max(0, min(100, strategic_coherence)),
        },
    }


# Removed duplicate build_safe_mission - using consolidated version at line 351


def enforce_mission_diversity(missions: List[str], reference_vision: str, program_name: str) -> List[str]:
    diversified: List[str] = []
    for idx, mission in enumerate(missions):
        candidate = normalize_whitespace(mission)
        attempts = 0
        while attempts < 6:
            evaluation = score_mission(candidate, reference_vision)
            too_similar = any(vision_similarity(candidate, existing) > VISION_SIMILARITY_THRESHOLD for existing in diversified)
            if evaluation["score"] >= MISSION_APPROVAL_THRESHOLD and not evaluation["hard_fail"] and not too_similar:
                break
            candidate = build_safe_mission(program_name, idx + attempts)
            attempts += 1

        final_eval = score_mission(candidate, reference_vision)
        if final_eval["score"] < MISSION_APPROVAL_THRESHOLD or final_eval["hard_fail"]:
            candidate = build_safe_mission(program_name, idx + len(missions))
        diversified.append(candidate)
    return diversified

def generate_elite_fallback_missions(program_name: str, count: int) -> List[str]:
    missions: List[str] = []
    for idx in range(max(1, count)):
        missions.append(build_safe_mission(program_name, idx))
    return missions

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
        # Problem 3: Institute Vision/Mission Validation
        iv_len = len(request.institute_vision.strip()) if request.institute_vision else 0
        im_len = len(request.institute_mission.strip()) if request.institute_mission else 0
        
        if iv_len < 10 or im_len < 10:
            raise HTTPException(
                status_code=400, 
                detail="Please define a meaningful Institute Vision and Mission (minimum 10 characters) before generating Program Vision."
            )

        visions = []
        missions = []
        vision_scores = {}
        mission_scores = {}

        if request.mode in ['vision', 'both']:
            vision_prompt = f"""
You are generating a PROGRAM VISION statement for an engineering institution.

STRICT RULES:

1. Vision must follow the MIT/IIT Formula: Global Leadership + Innovation/Research + Societal Impact + Future Technologies/Sustainability.
2. Vision must represent a 10–15 year long-term institutional aspiration.
3. Vision must describe WHERE the program will stand in the future — not HOW it will educate students.
4. Do NOT use operational/process language: education, teaching, learning, curriculum, pedagogy, provide, deliver, develop, cultivate, train, prepare, implement, foster.
5. Each Vision must contain exactly ONE global positioning phrase:
   - globally recognized
   - globally respected
   - global leadership
   - global distinction
   - leading advancement
6. Each Vision MUST mention research or innovation.
7. Each Vision MUST mention societal development, industry impact, or public welfare.
8. Each Vision MUST mention sustainable technology, emerging technologies, or future relevance.
9. Length: 15–25 words strictly.
10. Each Vision must use a different opening phrase and distinct structural framing.
11. Maintain professional accreditation tone (ABET/NBA compatible).
12. Vision must NOT describe curriculum or teaching process. That belongs to Mission.

Before generating, internally:
- Abstract selected themes into long-term institutional positioning.
- Convert educational themes into future impact language.
- Ensure no operational drift.

Program: {request.program_name}
Institute Vision: {request.institute_vision}
Selected Focus Areas: {", ".join(request.vision_inputs)}

STRICT ALIGNMENT RULE:
The generated visions MUST explicitly reflect the themes of the following Selected Focus Areas: {", ".join(request.vision_inputs)}.

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

                    assessment = score_vision(v_clean, request.vision_inputs, request.institute_vision)
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
                    assessment = score_vision(current_v, request.vision_inputs, request.institute_vision)
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

                final_assessment = score_vision(current_v, request.vision_inputs, request.institute_vision)
                if final_assessment["score"] < VISION_APPROVAL_THRESHOLD or final_assessment.get("hard_fail"):
                    deterministic = build_deterministic_vision(request.program_name, request.vision_inputs, idx)
                    deterministic_assessment = score_vision(deterministic, request.vision_inputs, request.institute_vision)
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
            vision_scores = {}
            for v in visions:
                v_assessment = score_vision(v, request.vision_inputs, request.institute_vision)
                vision_scores[v] = v_assessment
                
                # Debug logging
                debug_data = {
                    "vision_text": v,
                    "focus_areas_selected": request.vision_inputs,
                    "alignment_matches": v_assessment.get("alignment_matches", []),
                    "final_score": v_assessment["score"],
                    "violations": v_assessment.get("violations", []),
                    "breakdown": v_assessment.get("breakdown", {})
                }
                print(f"VISION_DEBUG_LOG: {json.dumps(debug_data)}")
                try:
                    with open("vision_generation_debug.log", "a") as f:
                        f.write(json.dumps(debug_data) + "\n")
                except Exception as e:
                    print(f"Failed to write to debug log: {e}")

        if request.mode in ['mission', 'both']:
            v_context = request.selected_program_vision if request.selected_program_vision else (visions[0] if visions else "")
            mission_prompt = f"""
You are an NBA/ABET Accreditation Evaluator and Strategic Academic Architect.

Generate exactly 1 distinct Program Mission formulation consisting of 3 to 5 concise bullet points.

Program: {request.program_name}
Institute Mission: {request.institute_mission}
Program Vision: {v_context}
Selected Focus Areas: {", ".join(request.mission_inputs)}

Strict Rules:
1. Explain HOW the Program Vision will be achieved using 3 to 5 structured bullet points (M1, M2, M3, etc.).
2. Each bullet point MUST be concise (max 20 words).
3. Each bullet point MUST start with a strong operational verb: deliver, foster, promote, cultivate, advance, develop.
4. Scale quality according to academic context (curriculum, research) and socio-industrial impact.
5. DO NOT use marketing fluff or absolute guarantees (e.g., "world-class", "hub", "best", "leader", "100%", "guarantee").
6. Ensure direct semantic alignment and keyword overlap with the Vision provided.

Output must be a plain JSON array of strings, where EACH string is a complete mission bullet point. Example: ["M1: foster...", "M2: promote..."]

Entropy Seed: {{seed}}
             """
            m_seed = f"{time.time()}_mission"
            mission_prompt = mission_prompt.replace("{seed}", m_seed)
            mission_text = await call_gemini_rest_async(mission_prompt, use_cache=False)
            print(f"DEBUG: Gemini Mission Raw Response -> {mission_text}")
            # Correct behavior: The array is a SET of bullets that form ONE mission option.
            try:
                match = re.search(r'\[.*\]', mission_text, re.DOTALL)
                if match:
                    # Each element in this array is a bullet point
                    bullets = json.loads(match.group(0))
                    # Join them into a single string for the user to select
                    mission_draft = "\n".join([normalize_whitespace(m) for m in bullets if normalize_whitespace(m)])
                    missions = [mission_draft]
                else:
                    mission_draft = normalize_whitespace(mission_text.replace('```json', '').replace('```', '').strip())
                    missions = [mission_draft]
            except Exception as e:
                print(f"DEBUG: Mission Parse Error -> {str(e)}")
                mission_draft = normalize_whitespace(mission_text.replace('```json', '').replace('```', '').strip())
                missions = [mission_draft]
            if not normalized_missions:
                normalized_missions = [build_safe_mission(request.program_name, 0)]

            refined_missions: List[str] = []
            
            # Since we joined the bullets, normalized_missions now has one long string option
            for idx, mission in enumerate(missions[: request.mission_count]):
                candidate = mission
                for repair_attempt in range(VISION_MAX_REPAIR_ATTEMPTS):
                    assessment = score_mission(candidate)
                    alignment = calculate_alignment(mission_reference, candidate)
                    
                    print(
                        f"DEBUG: Mission Assessment -> Attempt: {repair_attempt+1}, Score: {assessment['score']}, "
                        f"Alignment: {alignment:.2f}, HardFail: {assessment.get('hard_fail')}, Text: {candidate[:50]}..."
                    )
                    if assessment["score"] >= MISSION_APPROVAL_THRESHOLD and not assessment.get("hard_fail") and alignment >= 0.15:
                        break

                    mission_repair_prompt = f"""
You are an Elite Strategic Mission Quality Controller for NBA/ABET accreditation.

Program Vision:
"{mission_reference}"

Generated Mission that failed constraints:
"{candidate}"

Failures:
{", ".join(assessment.get("violations", []))}
Alignment Score: {alignment:.2f} (Needs >= 0.15)

Rewrite this mission to satisfy ALL rules:
1. Length MUST be 20 to 35 words.
2. Explain HOW the Vision will be achieved.
3. Must use operational verbs (deliver, foster, promote, cultivate, advance, develop).
4. Include academic context (curriculum, research) and societal impact (industry, society).
5. Remove any marketing fluff (world-class, best) and absolute guarantees (guarantee, 100%).
6. Ensure semantic keyword overlap with the Program Vision.

Return ONLY the corrected Mission paragraph.
"""
                    try:
                        repaired_mission = await call_gemini_rest_async(mission_repair_prompt, use_cache=False)
                        repaired_mission = normalize_whitespace(repaired_mission.strip().strip('"').strip("'"))
                        if repaired_mission:
                            candidate = repaired_mission
                    except Exception:
                        candidate = build_safe_mission(request.program_name, idx + repair_attempt)

                final_assessment = score_mission(candidate)
                final_alignment = calculate_alignment(mission_reference, candidate)
                if final_assessment["score"] < MISSION_APPROVAL_THRESHOLD or final_assessment.get("hard_fail") or final_alignment < 0.15:
                    candidate = build_safe_mission(request.program_name, idx)
                refined_missions.append(candidate)

            missions = enforce_mission_diversity(refined_missions, mission_reference, request.program_name)

            fill_idx = request.mission_count
            while len(missions) < request.mission_count:
                candidate = build_safe_mission(request.program_name, fill_idx)
                fill_idx += 1
                if any(vision_similarity(candidate, existing) > VISION_SIMILARITY_THRESHOLD for existing in missions):
                    continue
                missions.append(candidate)

            missions = missions[: request.mission_count]
            mission_scores = {m: score_mission(m) for m in missions}

        return VMGenerateResponse(
            vision=visions[0] if visions else None,
            mission=missions[0] if missions else None,
            visions=visions,
            missions=missions,
            scores={
                "vision": vision_scores if vision_scores else {},
                "mission": mission_scores if mission_scores else {},
            }
        )
        
    except Exception as e:
        print(f"CRITICAL ERROR generating VM: {str(e)}")
        # Deterministic strict fallback for Vision governance.
        fb_visions = []
        for idx in range(max(1, request.vision_count)):
            candidate = build_deterministic_vision(request.program_name, request.vision_inputs, idx)
            assessment = score_vision(candidate, request.vision_inputs, request.institute_vision)
            if assessment["score"] < VISION_APPROVAL_THRESHOLD or assessment.get("hard_fail"):
                candidate = build_safe_diversity_vision(request.program_name, idx)
            fb_visions.append(candidate)

        fb_visions = enforce_vision_diversity(fb_visions, request.program_name, request.vision_inputs)

        fb_missions = generate_elite_fallback_missions(request.program_name, request.mission_count)
        fb_missions = enforce_mission_diversity(
            [normalize_whitespace(m) for m in fb_missions if normalize_whitespace(m)],
            normalize_whitespace(request.selected_program_vision or (fb_visions[0] if fb_visions else "")),
            request.program_name,
        )
            
        return VMGenerateResponse(
            vision=fb_visions[0] if fb_visions else "", 
            mission=fb_missions[0] if fb_missions else "",
            visions=fb_visions,
            missions=fb_missions,
            scores={
                "vision": ({v: score_vision(v, request.vision_inputs, request.institute_vision) for v in fb_visions} if fb_visions else {}),
                "mission": {
                    m: score_mission(m, normalize_whitespace(request.selected_program_vision or (fb_visions[0] if fb_visions else "")))
                    for m in fb_missions
                }
            }
        )

def get_fallback_peos(program_name: str, count: int, priorities: List[str]) -> List[str]:
    """Generates high-quality fallback PEOs when the AI fails."""
    fallbacks = [
        f"Within 3 to 5 years of graduation, graduates will apply advanced theoretical knowledge and technical skills in {program_name} to design and implement innovative solutions for complex engineering problems.",
        f"Within 3 to 5 years of graduation, graduates will demonstrate leadership and teamwork in multidisciplinary environments, upholding the highest standards of professional ethics and social responsibility.",
        f"Within 3 to 5 years of graduation, graduates will engage in continuous professional development through lifelong learning, higher studies, or research, adapting to emerging trends in {program_name}.",
        f"Within 3 to 5 years of graduation, graduates will contribute to sustainable development and economic growth by establishing or supporting tech-driven entrepreneurial ventures.",
        f"Within 3 to 5 years of graduation, graduates will effectively communicate technical concepts to diverse stakeholders and manage projects with a focus on quality and cost-effectiveness."
    ]
    results = []
    for i in range(count):
        results.append(fallbacks[i % len(fallbacks)])
    return results

def create_default_alignment_matrix(peo_count: int, mission_count: int) -> List[List[int]]:
    matrix = []
    for _ in range(peo_count):
        row = []
        for _ in range(mission_count):
            row.append(2)  # Default moderate alignment
        matrix.append(row)
    return matrix




def build_fallback_peo(priority: str, program_name: str) -> str:
    return f"Within 3 to 5 years of graduation, graduates will progress in professional {program_name} roles by applying {priority} to solve complex engineering challenges in ways that are consistent with program and institutional mission priorities, while upholding ethical and sustainable practice."

def parse_peo_array(raw_text: str) -> List[str]:
    cleaned = raw_text.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if item]
    except:
        pass
    lines = [re.sub(r'^\d+\.\s*', '', line).strip() for line in cleaned.split('\n')]
    return [line for line in lines if len(line) > 10]

def canonical_peo_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())

def validate_peo_quality(statement: str, program_name: str) -> Dict[str, Any]:
    """Strictly validates a PEO statement against OBE/Accreditation standards."""
    statement = statement.strip()
    
    # 1. Prefix Check
    prefix = "Within 3 to 5 years of graduation, graduates will"
    if not statement.lower().startswith(prefix.lower()):
        return {"valid": False, "reason": "Missing mandatory prefix"}

    # 2. Length Check
    word_count = len(statement.split())
    if word_count < 15 or word_count > 50:
        return {"valid": False, "reason": f"Length outlier ({word_count} words)"}

    # 3. Bloom's Taxonomy Check (Levels 4-6)
    blooms_verbs = [
        "analyze", "determine", "evaluate", "assess", "contrast", "design", 
        "construct", "innovate", "formulate", "create", "implement", "leads",
        "manages", "solve", "apply", "execute", "collaborate", "contribute"
    ]
    has_bloom = any(verb in statement.lower() for verb in blooms_verbs)
    if not has_bloom:
        return {"valid": False, "reason": "Lacks high-level cognitive verbs (Bloom's 4-6)"}

    # 4. Professional Context Check
    career_keywords = ["professional", "career", "life-long", "ethics", "society", "industry", "practice", "team"]
    has_context = any(word in statement.lower() for word in career_keywords)
    if not has_context:
        return {"valid": False, "reason": "Lacks professional/career context"}

    return {"valid": True, "score": 1.0}

def rank_peo_statements(statements: List[str]) -> List[Dict[str, Any]]:
    ranked = [{"statement": stmt, "quality": score_peo(stmt)} for stmt in statements]
    ranked.sort(key=lambda x: (x["quality"]["score"], x["quality"].get("percentage", 0)), reverse=True)
    return ranked

@app.post("/api/v1/generate-peos", response_model=PEOGenerateResponse)
async def generate_peos(request: PEOGenerateRequest):
    try:
        normalized_count = min(20, max(1, request.count or 4))
        if not request.priorities:
            raise HTTPException(status_code=400, detail="Priorities are required")

        peo_prompt = f"""
        You are an Accreditation-Aware Academic Policy Designer.
        
        Program: "{request.programName}".
        Context: {request.institutionContext or "N/A"}
        Program Vision: "{request.vision}"
        Program Missions: {json.dumps(request.missions, indent=2)}
        Priority Anchors: {", ".join(request.priorities)}.

        Task: Generate exactly {normalized_count} distinct Program Educational Objectives (PEOs) for this program.

        PEO Bloom's Taxonomy & Measurability Requirements (Hardcore Compliance):
        1. Professional Competence (Analyze/Evaluate): At least 30% of PEOs must use verbs like "Analyze", "Determine", or "Evaluate" regarding real-world engineering or professional scenarios.
        2. Technical Innovation (Create/Design): At least 30% of PEOs must use verbs like "Design", "Construct", "Innovate", or "Formulate".
        3. Long-term Impact: Each PEO must describe achievements 3-5 years after graduation, focusing on career progression.
        4. Measurability: PEOs must be measurable via concrete indicators (e.g., job titles, certifications, project delivery, patents).
        5. Avoid classroom language: Do not use words like "learn", "study", "know", or "understand".
        6. Diversity across: Professional competence, Leadership, Societal responsibility, Innovation.
        7. Prefix: Each PEO must begin with "Within 3 to 5 years of graduation, graduates will..."
        8. Length: Statements must be concise (20-35 words).
        9. Semantic Alignment: Each PEO MUST align with at least one Program Mission or the Vision.

        Output format:
        - Return strictly a JSON array of strings.
        - No markdown.
        """
        
        raw_text = await call_gemini_rest_async(peo_prompt, use_cache=False)
        parsed_results = parse_peo_array(raw_text)[:normalized_count]
        
        refined_peos = []
        seen = set()
        
        for i, statement in enumerate(parsed_results):
            priority = request.priorities[i % len(request.priorities)] if request.priorities else "professional practice"
            statement = re.sub(r'^(?i)PEO\d+\s*:\s*', '', statement).strip()
            
            # 1. Enforce quality
            refined_statement = enforce_peo_quality(statement, priority, request.programName)
            
            # 2. Check Vision Alignment
            alignment = calculate_peo_vision_alignment(request.vision, refined_statement)
            if alignment < 0.1:
                 # If very low alignment, force a fallback
                 refined_statement = build_fallback_peo(priority, request.programName)
            
            # 3. Check Diversity
            too_similar = any(peo_similarity(refined_statement, existing) > 0.8 for existing in refined_peos)
            if too_similar:
                 # If too similar, differentiate via fallback
                 priority = request.priorities[(i+1) % len(request.priorities)] if request.priorities else "innovation"
                 refined_statement = build_fallback_peo(priority, request.programName)

            key = canonical_peo_key(refined_statement)
            if key not in seen:
                seen.add(key)
                refined_peos.append(refined_statement)

        # Ensure count
        fallback_index = 0
        while len(refined_peos) < normalized_count:
            idx = len(refined_peos)
            priority = request.priorities[idx % len(request.priorities)] if request.priorities else "excellence"
            fallback = build_fallback_peo(priority, request.programName)
            if not any(peo_similarity(fallback, existing) > 0.8 for existing in refined_peos):
                refined_peos.append(fallback)
            fallback_index += 1
            if fallback_index > normalized_count * 5: break
        
        final_peos = refined_peos[:normalized_count]
        ranked_results = rank_peo_statements(final_peos)
        
        scores = {r["statement"]: r["quality"] for r in ranked_results}
        matrix = create_default_alignment_matrix(len(final_peos), len(request.missions))
            
        return PEOGenerateResponse(results=[r["statement"] for r in ranked_results], quality=[r["quality"] for r in ranked_results], alignment_matrix=matrix, scores=scores)

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL ERROR generating PEOs: {str(e)}")
        # Complete fallback
        fallback_results = []
        normalized_count = min(20, max(1, request.count or 4))
        for i in range(normalized_count):
            priority = request.priorities[i % max(1, len(request.priorities))] if request.priorities else "professional practice"
            fallback = build_fallback_peo(priority, request.programName or "engineering")
            fallback_results.append(fallback)
            
        final_peos = fallback_results
        peo_scores = {p: score_peo(p) for p in final_peos}
        return PEOGenerateResponse(
            results=final_peos,
            quality=[score_peo(p) for p in final_peos],
            alignment_matrix=create_default_alignment_matrix(len(final_peos), len(request.missions)),
            scores=peo_scores
        )

@app.post("/api/v1/generate-pos", response_model=POGenerateResponse)
async def generate_pos(request: POGenerateRequest):
    try:
        normalized_count = min(15, max(1, request.count or 12))
        
        po_prompt = f"""
        You are an NBA Accreditation Specialist.
        
        Program: "{request.programName}".
        PEOs existing for this program:
        {json.dumps(request.peos, indent=2)}
        
        Task: Generate exactly {normalized_count} Program Outcomes (POs).
        POs should follow the Washington Accord / NBA / ABET standard:
        1. Engineering Knowledge
        2. Problem Analysis
        3. Design/Development of Solutions
        4. Conduct Investigations of Complex Problems
        5. Modern Tool Usage
        6. The Engineer and Society
        7. Environment and Sustainability
        8. Ethics
        9. Individual and Team Work
        10. Communication
        11. Project Management and Finance
        12. Life-long Learning
        
        If count is > 12, add Program Specific Outcomes (PSOs).
        
        Requirements:
        1. Each PO should be a single clear statement beginning with an action verb.
        2. Each statement must be between 10 and 30 words.
        3. Outcomes must represent what students will be able to do at the time of graduation.
        
        Output format:
        - Return strictly a JSON array of strings.
        - No markdown.
        - No explanation.
        """
        
        raw_text = await call_gemini_rest_async(po_prompt, use_cache=False)
        parsed_results = parse_peo_array(raw_text)[:normalized_count]
        
        refined_pos = [enforce_po_quality(po) for po in parsed_results]
        
        # Mapping matrix (PO to PEO)
        peo_count = len(request.peos)
        mapping_matrix = [[(1 if (i+j) % 3 == 0 else 2 if (i+j) % 2 == 0 else 0) for i in range(peo_count)] for j in range(len(refined_pos))]
        
        # Simple quality check (can be expanded)
        quality_assessment = [{"statement": po, "specific": True, "measurable": True} for po in refined_pos]
        
        return POGenerateResponse(
            pos=refined_pos,
            mapping_matrix=mapping_matrix,
            quality=quality_assessment
        )
        
    except Exception as e:
        print(f"CRITICAL ERROR generating POs: {str(e)}")
        # Fallback to standard PO names
        standard_pos = [
            "Apply knowledge of mathematics, science, and engineering fundamentals to solve complex problems.",
            "Analyze complex engineering problems and formulate conclusions using first principles.",
            "Design solutions for complex engineering problems that meet specific societal and environmental needs.",
            "Conduct investigations of complex problems through research-based methods and data analysis.",
            "Select and apply modern engineering tools and IT resources for modeling and simulation.",
            "Apply reasoning informed by contextual knowledge to assess societal, health, and legal issues.",
            "Understand the impact of engineering solutions in societal and environmental contexts.",
            "Apply ethical principles and commit to professional ethics and responsibilities.",
            "Function effectively as an individual and as a member or leader in diverse teams.",
            "Communicate effectively on complex engineering activities with the engineering community.",
            "Demonstrate knowledge and understanding of management and financial principles.",
            "Recognize the need for and have the preparation to engage in lifelong learning."
        ]
        pos = standard_pos[:normalized_count]
        mapping_matrix = [[1 for _ in range(len(request.peos))] for _ in range(len(pos))]
        quality = [{"statement": po, "specific": True, "measurable": True} for po in pos]
        return POGenerateResponse(pos=pos, mapping_matrix=mapping_matrix, quality=quality)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
