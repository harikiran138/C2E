import requests
import json
import time

def verify_diversity():
    url = "http://localhost:8001/ai/generate-vision-mission"
    
    payload = {
        "program_name": "Artificial Intelligence",
        "institute_vision": "Global leadership in tech.",
        "institute_mission": "Innovation first.",
        "vision_inputs": ["human-centric ai", "ethical governance"],
        "mission_inputs": ["hands-on projects"],
        "vision_count": 1,
        "mode": "vision"
    }
    
    print("=== C2E DIVERSITY & UNIQUE OUTPUT TEST ===\n")
    outputs = []
    
    for i in range(3):
        print(f"Request {i+1}...")
        try:
            response = requests.post(url, json=payload, timeout=60)
            data = response.json()
            vision = data.get("vision", "ERROR")
            print(f"  Result: {vision}")
            outputs.append(vision)
            # Short sleep to ensure time-based seeds differ if resolution is low (though time() is high res)
            time.sleep(0.5)
        except Exception as e:
            print(f"  FAILED: {str(e)}")
            
    print("\n--- Summary ---")
    unique_count = len(set(outputs))
    print(f"Total Requests: {len(outputs)}")
    print(f"Unique Visions: {unique_count}")
    
    if unique_count == len(outputs):
        print("✅ SUCCESS: All outputs are unique!")
    elif unique_count > 1:
        print("⚠️ PARTIAL SUCCESS: Multiple visions generated, but some duplicates found.")
    else:
        print("❌ FAILED: All visions are identical.")

if __name__ == "__main__":
    verify_diversity()
