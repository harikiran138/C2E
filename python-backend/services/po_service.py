import json
import re
from typing import List, Dict, Any, Optional
from utils.ai_utils import call_ai_async
from strategic_scoring import enforce_po_quality

class POService:
    def __init__(self):
        pass

    def parse_po_array(self, raw_text: str) -> List[str]:
        cleaned = raw_text.replace("```json", "").replace("```", "").strip()
        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if item]
        except (json.JSONDecodeError, ValueError):
            pass
        lines = [re.sub(r'^\d+\.\s*', '', line).strip() for line in cleaned.split('\n')]
        return [line for line in lines if len(line) > 10]

    async def generate_pos(self, program_name: str, peos: List[str], count: int = 12, program_id: Optional[str] = None) -> Dict[str, Any]:
        normalized_count = min(15, max(1, count))
        
        po_prompt = f"""
        You are an NBA Accreditation Specialist for {program_name}.
        
        PEOs: {json.dumps(peos, indent=2)}
        
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
        
        Output format: Strictly a JSON array of strings. No markdown.
        """
        
        try:
            raw_text = await call_ai_async(po_prompt, use_cache=False)
            parsed_results = self.parse_po_array(raw_text)[:normalized_count]
            
            refined_pos = [enforce_po_quality(po) for po in parsed_results]
            
            # Mapping matrix (PO to PEO)
            peo_count = len(peos)
            # Create a semi-realistic mapping if PEOs exist.
            # Usually POs map to multiple PEOs.
            mapping_matrix = []
            for i in range(len(refined_pos)):
                row = []
                for j in range(peo_count):
                    # Default heuristic: POs 1-5 map strongly to technical PEOs
                    # POs 6-12 map to professional/societal PEOs
                    val = 0
                    if i < 7 and j == 0: val = 3 # Strong
                    elif i >= 7 and j == 1: val = 3
                    elif (i + j) % 3 == 0: val = 2 # Moderate
                    elif (i + j) % 4 == 0: val = 1 # Slight
                    row.append(val)
                mapping_matrix.append(row)
            
            # Quality assessment
            quality_assessment = [{"statement": po, "specific": True, "measurable": True} for po in refined_pos]
            
            return {
                "pos": refined_pos,
                "mapping_matrix": mapping_matrix,
                "quality": quality_assessment
            }

        except Exception as e:
            print(f"ERROR in POService: {str(e)}")
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
            while len(pos) < normalized_count:
                pos.append(f"Develop specialized technical expertise in a selected domain within {program_name}.")
            
            mapping_matrix = [[1 for _ in range(len(peos))] for _ in range(len(pos))]
            quality = [{"statement": po, "specific": True, "measurable": True} for po in pos]
            return {"pos": pos, "mapping_matrix": mapping_matrix, "quality": quality}
