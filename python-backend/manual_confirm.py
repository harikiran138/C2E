import sys
import os

# Add paths to allow imports
sys.path.append(os.getcwd())

from strategic_scoring import score_vision
from templates import generate_elite_fallback_visions
import asyncio

def test_auditor_strictness():
    print("--- 🛡️ MANUAL AUDITOR TEST ---")
    
    cases = [
        {
            "name": "Weak (Operational & Mission Leakage)",
            "text": "To provide high quality teaching and educate students in mechanical engineering."
        },
        {
            "name": "Weak (No Elite Start)",
            "text": "We will be a leading school of robotics in the next ten years."
        },
        {
            "name": "Elite (Accreditation Standard)",
            "text": "To be recognized as a premier global institution for Mechanical Engineering excellence through strategic leadership and societal impact."
        }
    ]
    
    for case in cases:
        audit = score_vision(case["text"])
        print(f"CASE: {case['name']}")
        print(f"TEXT: {case['text']}")
        print(f"SCORE: {audit['score']}/100")
        print(f"VIOLATIONS: {audit['violations']}")
        print(f"RESULT: {'✅ ELITE' if audit['is_elite'] else '❌ REJECTED'}\n")

def test_template_quality():
    print("--- 📋 TEMPLATE FALLBACK TEST ---")
    visions = generate_elite_fallback_visions("AI Engineering", 1)
    vision = visions[0]
    audit = score_vision(vision)
    print(f"TEMPLATE: {vision}")
    print(f"AUDIT SCORE: {audit['score']}/100 - {'✅ PASSED' if audit['is_elite'] else '❌ FAILED'}\n")

if __name__ == "__main__":
    test_auditor_strictness()
    test_template_quality()
