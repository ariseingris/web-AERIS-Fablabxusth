import os
import re
import time
import json
from collections import defaultdict
from threading import Lock
from dotenv import load_dotenv
load_dotenv()

import ollama
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/ai/*": {"origins": os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173")}})

MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:3b')  # Change to your model name if different
START_TIME = time.time()
MODEL_LOADED_AT = None
MODEL_STATUS = "loading"  # "ready" | "error"

MAX_MESSAGE_LENGTH = 1000

# ── Session management ────────────────────────────────────────────────────────
SESSION_TTL  = 1800   # 30 min of inactivity before expiry
MAX_SESSIONS = 500

sessions:           dict = {}
session_timestamps: dict = {}
sessions_lock = Lock()

# ── Rate limiting ─────────────────────────────────────────────────────────────
request_counts: dict = defaultdict(list)
RATE_LIMIT  = 20
RATE_WINDOW = 60

# ── Session-id validation ─────────────────────────────────────────────────────
VALID_SESSION_RE = re.compile(r'^[a-zA-Z0-9_\-]{1,64}$')

# ── System prompts ────────────────────────────────────────────────────────────
CHAT_SYSTEM = (
    "Bạn là trợ lý AI thân thiện. Hãy trò chuyện tự nhiên, hữu ích và thân thiết. "
    "Bạn KHÔNG có quyền điều khiển thiết bị. Nếu người dùng yêu cầu điều khiển thiết bị, "
    "hãy hướng dẫn họ chuyển sang chế độ 'Điều khiển thiết bị' trong giao diện."
)

CONTROL_SYSTEM = (
    "Bạn là quản gia thông minh với quyền điều khiển thiết bị IoT. "
    "Bạn có thể bật/tắt đèn, quạt và các thiết bị trong nhà bằng công cụ control_iot_device. "
    "Hãy thực thi lệnh chính xác và báo cáo kết quả rõ ràng cho người dùng."
)

# ── IoT tool definition for ollama ────────────────────────────────────────────
IOT_TOOL = {
    'type': 'function',
    'function': {
        'name': 'control_iot_device',
        'description': 'Điều khiển thiết bị gia đình. Dùng để bật hoặc tắt thiết bị.',
        'parameters': {
            'type': 'object',
            'properties': {
                'device_name': {
                    'type': 'string',
                    'description': 'Tên thiết bị, ví dụ: đèn phòng khách, quạt.',
                },
                'action': {
                    'type': 'string',
                    'enum': ['on', 'off'],
                    'description': "Hành động: 'on' để bật, 'off' để tắt.",
                },
            },
            'required': ['device_name', 'action'],
        },
    },
}


def control_iot_device(device_name: str, action: str) -> dict:
    if action.lower() not in {'on', 'off'}:
        return {'status': 'Lỗi', 'message': f"Hành động '{action}' không hợp lệ. Chỉ dùng 'on' hoặc 'off'."}
    print(f'[IoT] {action.upper()} → {device_name}')
    return {'status': 'Thành công', 'message': f'Đã {action} {device_name}.'}


def cleanup_sessions():
    """Expire sessions idle longer than SESSION_TTL. Must be called under sessions_lock."""
    now = time.time()
    expired = [sid for sid, ts in session_timestamps.items() if now - ts > SESSION_TTL]
    for sid in expired:
        sessions.pop(sid, None)
        session_timestamps.pop(sid, None)


def get_history(session_id: str, mode: str) -> list:
    """Return the message history list for a session+mode, creating it if needed."""
    with sessions_lock:
        cleanup_sessions()
        if len(sessions) >= MAX_SESSIONS and session_id not in sessions:
            oldest = min(session_timestamps, key=session_timestamps.get)
            sessions.pop(oldest, None)
            session_timestamps.pop(oldest, None)
        session_timestamps[session_id] = time.time()
        if session_id not in sessions:
            sessions[session_id] = {}
        if mode not in sessions[session_id]:
            system = CONTROL_SYSTEM if mode == 'control' else CHAT_SYSTEM
            sessions[session_id][mode] = [{'role': 'system', 'content': system}]
        return sessions[session_id][mode]


def is_rate_limited(identifier: str) -> bool:
    now = time.time()
    window_start = now - RATE_WINDOW
    request_counts[identifier] = [ts for ts in request_counts[identifier] if ts > window_start]
    if len(request_counts[identifier]) >= RATE_LIMIT:
        return True
    request_counts[identifier].append(now)
    return False


def chat_ollama(history: list, use_tools: bool) -> str:
    """
    Send history to ollama, handle tool calls if any, and return the final text reply.
    Mutates `history` in place by appending assistant + tool messages.
    """
    kwargs = {'model': MODEL, 'messages': history}
    if use_tools:
        kwargs['tools'] = [IOT_TOOL]

    response = ollama.chat(**kwargs)
    msg = response.message

    # Build a serialisable dict for the assistant turn
    asst_entry: dict = {'role': 'assistant', 'content': msg.content or ''}
    if msg.tool_calls:
        asst_entry['tool_calls'] = [
            {'function': {'name': tc.function.name, 'arguments': tc.function.arguments}}
            for tc in msg.tool_calls
        ]
    history.append(asst_entry)

    # Execute tools and fetch final reply
    if use_tools and msg.tool_calls:
        for tc in msg.tool_calls:
            args = tc.function.arguments or {}
            result = control_iot_device(**args)
            history.append({'role': 'tool', 'content': json.dumps(result, ensure_ascii=False)})
        follow = ollama.chat(model=MODEL, messages=history)
        final_msg = follow.message
        history.append({'role': 'assistant', 'content': final_msg.content or ''})
        return final_msg.content or ''

    return msg.content or ''


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/ai/chat', methods=['POST'])
def chat_with_agent():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if is_rate_limited(client_ip):
        return jsonify({'error': 'Too many requests. Please wait.'}), 429

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON.'}), 400

    data            = request.get_json(silent=True) or {}
    user_msg        = (data.get('message') or '').strip()
    session_id      = data.get('session_id', 'default')
    if not VALID_SESSION_RE.match(str(session_id)):
        session_id = 'default'
    mode            = data.get('mode', 'chat')
    control_granted = data.get('control_granted', False)

    if not user_msg:
        return jsonify({'error': 'Message cannot be empty.'}), 400
    if len(user_msg) > MAX_MESSAGE_LENGTH:
        return jsonify({'error': f'Message too long. Max {MAX_MESSAGE_LENGTH} characters.'}), 400
    if mode not in ('chat', 'control'):
        return jsonify({'error': 'Invalid mode.'}), 400
    if mode == 'control' and not control_granted:
        return jsonify({'error': 'Quyền điều khiển chưa được cấp. Vui lòng xác nhận trong giao diện.'}), 403

    history = get_history(session_id, mode)
    history.append({'role': 'user', 'content': user_msg})

    try:
        reply = chat_ollama(history, use_tools=(mode == 'control'))
        return jsonify({'reply': reply})
    except Exception as e:
        # Roll back the user message so history stays consistent
        history.pop()
        print(f'[ERROR] ollama failed (mode={mode}): {e}')
        return jsonify({'error': f'AI service error: {e}'}), 500


@app.route('/ai/research', methods=['POST'])
def ai_research():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if is_rate_limited(client_ip):
        return jsonify({'error': 'Too many requests. Please wait.'}), 429

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON.'}), 400

    data  = request.get_json(silent=True) or {}
    query = (data.get('query') or '').strip()
    if not query:
        return jsonify({'error': 'Query cannot be empty.'}), 400

    try:
        prompt = (
            'Perform research and provide information about the following topic, '
            f'focusing on plants/crops if applicable:\n{query}'
        )
        response = ollama.chat(model=MODEL, messages=[{'role': 'user', 'content': prompt}])
        return jsonify({'result': response.message.content})
    except Exception as e:
        print(f'[ERROR] ollama research failed: {e}')
        return jsonify({'error': f'AI service error: {e}'}), 500


@app.route('/ai/predict', methods=['POST'])
def ai_predict():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if is_rate_limited(client_ip):
        return jsonify({'error': 'Too many requests. Please wait.'}), 429

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON.'}), 400

    data           = request.get_json(silent=True) or {}
    user_confirmed = data.get('user_confirmed', False)
    if not user_confirmed:
        return jsonify({'error': 'Permission denied. user_confirmed flag is required.'}), 403

    try:
        prompt = (
            'Analyze crop health and weather conditions based on simulated IoT data '
            'and provide a prediction for the next 7 days.'
        )
        response = ollama.chat(model=MODEL, messages=[{'role': 'user', 'content': prompt}])
        return jsonify({'prediction': response.message.content})
    except Exception as e:
        print(f'[ERROR] ollama predict failed: {e}')
        return jsonify({'error': f'AI service error: {e}'}), 500


@app.route('/ai/report', methods=['POST'])
def ai_report():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if is_rate_limited(client_ip):
        return jsonify({'error': 'Too many requests. Please wait.'}), 429

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON.'}), 400

    data           = request.get_json(silent=True) or {}
    user_confirmed = data.get('user_confirmed', False)
    fmt            = data.get('format', 'markdown')
    if not user_confirmed:
        return jsonify({'error': 'Permission denied. user_confirmed flag is required.'}), 403

    try:
        prompt = f'Generate a comprehensive agricultural report based on recent system data. Format: {fmt}'
        response = ollama.chat(model=MODEL, messages=[{'role': 'user', 'content': prompt}])
        return jsonify({'report': response.message.content, 'format': fmt})
    except Exception as e:
        print(f'[ERROR] ollama report failed: {e}')
        return jsonify({'error': f'AI service error: {e}'}), 500


@app.route('/ai/moderate', methods=['POST'])
def ai_moderate():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if is_rate_limited(client_ip):
        return jsonify({'error': 'Too many requests. Please wait.'}), 429

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON.'}), 400

    data = request.get_json(silent=True) or {}
    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({'error': 'Text cannot be empty.'}), 400

    try:
        prompt = (
            "Evaluate the following text and classify it as exactly one of these labels: "
            "'safe', 'uncertain', or 'harmful'. Return only the label.\n\nText: " + text
        )
        response = ollama.chat(model=MODEL, messages=[{'role': 'user', 'content': prompt}])
        label = response.message.content.strip().lower()
        if label not in ('safe', 'uncertain', 'harmful'):
            label = 'uncertain'
        return jsonify({'classification': label})
    except Exception as e:
        print(f'[ERROR] ollama moderation failed: {e}')
        return jsonify({'error': f'AI service error: {e}'}), 500


@app.route('/health', methods=['GET'])
@app.route('/ai/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'active_sessions': len(sessions),
        'model': MODEL,
        'model_status': MODEL_STATUS,
        'uptime_seconds': round(time.time() - START_TIME),
    }), 200


@app.route('/ai/model-info', methods=['GET'])
def model_info():
    return jsonify({
        'model': MODEL,
        'version': MODEL,
        'provider': 'ollama',
        'status': MODEL_STATUS,
        'loaded_at': MODEL_LOADED_AT,
        'uptime_seconds': round(time.time() - START_TIME),
    }), 200


def _startup_check():
    global MODEL_STATUS, MODEL_LOADED_AT
    try:
        resp = ollama.chat(model=MODEL, messages=[{'role': 'user', 'content': 'ping'}])
        _ = resp.message.content  # force evaluation
        MODEL_STATUS = 'ready'
        MODEL_LOADED_AT = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        print(f'[AI] Qwen2.5:3b ready at {MODEL_LOADED_AT}')
    except Exception as e:
        MODEL_STATUS = 'error'
        print(f'[AI] Startup check FAILED: {e}')


if __name__ == '__main__':
    _startup_check()
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=5001, debug=debug_mode)
