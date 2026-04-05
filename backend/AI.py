import os
from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/chat": {"origins": os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173")}})

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Server will not start.")

client = genai.Client(api_key=GEMINI_API_KEY)

MAX_MESSAGE_LENGTH = 1000
MODEL = "gemini-2.5-flash-lite"

def control_iot_device(device_name: str, action: str) -> dict:
    """
    Điều khiển thiết bị gia đình.
    device_name: tên thiết bị, ví dụ 'đèn phòng khách', 'quạt'.
    action: 'on' để bật, 'off' để tắt.
    """
    if action.lower() not in {"on", "off"}:
        return {"status": "Lỗi", "message": f"Hành động '{action}' không hợp lệ. Chỉ dùng 'on' hoặc 'off'."}
    print(f"[IoT] {action.upper()} → {device_name}")
    return {"status": "Thành công", "message": f"Đã {action} {device_name}."}


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

sessions: dict = {}


def get_or_create_chat(session_id: str, mode: str):
    if session_id not in sessions:
        sessions[session_id] = {}

    if mode not in sessions[session_id]:
        if mode == "control":
            sessions[session_id][mode] = client.chats.create(
                model=MODEL,
                config=types.GenerateContentConfig(
                    system_instruction=CONTROL_SYSTEM,
                    tools=[control_iot_device],
                ),
            )
        else:
            sessions[session_id][mode] = client.chats.create(
                model=MODEL,
                config=types.GenerateContentConfig(
                    system_instruction=CHAT_SYSTEM,
                ),
            )

    return sessions[session_id][mode]


@app.route('/chat', methods=['POST'])
def chat_with_agent():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON."}), 400

    data            = request.get_json(silent=True) or {}
    user_msg        = (data.get('message') or '').strip()
    session_id      = data.get('session_id', 'default')
    mode            = data.get('mode', 'chat')
    control_granted = data.get('control_granted', False)

    if not user_msg:
        return jsonify({"error": "Message cannot be empty."}), 400
    if len(user_msg) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Message too long. Max {MAX_MESSAGE_LENGTH} characters."}), 400
    if mode not in ('chat', 'control'):
        return jsonify({"error": "Invalid mode."}), 400
    if mode == 'control' and not control_granted:
        return jsonify({
            "error": "Quyền điều khiển chưa được cấp. Vui lòng xác nhận trong giao diện."
        }), 403

    chat = get_or_create_chat(session_id, mode)

    try:
        response = chat.send_message(user_msg)
        return jsonify({"reply": response.text})
    except Exception as e:
        print(f"[ERROR] Gemini failed (mode={mode}): {e}")
        return jsonify({"error": "AI service error. Please try again."}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    # ✅ FIXED: bind to 0.0.0.0 so Docker containers can reach this service
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)