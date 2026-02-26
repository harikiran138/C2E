import requests
import json

def test_generate_vm():
    url = "http://localhost:8001/ai/generate-vision-mission"
    payload = {
        "program_name": "Mechanical Engineering",
        "institute_vision": "To be a premier institution of global excellence.",
        "institute_mission": "Providing quality education and fostering research.",
        "vision_inputs": ["sustainable technologies", "industry leadership"],
        "mission_inputs": ["hands-on learning", "ethical practices"],
        "vision_count": 100
    }
    
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("\nGenerated Vision (should be refined):")
            print(data.get("vision"))
            print("\nAll Visions:")
            print(json.dumps(data.get("visions"), indent=2))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_generate_vm()
