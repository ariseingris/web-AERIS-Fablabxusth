#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS_FILE="$ROOT/.pids"

echo "[deploy] Starting backend..."
cd "$ROOT/backend"
node index.js > "$ROOT/backend.log" 2>&1 &
BACKEND_PID=$!

echo "[deploy] Starting frontend..."
cd "$ROOT/frontend"
npm run dev > "$ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo "[deploy] Starting simulator..."
cd "$ROOT"
python3 simulator.py > "$ROOT/simulator.log" 2>&1 &
SIMULATOR_PID=$!

echo "$BACKEND_PID $FRONTEND_PID $SIMULATOR_PID" > "$PIDS_FILE"

echo ""
echo "  backend    PID $BACKEND_PID  → backend.log"
echo "  frontend   PID $FRONTEND_PID  → frontend.log"
echo "  simulator  PID $SIMULATOR_PID  → simulator.log"
echo ""
echo "PIDs saved to .pids — run ./stop_public.sh to kill all three."
