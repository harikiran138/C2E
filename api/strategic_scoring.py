import re
from typing import List, Dict

class StrategicClassifier:
    """
    A deterministic scoring engine that evaluates Vision statements 
    against institutional accreditation (NBA/ABET) standards.
    """
    
    FORBIDDEN_MISSION_WORDS = [
        "education", "teaching", "learning", "curriculum", 
        "delivering", "graduating", "faculty", "pedagogy"
    ]
    
    OPERATIONAL_VERBS = [
        "provide", "deliver", "empower", "cultivate", "develop", "train"
    ]
    
    ELITE_STARTS = [
        "to be recognized", "to achieve distinction", "to emerge as", 
        "to advance as", "to be globally respected", "to attain leadership"
    ]
    
    STRATEGIC_KEYWORDS = [
        "distinction", "excellence", "innovation", "leadership", 
        "societal impact", "sustainable", "global challenges", "pioneer"
    ]

    def calculate_score(self, vision: str) -> Dict[str, any]:
        score = 100
        violations = []
        lower_vision = vision.lower()
        
        # 1. Mission Leakage Check (Critical)
        found_mission = [w for w in self.FORBIDDEN_MISSION_WORDS if w in lower_vision]
        if found_mission:
            score -= (20 * len(found_mission))
            violations.append(f"Mission Leakage: detected '{found_mission[0]}'")
            
        # 2. Operational Verb Check
        found_ops = [v for v in self.OPERATIONAL_VERBS if lower_vision.startswith(v)]
        if found_ops:
            score -= 15
            violations.append(f"Operational Start: starts with '{found_ops[0]}'")
            
        # 3. Vision Start Phrase Check
        if not any(lower_vision.startswith(s) for s in self.ELITE_STARTS):
            score -= 10
            violations.append("Weak Phrasing: Does not use 'Elite Start' phrases (To be recognized, To achieve distinction, etc.)")
            
        # 4. Length Enforcements (Accreditation standard is 1-2 lines, ~18-25 words)
        words = vision.split()
        if len(words) < 15:
            score -= 15
            violations.append(f"Length Alert: Too short ({len(words)} words). Vision lacks depth.")
        elif len(words) > 30:
            score -= 10
            violations.append(f"Length Alert: Too wordy ({len(words)} words). Vision should be concise.")
            
        # 5. Strategic Weight (Bonus/Penalty)
        found_strategic = [k for k in self.STRATEGIC_KEYWORDS if k in lower_vision]
        if len(found_strategic) < 2:
            score -= 10
            violations.append("Low Impact: Lacks sufficient strategic keywords (excellence, innovation, etc.)")

        # Floor score at 0
        final_score = max(0, min(100, score))
        
        return {
            "score": final_score,
            "violations": violations,
            "is_elite": final_score >= 90
        }

# Singleton instance
classifier = StrategicClassifier()

def score_vision(vision: str) -> Dict[str, any]:
    return classifier.calculate_score(vision)
