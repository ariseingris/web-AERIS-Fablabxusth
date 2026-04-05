/**
 * mqttBridge.js
 * MQTT ↔ WebSocket bridge — add require('./mqttBridge')(server) in index.js
 *
 * Topics convention:
 *   devices/{id}/sensors/{key}  ← device publishes  { value, unit }
 *   devices/{id}/status         ← device publishes  { power: true/false }
 *   devices/{id}/control        → we publish        { command, value }
 */

const { WebSocketServer } = require('ws');
const mqtt = require('mqtt');

module.exports = function attachMqttBridge(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
  const mqttClient = mqtt.connect(BROKER, {
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    reconnectPeriod: 3000,
  });

  // In-memory stores
  const deviceRegistry = new Map(); // id → { name, icon }
  const deviceState    = new Map(); // id → { power, online, lastSeen, sensors:{} }

  // ── MQTT events ──────────────────────────────────────────────────────────
  mqttClient.on('connect', () => {
    console.log('✅  MQTT connected:', BROKER);
    broadcast({ type: 'broker_status', status: 'connected' });
    // Re-subscribe after reconnect
    deviceRegistry.forEach((_, id) => subscribeDevice(id));
  });

  mqttClient.on('offline',  () => broadcast({ type: 'broker_status', status: 'disconnected' }));
  mqttClient.on('error', e => broadcast({ type: 'broker_status', status: 'error', message: e.message }));

  mqttClient.on('message', (topic, payload) => {
    const parts = topic.split('/');
    if (parts[0] !== 'devices' || parts.length < 3) return;

    const [, deviceId, dataType, sensorKey] = parts;
    let parsed;
    try { parsed = JSON.parse(payload.toString()); } catch { parsed = payload.toString(); }

    // Update state cache
    if (!deviceState.has(deviceId)) deviceState.set(deviceId, { sensors: {} });
    const state = deviceState.get(deviceId);

    if (dataType === 'status') {
      state.power    = parsed?.power ?? parsed;
      state.online   = true;
      state.lastSeen = new Date().toISOString();
    } else if (dataType === 'sensors' && sensorKey) {
      state.sensors[sensorKey] = {
        value: parsed?.value ?? parsed,
        unit:  parsed?.unit  ?? '',
        timestamp: new Date().toISOString(),
      };
    }

    broadcast({
      type: 'device_data',
      deviceId,
      state: deviceState.get(deviceId),
      timestamp: new Date().toISOString(),
    });
  });

  // ── WebSocket server ─────────────────────────────────────────────────────
  wss.on('connection', ws => {
    // Send full snapshot on connect
    ws.send(JSON.stringify({
      type: 'init',
      brokerStatus: mqttClient.connected ? 'connected' : 'disconnected',
      devices: snapDevices(),
    }));

    ws.on('message', raw => {
      let msg; try { msg = JSON.parse(raw); } catch { return; }

      switch (msg.type) {

        case 'register_device': {
          const { deviceId, name, icon } = msg;
          deviceRegistry.set(deviceId, { name: name || deviceId, icon: icon || '📡' });
          if (!deviceState.has(deviceId)) deviceState.set(deviceId, { sensors: {}, online: false });
          subscribeDevice(deviceId);
          broadcast({ type: 'device_registered', device: snapOne(deviceId) });
          break;
        }

        case 'remove_device': {
          const { deviceId } = msg;
          mqttClient.unsubscribe([`devices/${deviceId}/status`, `devices/${deviceId}/sensors/#`]);
          deviceRegistry.delete(deviceId);
          deviceState.delete(deviceId);
          broadcast({ type: 'device_removed', deviceId });
          break;
        }

        case 'toggle_power': {
          const { deviceId, power } = msg;
          mqttClient.publish(`devices/${deviceId}/control`,
            JSON.stringify({ command: 'power', value: power }), { qos: 1 });
          break;
        }

        case 'control': {
          const { deviceId, command, value } = msg;
          mqttClient.publish(`devices/${deviceId}/control`,
            JSON.stringify({ command, value, ts: Date.now() }), { qos: 1 });
          break;
        }
      }
    });
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function subscribeDevice(id) {
    mqttClient.subscribe([`devices/${id}/status`, `devices/${id}/sensors/#`]);
  }

  function snapOne(id) {
    const info = deviceRegistry.get(id) || {};
    return { id, name: info.name || id, icon: info.icon || '📡', state: deviceState.get(id) || {} };
  }

  function snapDevices() {
    return Array.from(deviceRegistry.keys()).map(snapOne);
  }

  function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
  }

  console.log('🔌  MQTT bridge attached at ws://…/ws');
};