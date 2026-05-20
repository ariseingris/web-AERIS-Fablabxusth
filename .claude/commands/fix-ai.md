Frontend /api/ai/* → local Gemma 3 4B isn't connecting. Backend on :5000.

Endpoints: chat-proxy, health, model-info, research, predict, report
Frontend entry: frontend/src/pages/AiPage.jsx

Run in order, stop at first failure and fix:

1. List frontend calls vs backend routes. Flag missing handlers.
2. Identify inference backend (ollama/lmstudio/llama.cpp). Verify it's running and the model tag matches.
3. curl each endpoint. Capture status + body.
4. Tail backend logs during curl. Capture errors.
5. Fix root cause. Re-test. Show diffs.

Report findings before editing. No questions until steps 1-4 done.