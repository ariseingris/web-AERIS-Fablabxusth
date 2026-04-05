# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aeris** — a full-stack IoT management platform with an AI chat assistant. Three containerized services communicate over HTTP, WebSocket, and MQTT.

```
Frontend (React/Vite :5173)
  ↕ HTTP proxy /chat → AI Service (Flask/Gemini :5001)
  ↕ WebSocket ws://backend:5000/ws
Backend (Express.js :5000)
  ↕ MQTT over TLS → HiveMQ Cloud broker
AI Service (Flask :5001)
  ↕ Google Gemini API
Shared: Supabase (Auth + PostgreSQL)
```

## Commands

### Docker (recommended — runs all three services)
```bash
docker-compose up              # start everything
docker-compose up --build      # rebuild images then start
docker-compose logs -f api     # backend logs
docker-compose logs -f client  # frontend logs
docker-compose logs -f ai-service
```

### Frontend (standalone)
```bash
cd frontend
npm install
npm run dev        # Vite dev server on :5173
npm run build      # production build → dist/
npm run lint       # ESLint
npm test           # Vitest
npm run test:ui    # Vitest interactive UI
```

### Backend (standalone)
```bash
cd backend
npm install
npm run dev        # nodemon, auto-reload on :5000
npm start          # production
```

### AI Service (standalone)
```bash
cd backend
pip install -r requirements.txt
python AI.py       # Flask on 0.0.0.0:5000 (maps to :5001 in compose)
```

### IoT Simulator
```bash
python simulator.py   # publishes fake sensor data every 5s to MQTT
```

## Architecture

### Data Flow: IoT Device → UI
1. Physical device publishes to `devices/{id}/status` or `devices/{id}/sensors/#` on HiveMQ.
2. `backend/mqttBridge.js` subscribes to those topics and relays payloads to all connected WebSocket clients as `device_data` messages.
3. The `frontend/src/hooks/useMqttBridge.js` hook consumes the WebSocket and updates React state.
4. `frontend/src/pages/IoTDashboard.jsx` renders live sensor cards.

### Data Flow: AI Chat
1. `frontend/src/pages/AiPage.jsx` sends `POST /chat` (proxied by Vite dev server / nginx in prod) to the AI service.
2. `backend/AI.py` maintains per-`session_id` conversation history and calls the Gemini API.
3. **Chat mode**: friendly assistant, no device control.  
   **Control mode**: Gemini may call the `control_iot_device` function tool; the AI service handles it and returns the action result in the reply.

### WebSocket Message Protocol (`mqttBridge.js`)
| Direction | Type | Purpose |
|---|---|---|
| Client → Server | `register_device` | subscribe to a new device's MQTT topics |
| Client → Server | `remove_device` | unsubscribe + remove from registry |
| Client → Server | `toggle_power` | publish power command to device |
| Client → Server | `control` | publish arbitrary command/value |
| Server → Client | `init` | sent on connect — broker status + device list |
| Server → Client | `device_data` | live sensor / status update |
| Server → Client | `broker_status` | MQTT broker connection state change |

### Authentication
Supabase Auth. `frontend/src/supabaseClient.js` initialises the client. `App.jsx` gates all `/dashboard/*` routes behind a session check.

### Theme System
`frontend/src/hooks/useColors.js` returns a palette of ~40 tokens that respond to dark/light/system preference. Use this hook instead of hardcoding Tailwind colour classes for theme-aware components.

## Key Files

| File | Role |
|---|---|
| `backend/mqttBridge.js` | MQTT ↔ WebSocket bridge; owns in-memory `deviceRegistry` and `deviceState` |
| `backend/AI.py` | Flask AI service; Gemini chat + function-calling for device control |
| `backend/index.js` | Express entry point; mounts mqttBridge and `/api/health` |
| `frontend/src/pages/IoTDashboard.jsx` | Full IoT device management UI |
| `frontend/src/pages/AiPage.jsx` | Two-mode AI chat UI with permission modal |
| `frontend/src/hooks/useMqttBridge.js` | WebSocket hook, auto-reconnects every 3.5 s |
| `frontend/src/App.jsx` | Router, auth guard, layout |
| `vite.config.js` | Dev proxy: `/chat` → `ai-service:5000`, polling watcher for Docker |

## Environment Variables

Three separate `.env` files are required (root, `backend/`, `frontend/`):

| Variable | Used by |
|---|---|
| `SUPABASE_URL` / `SUPABASE_KEY` | backend, AI service |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` | frontend (public anon key) |
| `GEMINI_API_KEY` | AI service (`backend/AI.py`) |
| `MQTT_BROKER` / `MQTT_USERNAME` / `MQTT_PASSWORD` | backend MQTT client |
| `ALLOWED_ORIGIN` | AI service CORS (set to frontend origin) |
| `FLASK_DEBUG` | AI service debug mode |
| `VITE_WS_URL` | frontend WebSocket URL |
