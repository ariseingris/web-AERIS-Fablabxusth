// backend/index.js
const express = require('express');
const http    = require('http');          // ← NEW
const cors    = require('cors');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);   // ← NEW: wrap app in http.Server

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend run better' });
});

// ── Attach MQTT ↔ WebSocket bridge ──────────────────────────────────────────
require('./mqttBridge')(server);          // ← NEW

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {              // ← listen on server, not app
    console.log(`Run at Port: ${PORT}`);
    console.log(`WebSocket  : ws://localhost:${PORT}/ws`);
});