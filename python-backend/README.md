# AI Vision/Mission Generation Backend

This FastAPI service handles the AI-powered generation of Program Vision and Mission statements using Google Gemini 1.5 Pro.

## Setup

1. **Environment Variables**:
   Ensure you have a `.env.local` or `.env` file in the root directory (or parent directory) with:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

2. **Installation**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Running the Server**:
   ```bash
   # Using Python 3.9+ 
   python3 -m uvicorn main:app --host 0.0.0.0 --port 8001
   ```

## API Endpoint

### `POST /ai/generate-vision-mission`

Generates a Vision and Mission statement based on program and institutional context.

**Request Body**:
```json
{
  "program_name": "string",
  "institute_vision": "string",
  "institute_mission": "string",
  "vision_inputs": ["string"],
  "mission_inputs": ["string"]
}
```

**Response**:
```json
{
  "vision": "Generated Vision string",
  "mission": "Generated Mission string"
}
```
