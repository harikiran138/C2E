import json
import re
from typing import List, Dict, Any, Optional
from prompts.master import MASTER_PROMPT_TEMPLATE
from utils.ai_utils import call_ai_async
from strategic_scoring import StrategicClassifier

class VMService:
    def __init__(self):
        self.classifier = StrategicClassifier()

    async def generate_orchestrated_vm(
        self,
        program_name: str,
        focus_areas: List[str],
        custom_inputs: str = "",
        vision_count: int = 1,
        mode: str = "accreditation",
        discipline: str = "Engineering",
        seen_statements: List[str] = None,
        program_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Orchestrates the entire VM generation using the Master Prompt.
        Includes a diversity engine to ensure varied results on regeneration.
        """
        # Diversity Engine: Select a focus based on seen statements or random rotation
        seen_statements = seen_statements or []
        focus_index = len(seen_statements) % 5
        focus_options = [
            "Innovation & Emerging Tech", 
            "Sustainability & Social Impact", 
            "Global Leadership & Academic Excellence",
            "Professional Ethics & Industry Alignment",
            "Research Excellence & Scholarly Conduct"
        ]
        dynamic_focus = focus_options[focus_index]

        # Prepare the master prompt
        prompt = MASTER_PROMPT_TEMPLATE.format(
            program_name=program_name,
            discipline=discipline,
            focus_areas=", ".join(focus_areas),
            custom_inputs=custom_inputs,
            dynamic_focus=dynamic_focus,
            seen_statements=", ".join(seen_statements) if seen_statements else "None",
            vision_count=vision_count,
            mode=mode
        )

        try:
            # Call AI
            raw_response = await call_ai_async(prompt, use_cache=False)
            
            # Extract JSON from potential markdown markers
            json_str = self._extract_json(raw_response)
            data = json.loads(json_str)
            
            # Validate and potentially enhance with Python-side scoring
            processed_data = self._post_process(data, program_name, focus_areas)
            
            return processed_data

        except Exception as e:
            print(f"Error in orchestrated VM generation: {str(e)}")
            # Fallback to a deterministic structure if everything fails
            return self._generate_fallback(program_name, focus_areas)

    def _extract_json(self, text: str) -> str:
        """Robustly extracts JSON from AI output."""
        # Look for JSON between triple backticks
        match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            return match.group(1)
            
        # Look for any JSON-like structure
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            return match.group(1)
            
        return text

    def _post_process(self, data: Dict[str, Any], program_name: str, focus_areas: List[str]) -> Dict[str, Any]:
        """Performs Python-side validation and ensures all fields are present."""
        # We trust the AI's structure but can add our own sanity checks
        if "vision_statements" not in data: data["vision_statements"] = []
        if "mission_statements" not in data: data["mission_statements"] = []
        
        # Calculate Python-side alignment as a double-check
        vision_texts = [v["text"] for v in data["vision_statements"] if "text" in v]
        mission_texts = [m["text"] for m in data["mission_statements"] if "text" in m]
        
        if vision_texts and mission_texts:
            python_alignment = self.classifier.calculate_alignment_score(vision_texts[0], mission_texts)
            # We can blend or override the AI's alignment score
            data["alignment_score"] = int((data.get("alignment_score", 0) + python_alignment) / 2)
            
        return data

    def _generate_fallback(self, program_name: str, focus_areas: List[str]) -> Dict[str, Any]:
        """Provides a safe, high-quality fallback if the AI fails."""
        focus_str = ", ".join(focus_areas) if focus_areas else "educational excellence"
        return {
            "vision_statements": [
                {
                    "text": f"To be recognized globally as a premiere center of excellence in {program_name}, fostering innovation and ethical leadership for sustainable societal impact.",
                    "score": 90,
                    "strengths": ["Strategic", "Global", "Innovative"],
                    "issues": []
                }
            ],
            "mission_statements": [
                {
                    "pillar": "Academic Excellence",
                    "text": f"Deliver high-quality academic programs in {program_name} through outcome-based education and transformative learning experiences.",
                    "score": 90
                },
                {
                    "pillar": "Research & Industry Integration",
                    "text": f"Foster advanced research and strong industrial collaborations to solve real-world technical challenges through innovative engineering solutions.",
                    "score": 90
                },
                {
                    "pillar": "Ethics & Professional Responsibility",
                    "text": f"Cultivate professional ethics, integrity, and core human values among students to lead responsible engineering practices.",
                    "score": 90
                },
                {
                    "pillar": "Societal Impact / Sustainability",
                    "text": f"Empower graduates to contribute towards sustainable community development and address global societal needs through socially conscious projects.",
                    "score": 90
                }
            ],
            "alignment_score": 90,
            "quality_summary": {
                "status": "PASS",
                "mode": "accreditation",
                "notes": ["Fallback system used due to processing error."]
            }
        }
