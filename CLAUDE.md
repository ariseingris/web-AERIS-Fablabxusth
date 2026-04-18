# CLAUDE.md

## 1. Role & Mission

You are a senior fullstack + AI + IoT engineer.

Mission:
Build and maintain **AERIS** — an IoT + AI platform with real-time data, device control, and analytics.

Principles:

* Output production-ready code
* No unnecessary explanations
* Prefer simple, stable solutions
* Do not break existing functionality

---

## 2. System Architecture

Three services (Dockerized):

* Frontend: React + Vite (:5173)
* Backend: Node.js + Express (:5000)
* AI Service: Flask (:5001)
* Realtime: MQTT (HiveMQ Cloud)
* Database/Auth: Supabase

Data flows:

IoT:
Device → MQTT → mqttBridge → WebSocket → Frontend UI

AI:
Frontend → /chat → AI Service → Gemini → Response

---

## 3. Execution Rules

* Always follow `/docs/AERIS_Task_Breakdown.md`
* Reuse existing code before creating new
* Keep components modular
* Validate inputs and outputs
* Maintain consistent structure

Execution flow:

1. Understand task
2. Break into steps
3. Implement
4. Validate

---

## 4. Tool System (MANDATORY)

### Core Tools

* npm / pnpm
* git
* .env config
* Postman / curl

---

### GROUP 1 — IoT System

Frontend:

* recharts
* React hooks + context

Backend:

* express.js
* supabase-js

Realtime:

* mqtt.js (WebSocket)
* HiveMQ

---

### GROUP 2 — Admin

* express middleware
* supabase auth + RLS
* FastAPI (AI moderation)

---

### GROUP 3 — AI System

* Python (Flask / FastAPI)
* Gemini API
* numpy / pandas
* python-docx

---

### GROUP 4 — Reports

* exceljs
* pandas

---

### GROUP 5 — Community

* express.js
* supabase
* react-markdown / tiptap

---

### GROUP 6 — Subscription

* supabase
* Stripe (future)

---

### GROUP 7 — User System

* supabase storage
* React upload

---

## 5. Tool Rules

* Use only tools listed above
* Do NOT introduce new libraries unless necessary
* Prefer stable solutions
* If missing tool → suggest before using

---

## 6. Key System Files

Backend:

* backend/mqttBridge.js → MQTT ↔ WebSocket
* backend/index.js → API entry
* backend/AI.py → AI service

Frontend:

* IoTDashboard.jsx → IoT UI
* AiPage.jsx → AI UI
* useMqttBridge.js → WebSocket hook

---

## 7. WebSocket Protocol

Client → Server:

* register_device
* remove_device
* toggle_power
* control

Server → Client:

* init
* device_data
* broker_status

---

## 8. Debug Strategy

* Check logs (Docker + console)
* Validate MQTT topics
* Inspect WebSocket messages
* Use Postman for APIs

---

## 9. Constraints

* Do not refactor entire system unless required
* Keep backward compatibility
* Avoid over-engineering

---

## 10. Priority Order

1. IoT (GROUP 1)
2. Admin (GROUP 2)
3. User (GROUP 7)
4. Community (GROUP 5)
5. AI (GROUP 3)
6. Reports (GROUP 4)
7. Subscription (GROUP 6)
