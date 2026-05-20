#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS_FILE="$ROOT/.pids"

if [ ! -f "$PIDS_FILE" ]; then
  echo "No .pids file found. Nothing to stop."
  exit 0
fi

read -r BACKEND_PID FRONTEND_PID SIMULATOR_PID < "$PIDS_FILE"

for PID in $BACKEND_PID $FRONTEND_PID $SIMULATOR_PID; do
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" && echo "Killed PID $PID"
  else
    echo "PID $PID already gone"
  fi
done

rm -f "$PIDS_FILE"
echo "Done."
