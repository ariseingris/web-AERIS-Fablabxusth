# Public Deployment — Cloudflare Tunnel (today only)

Quick tunnels are ephemeral — they expire when cloudflared stops or after ~24 h.
Keep all terminal processes alive until 9 pm, then run teardown.

---

## Step-by-step (open 4 terminals)

### Terminal 1 — Backend tunnel
```bash
cloudflared tunnel --url http://localhost:5000
```
Wait for a line like:
```
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://xxxx-xxxx-xxxx.trycloudflare.com
```
**Copy that URL** — you'll need it in the next step.

---

### Terminal 2 — Set frontend env vars
Edit `frontend/.env` and fill in the two values using the URL from Terminal 1:

```
VITE_API_URL=https://xxxx-xxxx-xxxx.trycloudflare.com
VITE_WS_URL=wss://xxxx-xxxx-xxxx.trycloudflare.com
```

Save the file.

---

### Terminal 3 — Start backend, frontend, simulator
```bash
cd ~/Desktop/web_design
./deploy_public.sh
```
This starts all three processes in the background and saves their PIDs to `.pids`.
Tail logs if needed:
```bash
tail -f backend.log
tail -f frontend.log
tail -f simulator.log
```

---

### Terminal 4 — Frontend tunnel (share this URL)
```bash
cloudflared tunnel --url http://localhost:5173
```
Wait for the public URL — **this is the URL you share with others**.

---

## Keep your machine awake until 9 pm
```bash
systemd-inhibit --what=sleep sleep 12h &
```

---

## Teardown
```bash
./stop_public.sh && killall cloudflared
```
Also revert `frontend/.env` values back to `http://localhost:5000` / `ws://localhost:5000/ws`
if you want local dev to work again without the tunnel.

---

## Notes
- MQTT (HiveMQ) and Supabase are already public — no tunnel needed.
- The vite proxy for `/ai` and `/health` targets `http://ai-service:5000` (Docker hostname).
  If running outside Docker, those proxy paths won't resolve; use the `VITE_API_URL` env var directly.
- Each new `cloudflared` run gives a **different** random URL — don't restart it during the session.
