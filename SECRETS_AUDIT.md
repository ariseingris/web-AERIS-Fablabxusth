# Secrets Audit — AERIS

**Date:** 2026-04-17

## Tracked .env files (CRITICAL)

All three files were committed to git and are **publicly readable in history**:

| File | Status |
|---|---|
| `.env` | Tracked — in 3 commits |
| `backend/.env` | Tracked — in 3 commits |
| `frontend/.env` | Tracked — in 3 commits |

## Git history exposure

Commits that contain .env data:
- `9e8fae1` — significant fix but not enough
- `667b484` — fix
- `7116d95` — little fix

**These commits must be scrubbed with `git filter-repo` if the repo is or was public.**

## Secret keys exposed

### `.env` (root)
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `GEMINI_API_KEY`
- `ALLOWED_ORIGIN`
- `FLASK_DEBUG`

### `backend/.env`
- `PORT`
- `AI_SERVICE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `ALLOWED_ORIGIN`
- `FLASK_DEBUG`
- `MQTT_BROKER`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`

### `frontend/.env`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AI_URL`
- `VITE_WS_URL`
- `VITE_API_URL`

### `simulator.py` (hardcoded — separate issue)
- HiveMQ HOST, USER, PASS are hardcoded directly in source (line 7–10)
- **Rotate HiveMQ credentials immediately**

## Remediation status

- [x] `SECRETS_AUDIT.md` created (this file)
- [ ] `.gitignore` fixed in root, backend, frontend
- [ ] `.env` files untracked
- [ ] `.env.example` templates created
- [ ] `git filter-repo` history scrub (requires force-push, see Step 5)
- [ ] `SECRET_ROTATION.md` created
- [ ] Pre-commit guard installed
