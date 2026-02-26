from ml_engine import get_local_vision
from strategic_scoring import score_vision
import time

def final_dedicated_ml_confirmation():
    print("--- 🧠 DEDICATED LOCAL ML CONFIRMATION ---")
    start_time = time.time()
    
    program = "Cyber Security"
    focus = ["Threat Intelligence", "Global Defense"]
    
    print(f"Generating for {program}...")
    vision = get_local_vision(program, focus)
    duration = time.time() - start_time
    
    print(f"LOCAL ML OUTPUT: {vision}")
    print(f"GENERATION TIME: {duration:.2f}s")
    
    audit = score_vision(vision)
    print(f"STRATEGIC AUDIT: {audit['score']}/100 - {'✅ PASS' if audit['is_elite'] else '⚠️ BELOW ELITE'}")
    if audit['violations']:
        print(f"VIOLATIONS FOUND: {audit['violations']}")

if __name__ == "__main__":
    final_dedicated_ml_confirmation()
