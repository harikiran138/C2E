import json
from typing import List, Dict, Any, Optional
from utils.ai_utils import call_ai_async
from strategic_scoring import classifier, score_peo, peo_similarity, enforce_peo_quality

class PEOService:
    def __init__(self):
        self.classifier = classifier

    def build_fallback_peo(self, priority: str, program_name: str, variant: int = 0) -> str:
        program_label = " ".join((program_name or "").split()[:2]).strip() or "the program"
        priority_label = " ".join((priority or "professional practice").split()[:2]).strip() or "professional practice"
        templates = [
            (
                f"Within 3 to 5 years of graduation, graduates will advance in professional careers "
                f"by applying {priority_label} in {program_label}, contribute to industry and community, "
                f"and attain leadership roles aligned with institutional mission priorities."
            ),
            (
                f"Within 3 to 5 years of graduation, graduates will lead professional careers in {program_label} "
                f"through {priority_label}, deliver innovation for industry and community needs, "
                f"and achieve leadership roles aligned with institutional mission priorities."
            ),
            (
                f"Within 3 to 5 years of graduation, graduates will progress in professional careers "
                f"through {priority_label} practice in {program_label}, contribute measurable value to industry and community, "
                f"and attain leadership roles aligned with institutional mission priorities."
            ),
            (
                f"Within 3 to 5 years of graduation, graduates will advance career growth in {program_label} "
                f"by integrating {priority_label}, support industry and community outcomes, "
                f"and attain recognized leadership roles aligned with institutional mission priorities."
            ),
        ]
        return templates[variant % len(templates)]

    def parse_peo_array(self, raw_text: str) -> List[str]:
        import re
        cleaned = raw_text.replace("```json", "").replace("```", "").strip()
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if item]
        except (json.JSONDecodeError, ValueError):
            pass
        lines = [re.sub(r'^\d+\.\s*', '', line).strip() for line in cleaned.split('\n')]
        return [line for line in lines if len(line) > 10]

    async def generate_peos(self, program_name: str, vision: str, missions: List[str], priorities: List[str], count: int = 4, context: str = "") -> Dict[str, Any]:
        normalized_count = min(12, max(1, count))
        
        peo_prompt = f"""
        You are an Accreditation-Aware Academic Policy Designer.
        
        Program: "{program_name}".
        Context: {context or "N/A"}
        Program Vision: "{vision}"
        Program Missions: {json.dumps(missions, indent=2)}
        Priority Anchors: {", ".join(priorities)}.

        Task: Generate exactly {normalized_count} distinct Program Educational Objectives (PEOs) for this program.

        PEO Bloom's Taxonomy & Measurability Requirements:
        1. Professional Competence (Analyze/Evaluate): At least 30% of PEOs must use verbs like "Analyze", "Determine", or "Evaluate".
        2. Technical Innovation (Create/Design): At least 30% of PEOs must use verbs like "Design", "Construct", "Innovate", or "Formulate".
        3. Long-term Impact: Each PEO must describe achievements 3-5 years after graduation.
        4. Measurability: PEOs must be measurable via concrete indicators (e.g., job titles, certifications).
        5. Avoid classroom language: Do not use "learn", "study", "know", or "understand".
        6. Prefix: Each PEO must begin with "Within 3 to 5 years of graduation, graduates will..."
        7. Length: Statements must be concise (20-35 words).
        8. Output format: Strictly a JSON array of strings. No markdown.
        """
        
        try:
            raw_text = await call_ai_async(peo_prompt, use_cache=False)
            parsed_results = self.parse_peo_array(raw_text)[:normalized_count]
            
            refined_peos = []
            seen = set()
            
            for i, statement in enumerate(parsed_results):
                priority = priorities[i % len(priorities)] if priorities else "professional practice"
                
                # 1. Enforce quality
                refined_statement = enforce_peo_quality(statement, priority, program_name)
                
                # 2. Check Diversity
                too_similar = any(peo_similarity(refined_statement, existing) > 0.8 for existing in refined_peos)
                if too_similar:
                     priority = priorities[(i+1) % len(priorities)] if priorities else "innovation"
                     refined_statement = self.build_fallback_peo(priority, program_name, i + 1)

                import re
                key = re.sub(r"[^a-z0-9]", "", refined_statement.lower())
                if key not in seen:
                    seen.add(key)
                    refined_peos.append(refined_statement)

            # Ensure count
            fallback_index = 0
            while len(refined_peos) < normalized_count:
                idx = len(refined_peos)
                priority = priorities[idx % len(priorities)] if priorities else "excellence"
                fallback = self.build_fallback_peo(priority, program_name, fallback_index)
                if not any(peo_similarity(fallback, existing) > 0.8 for existing in refined_peos):
                    refined_peos.append(fallback)
                elif fallback_index >= normalized_count * 3:
                    refined_peos.append(fallback)
                fallback_index += 1
                if fallback_index > normalized_count * 5: break
            
            final_peos = refined_peos[:normalized_count]
            
            # Rank by score
            scored_results = [{"statement": p, "quality": score_peo(p)} for p in final_peos]
            scored_results.sort(key=lambda x: (x["quality"]["score"], x["quality"].get("percentage", 0)), reverse=True)
            
            results = [r["statement"] for r in scored_results]
            quality = [r["quality"] for r in scored_results]
            scores = {r["statement"]: r["quality"] for r in scored_results}
            
            # Default alignment matrix (moderate alignment)
            alignment_matrix = [[2 for _ in range(len(missions))] for _ in range(len(results))]
                
            return {
                "results": results,
                "quality": quality,
                "alignment_matrix": alignment_matrix,
                "scores": scores
            }

        except Exception as e:
            print(f"ERROR in PEOService: {str(e)}")
            fallback_results = [self.build_fallback_peo(priorities[i % len(priorities)] if priorities else "professional practice", program_name, i) for i in range(normalized_count)]
            return {
                "results": fallback_results,
                "quality": [score_peo(p) for p in fallback_results],
                "alignment_matrix": [[2 for _ in range(len(missions))] for _ in range(len(fallback_results))],
                "scores": {p: score_peo(p) for p in fallback_results}
            }
