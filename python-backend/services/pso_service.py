import json
import re
import time
from typing import List, Dict, Any, Optional, Set
from utils.ai_utils import call_ai_async
from strategic_scoring import score_pso, pso_similarity, classifier

PSO_PREFIX = "Graduates will be able to"
PSO_APPROVAL_THRESHOLD = 85
PSO_MAX_REPAIR_ATTEMPTS = 2
PSO_SIMILARITY_THRESHOLD = 0.8

class PSOService:
    def __init__(self):
        self.classifier = classifier

    def build_fallback_pso(self, priority: str, program_name: str, variant: int = 0) -> str:
        program_label = " ".join((program_name or "").split()[:3]).strip() or "the program"
        priority_label = " ".join((priority or "technical computing").split()[:3]).strip() or "technical computing"
        templates = [
            f"Graduates will be able to design and implement advanced {program_label} systems applying {priority_label} principles to address complex engineering challenges.",
            f"Graduates will be able to analyze, evaluate, and optimize {program_label} solutions using {priority_label} methodologies and professional engineering standards.",
            f"Graduates will be able to integrate {priority_label} techniques with {program_label} frameworks to address real-world societal and industry requirements.",
            f"Graduates will be able to develop and deploy {program_label} applications incorporating {priority_label} and modern software engineering practices.",
        ]
        return templates[variant % len(templates)]

    def parse_pso_array(self, raw_text: str) -> List[str]:
        cleaned = raw_text.replace("```json", "").replace("```", "").strip()
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if item]
        except (json.JSONDecodeError, ValueError):
            pass
        lines = [re.sub(r'^\d+\.\s*', '', line).strip() for line in cleaned.split('\n')]
        return [line for line in lines if len(line) > 10]

    async def generate_psos(self, program_name: str, vision: str, missions: List[str], peos: List[str], priorities: List[str], count: int = 3) -> Dict[str, Any]:
        normalized_count = min(10, max(1, count))
        
        pso_prompt = f"""
        You are a Program Specialist Outcome (PSO) Designer for {program_name}.
        
        Vision: "{vision or 'N/A'}"
        Missions: {json.dumps(missions, indent=2)}
        PEOs: {json.dumps(peos, indent=2)}
        Technical Priorities: {", ".join(priorities)}.
        
        Task: Create exactly {normalized_count} Program Specific Outcomes (PSOs) that reflect the unique technical identity of this program.
        
        Rules:
        1. MUST start with "Graduates will be able to..."
        2. Word count: 15-25 words.
        3. Include a technical verb: design, implement, analyze, evaluate, create, integrate, optimize.
        4. Focus on domain-specific technical capability.
        5. Output as a JSON array of strings. No markdown.
        """
        
        try:
            raw_text = await call_ai_async(pso_prompt, use_cache=False)
            parsed_results = self.parse_pso_array(raw_text)[:normalized_count]
            
            refined_psos = []
            seen_keys = set()
            
            for i, statement in enumerate(parsed_results):
                priority = priorities[i % len(priorities)]
                # Strip labels
                statement = re.sub(r'^(?i)(PSO\d*\s*[:.\-]?\s*)', '', statement).strip()

                # Enforce structure
                if not statement.lower().startswith(PSO_PREFIX.lower()):
                    if statement:
                        statement = f"{PSO_PREFIX} {statement[0].lower() + statement[1:]}"
                    else:
                        statement = self.build_fallback_pso(priority, program_name, i)

                # Repair loop
                for attempt in range(PSO_MAX_REPAIR_ATTEMPTS):
                    assessment = score_pso(statement)
                    if assessment["score"] >= PSO_APPROVAL_THRESHOLD and not assessment.get("hard_fail"):
                        break
                    
                    repair_prompt = f"""Repair this PSO for {program_name}: "{statement}"
                    Violations: {", ".join(assessment.get("violations", []))}
                    Priority: {priority}
                    Rules: Start with "{PSO_PREFIX}", 15-25 words, technical verb, no generic phrases.
                    Return ONLY the corrected statement."""
                    
                    try:
                        repaired = await call_ai_async(repair_prompt, use_cache=False)
                        statement = repaired.strip().strip('"').strip("'")
                        if not statement.lower().startswith(PSO_PREFIX.lower()):
                             statement = f"{PSO_PREFIX} {statement}"
                    except:
                        statement = self.build_fallback_pso(priority, program_name, i + attempt)

                # Final quality and diversity
                assessment = score_pso(statement)
                too_similar = any(pso_similarity(statement, existing) > PSO_SIMILARITY_THRESHOLD for existing in refined_psos)
                
                if assessment.get("hard_fail") or too_similar:
                    statement = self.build_fallback_pso(priority, program_name, i)

                key = re.sub(r"[^a-z0-9]", "", statement.lower())[:60]
                if key not in seen_keys:
                    seen_keys.add(key)
                    refined_psos.append(statement)

            # Ensure count
            while len(refined_psos) < normalized_count:
                idx = len(refined_psos)
                priority = priorities[idx % len(priorities)]
                fallback = self.build_fallback_pso(priority, program_name, len(refined_psos))
                refined_psos.append(fallback)
            
            final_psos = refined_psos[:normalized_count]
            scored = [{"statement": p, "quality": score_pso(p)} for p in final_psos]
            scored.sort(key=lambda x: x["quality"]["score"], reverse=True)
            
            return {
                "results": [s["statement"] for s in scored],
                "quality": [s["quality"] for s in scored],
                "scores": {s["statement"]: s["quality"] for s in scored}
            }

        except Exception as e:
            print(f"ERROR in PSOService: {str(e)}")
            fallbacks = [self.build_fallback_pso(priorities[i % len(priorities)], program_name, i) for i in range(normalized_count)]
            return {
                "results": fallbacks,
                "quality": [score_pso(p) for p in fallbacks],
                "scores": {p: score_pso(p) for p in fallbacks}
            }
