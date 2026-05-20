# Fix AI Connection to Local Gemma 3 4B

Systematically diagnose why the frontend can't reach the local Gemma model through the backend proxy.

## Context
- Backend: Node on port 5000 (MQTT + WS already working)
- Frontend: React, calls /api/ai/chat-proxy, /health, /model-info, /research, /predict, /report
- Model: Gemma 3 4B running locally (likely via Ollama, llama.cpp, or LM Studio)

## Diagnostic steps (run all before fixing)

### 1. Route inventory
- Grep frontend for every /api/ai/* call
- Grep backend for every router.get/post under /api/ai
- Produce a table: endpoint | frontend uses | backend registered | handler file

### 2. Model server check
- Search codebase for the inference backend: "ollama", "11434", "1234" (LM Studio), "8080" (llama.cpp), "gemma"
- Check if that process is running: `ss -tlnp | grep -E "11434|1234|8080"` or `curl` the model server's health/tags endpoint
- Confirm the exact model tag loaded (e.g. `gemma3:4b`, `gemma-3-4b-it`)

### 3. Live endpoint test
For each /api/ai/* route, run:
curl -v -X POST http://localhost:5000/api/ai/<route> 
-H "Content-Type: application/json" 
-d '{"message":"hello"}'
Record status code and response body for each.

### 4. Backend log inspection
Tail `/tmp/aeris-node.log` while hitting endpoints. Capture any stack traces, ECONNREFUSED, model-not-found errors.

## Report findings
Before touching code, output:
- Missing routes (if any)
- Model server status
- The specific failure mode (wrong URL, wrong model name, route not mounted, CORS, etc.)

## Fix
Apply the minimal fix for the identified root cause. Common patterns:
- Model server not running → add a startup check + helpful error message, document how to start it
- Wrong model tag → correct the string in the backend call
- Route not mounted → add `app.use('/api/ai', aiRouter)` in index.js
- Inconsistent BASE_URL in AiPage.jsx → unify to use one base (recommend Vite proxy so frontend uses relative /api/ai/*)
- CORS → configure cors() middleware for the frontend origin

## Verify
- Re-run all six curl tests, show 200s
- Load the frontend AI page, confirm a real response streams back from Gemma
- Show the diff of every file changed