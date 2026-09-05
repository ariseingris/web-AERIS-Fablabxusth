#!/usr/bin/env python3
"""
test_model.py — Kiểm tra model qwen3.5:latest qua Ollama API.
Đo response time, in ra kết quả để xác nhận model hoạt động và hiểu tiếng Việt.

Chạy: python3 test_model.py
"""

import time
import json
import urllib.request
import urllib.error

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "qwen3.5:latest"
TEST_QUESTION = "Bạn có thể phân tích dữ liệu chất lượng không khí không?"

def test_model():
    print("=" * 60)
    print(f"🧪 Test Ollama Model: {MODEL}")
    print(f"🔗 Endpoint : {OLLAMA_URL}")
    print(f"❓ Câu hỏi : {TEST_QUESTION}")
    print("=" * 60)

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": TEST_QUESTION}
        ],
        "stream": False
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    t_start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            t_end = time.perf_counter()
            elapsed = t_end - t_start

            raw = resp.read().decode("utf-8")
            data = json.loads(raw)

            reply = data.get("message", {}).get("content", "(no content)")
            model_used = data.get("model", "unknown")
            eval_count = data.get("eval_count", "?")
            prompt_eval_count = data.get("prompt_eval_count", "?")
            eval_duration_ns = data.get("eval_duration", 0)
            tokens_per_sec = (eval_count / (eval_duration_ns / 1e9)) if eval_duration_ns else 0

            print(f"\n✅ SUCCESS")
            print(f"   Model     : {model_used}")
            print(f"   Wall time : {elapsed:.2f}s")
            print(f"   Tokens    : {eval_count} tokens (prompt: {prompt_eval_count})")
            print(f"   Speed     : {tokens_per_sec:.1f} tok/s")
            print(f"\n📝 Response:\n{'-'*60}")
            print(reply)
            print("-" * 60)

            # Verdict
            if elapsed < 10:
                verdict = "🚀 Rất nhanh — quay video mượt không vấn đề"
            elif elapsed < 30:
                verdict = "✅ Ổn — quay video được, có thể cần chờ chút"
            else:
                verdict = "⚠️  Chậm — cân nhắc dùng model nhỏ hơn cho video demo"

            print(f"\n⏱  Verdict: {verdict}")

    except urllib.error.URLError as e:
        t_end = time.perf_counter()
        print(f"\n❌ CONNECTION ERROR sau {t_end - t_start:.2f}s")
        print(f"   Lỗi: {e.reason}")
        print(f"\n   Kiểm tra:")
        print(f"   1. Ollama có đang chạy không? → ollama serve")
        print(f"   2. Model đã pull chưa? → ollama pull {MODEL}")
        print(f"   3. CORS: OLLAMA_ORIGINS=http://localhost:5173 nếu frontend gọi thẳng")
    except json.JSONDecodeError as e:
        print(f"\n❌ JSON PARSE ERROR: {e}")
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")

if __name__ == "__main__":
    test_model()
