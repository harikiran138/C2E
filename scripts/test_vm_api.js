
async function testVisionMissionAPI() {
    const fetch = (await import('node-fetch')).default;
    
    // Assuming the app is running on localhost:3000
    const url = 'http://localhost:3000/api/ai/generate-vision-mission';
    
    const payload = {
        program_name: "Computer Science Engineering",
        institute_vision: "To be a global leader in education.",
        institute_mission: "To provide quality education.",
        vision_inputs: ["Innovation", "Excellence"],
        mission_inputs: ["Research", "Development"],
        vision_instructions: "Include the word 'Quantum' in the vision.",
        mission_instructions: "Include the phrase 'hands-on coding' in the mission."
    };

    try {
        console.log("Testing Vision & Mission API with custom instructions...");
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            console.log("\n--- Generated Vision ---");
            console.log(data.vision);
            console.log("\n--- Generated Mission ---");
            console.log(data.mission);
            
            if (data.vision && data.vision.includes("Quantum")) {
                console.log("\nSUCCESS: Vision instruction was followed.");
            } else {
                console.log("\nWARNING: Vision instruction 'Quantum' NOT found.");
            }
            
            if (data.mission && data.mission.toLowerCase().includes("hands-on coding")) {
                console.log("SUCCESS: Mission instruction was followed.");
            } else {
                console.log("WARNING: Mission instruction 'hands-on coding' NOT found.");
            }
            
        } else {
            const text = await response.text();
            console.error("API Error:", response.status, text);
        }
    } catch (error) {
        console.error("Connection Error:", error);
    }
}

testVisionMissionAPI();
