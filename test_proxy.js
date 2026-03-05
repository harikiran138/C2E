const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/ai_proxy/ai/generate-vision-mission',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${data.substring(0, 200)}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({
    mode: "vision",
    program_name: "CSE",
    institute_vision: "test",
    institute_mission: "test",
    vision_inputs: ["A"],
    mission_inputs: [],
    vision_count: 3,
    exclude_visions: ["test"]
}));
req.end();
