#!/bin/bash
cd backend

echo "▸ Starting AI.py on :5001..."
nohup python AI.py > /tmp/aeris-ai.log 2>&1 &
AI_PID=$!
echo "  PID: $AI_PID"

echo "▸ Starting npm backend on :5000..."
nohup npm run dev > /tmp/aeris-node.log 2>&1 &
NODE_PID=$!
echo "  PID: $NODE_PID"

echo "▸ Waiting up to 30s for services to bind..."
for i in {1..30}; do
  AI_UP=$(curl -sf http://localhost:5001/health > /dev/null 2>&1 && echo yes || echo no)
  NODE_UP=$(curl -sf http://localhost:5000/ > /dev/null 2>&1 && echo yes || echo no)
  if [ "$AI_UP" = "yes" ] && [ "$NODE_UP" = "yes" ]; then
    echo "✓ Both up after ${i}s"
    break
  fi
  sleep 1
done

echo "  AI.py   reachable: $AI_UP"
echo "  Node    reachable: $NODE_UP"

if [ "$AI_UP" = "no" ]; then
  echo ""
  echo "── AI.py log tail ──"
  tail -30 /tmp/aeris-ai.log
fi

if [ "$NODE_UP" = "no" ]; then
  echo ""
  echo "── Node log tail ──"
  tail -30 /tmp/aeris-node.log
fi

echo ""
echo "PIDs: AI=$AI_PID  NODE=$NODE_PID"
echo "Kill with: kill $AI_PID $NODE_PID"
