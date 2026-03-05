import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/ai_proxy/ai/generate-vision-mission',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', body.substring(0, 500));
  });
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
