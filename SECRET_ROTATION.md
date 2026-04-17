# Secret Rotation Checklist — AERIS

**Trigger:** .env files were committed to git history. Treat all values below as compromised.
**Date discovered:** 2026-04-17

---

## 1. Supabase Anon Key (`SUPABASE_ANON_KEY` / `SUPABASE_KEY` / `VITE_SUPABASE_ANON_KEY`)

| Item | Detail |
|---|---|
| **Rotate at** | https://supabase.com/dashboard → Project → Settings → API → Regenerate anon key |
| **Update in** | `backend/.env`, `frontend/.env`, root `.env` |
| **Restart** | Backend Node.js service, Frontend dev server / rebuild |

---

## 2. Supabase Service Role Key (`SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`)

| Item | Detail |
|---|---|
| **Rotate at** | https://supabase.com/dashboard → Project → Settings → API → Regenerate service_role key |
| **Update in** | `backend/.env` |
| **Restart** | Backend Node.js service |
| **Risk** | Service role key bypasses Row Level Security — rotate this first |

---

## 3. Gemini API Key (`GEMINI_API_KEY`)

| Item | Detail |
|---|---|
| **Rotate at** | https://aistudio.google.com/app/apikey → Delete old key → Create new |
| **Update in** | `backend/.env`, root `.env` |
| **Restart** | AI Flask service (`backend/AI.py`) |

---

## 4. HiveMQ MQTT Password (`MQTT_PASSWORD`)

| Item | Detail |
|---|---|
| **Rotate at** | https://console.hivemq.cloud → Cluster → Access Management → Users → Change password for user |
| **Update in** | `backend/.env` |
| **Restart** | Backend Node.js MQTT bridge (`mqttBridge.js`) |
| **Also fix** | `simulator.py` line 10 — hardcoded `PASS` must be moved to env var and updated |

---

## 5. HiveMQ Username (`MQTT_USERNAME`)

| Item | Detail |
|---|---|
| **Note** | Username is not a secret but document for completeness |
| **Rotate at** | https://console.hivemq.cloud → create new user if needed |
| **Update in** | `backend/.env`, `simulator.py` |

---

## simulator.py — Hardcoded Credentials (URGENT)

Lines 7–10 of `simulator.py` contain HiveMQ HOST, USER, and PASS as literals in tracked source code.

**Fix:**
```python
import os
from dotenv import load_dotenv
load_dotenv()

HOST = os.environ["MQTT_BROKER_HOST"]
USER = os.environ["MQTT_USERNAME"]
PASS = os.environ["MQTT_PASSWORD"]
```

---

## Rotation Order (priority)

1. Supabase service role key (highest privilege)
2. HiveMQ password (exposed in both `backend/.env` and `simulator.py` source)
3. Supabase anon key
4. Gemini API key

---

## Post-rotation Checklist

- [ ] All .env files updated with new values
- [ ] Backend restarted
- [ ] Frontend rebuilt / redeployed
- [ ] AI service restarted
- [ ] simulator.py creds moved to env vars
- [ ] `git filter-repo` history scrub executed (see SECRETS_AUDIT.md Step 5)
- [ ] Force-push completed and team notified
- [ ] Old credentials revoked/deleted from provider dashboards
