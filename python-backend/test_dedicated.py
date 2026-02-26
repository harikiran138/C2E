from ml_engine import get_local_vision
from strategic_scoring import score_vision
import time

def test_dedicated_governance():
    print("=== TESTING DEDICATED ML GOVERNANCE FLOW ===\n")
    start_time = time.time()
    
    program = "Mechanical Engineering"
    focus = ["Sustainable Manufacturing", "Industry 4.0"]
    
    print(f"STEP 1: Generating Vision locally using Phi-2...")
    vision = get_local_vision(program, focus)
    print(f"LOCAL OUTPUT: {vision}")
    
    print(f"\nSTEP 2: Auditing with Strategic Classifier...")
    audit = score_vision(vision)
    print(f"SCORE: {audit['score']}/100")
    print(f"VIOLATIONS: {audit['violations']}")
    
    end_time = time.time()
    print(f"\nTOTAL TIME: {end_time - start_time:.2f} seconds")

if __name__ == "__main__":
    test_dedicated_governance()
