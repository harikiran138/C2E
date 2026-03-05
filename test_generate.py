import requests
import json

payload = {
    "mode": "vision",
    "program_name": "CSE",
    "institute_vision": "test",
    "institute_mission": "test",
    "vision_inputs": ["A"],
    "mission_inputs": [],
    "vision_count": 3,
    "exclude_visions": ["test"]
}

res = requests.post("http://localhost:8001/ai/generate-vision-mission", json=payload)
print(res.status_code)
print(res.text)
