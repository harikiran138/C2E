import requests
import json
import time

def verify_enterprise_governance():
    url = "http://localhost:8001/ai/generate-vision-mission"
    
    # We use a program that often triggers mission leakage in simple LLMs
    payload = {
        "program_name": "Hospitality Management",
        "institute_vision": "Excellence in leadership and community impact.",
        "institute_mission": "Providing hands-on vocational training.",
        "vision_inputs": ["culinary skills", "customer service", "vocational excellence"],
        "mission_inputs": ["cooking labs", "internships"],
        "vision_count": 1,
        "mode": "vision"
    }
    
    print("=== C2E ENTERPRISE GOVERNANCE VERIFICATION ===\n")
    print(f"Testing Department: {payload['program_name']}")
    print(f"Inputs: {payload['vision_inputs']} (High Risk of Mission Leakage)")
    
    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=90)
        data = response.json()
        end_time = time.time()
        
        vision = data.get("vision", "ERROR")
        print(f"\nFINAL OUTPUT: {vision}")
        print(f"TIME TAKEN: {end_time - start_time:.2f}s")
        
        # Verify with local auditor
        from strategic_scoring import score_vision
        audit = score_vision(vision)
        print(f"FINAL AUDIT SCORE: {audit['score']}/100")
        print(f"ELITE STATUS: {'✅ PASSED (90+)' if audit['is_elite'] else '❌ FAILED'}")
        if audit['violations']:
            print(f"VIOLATIONS: {audit['violations']}")
            
    except Exception as e:
        print(f"TEST FAILED: {str(e)}")

if __name__ == "__main__":
    verify_enterprise_governance()
