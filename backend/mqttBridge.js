// Topic reconciliation: no change needed — bridge already subscribes to
// sgh-aeris/gateway/+/sensors which matches firmware publish topic
// sgh-aeris/gateway/{imei8}/sensors. The mismatch described in the task
// spec (aeris/sensors/#) referred to an older version; current code is correct.

/**
 * mqttBridge.js
 * MQTT ↔ WebSocket bridge — add require('./mqttBridge')(server) in index.js
 *
 * Topics convention:
 *   sgh-aeris/gateway/{imei8}/sensors    ← device publishes { ts, temp, hum, co2, lux, pressure, gas, soil, fan, piston }
 *                                           or retained status envelope { "status": "online"|"offline" }
 *   sgh-aeris/gateway/{imei8}/heartbeat  ← device publishes small ping every ~30s
 *   sgh-aeris/gateway/{imei8}/ack        ← device publishes { "forwarded": "<CMD>" }
 *   sgh-aeris/gateway/{imei8}/control    → we publish       plain string one of:
 *                                           SYSTEM_ON | SYSTEM_OFF | FAN_ON | FAN_OFF | PISTON_OPEN | PISTON_CLOSE
 *   devices/{id}/sensors/{key}  ← device publishes  { value, unit }   (legacy)
 *   devices/{id}/status         ← device publishes  { power: true/false }  (legacy)
 *   devices/{id}/control        → we publish        { command, value }  (legacy)
 *
 * Persists sensor data directly to Supabase sensor_data table.
 */

const { WebSocketServer } = require('ws');
const mqtt = require('mqtt');
const { supabase } = require('./supabaseClient');

// Module-level status — readable by API without waiting for attachMqttBridge
let _brokerStatus = 'disconnected';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Strip firmware fault sentinels. Returns null for missing values or values at/below sentinel.
function sanitize(value, sentinel) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  if (value <= sentinel) return null;
  return value;
}

// Duplicated locally (see index.js) to avoid a circular require with index.js
async function resolveGeo(ip) {
  if (!ip) return null;
  const clean = ip.replace(/^::ffff:/, '');
  if (!clean || clean === '::1' || clean === '127.0.0.1') return null;
  try {
    const resp = await fetch(
      `http://ip-api.com/json/${clean}?fields=status,country,countryCode,city,timezone,lat,lon`
    );
    if (!resp.ok) return null;
    const j = await resp.json();
    if (j.status !== 'success') return null;
    return {
      country_code: j.countryCode ?? null,
      country_name: j.country ?? null,
      city: j.city ?? null,
      timezone: j.timezone ?? null,
      latitude: j.lat ?? null,
      longitude: j.lon ?? null,
    };
  } catch {
    return null;
  }
}

module.exports = function attachMqttBridge(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
  const mqttClient = mqtt.connect(BROKER, {
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    reconnectPeriod: 3000,
    rejectUnauthorized: true,
  });

  // In-memory stores
  const deviceRegistry = new Map(); // id → { name, icon }
  const deviceState    = new Map(); // id → { power, online, lastSeen, sensors:{} }
  const offlineTimers  = new Map();
  const OFFLINE_TIMEOUT = 30_000;

  // Debounce sensor data persistence (max once per 5s per device)
  const persistTimers = new Map();
  const PERSIST_DEBOUNCE = 5_000;

  function resetOfflineTimer(deviceId) {
    if (offlineTimers.has(deviceId)) {
      clearTimeout(offlineTimers.get(deviceId));
    }
    offlineTimers.set(deviceId, setTimeout(() => {
      const state = deviceState.get(deviceId);
      if (state) {
        state.online = false;
        broadcast({
          type: 'device_data',
          deviceId,
          state,
          timestamp: new Date().toISOString(),
        });
      }
    }, OFFLINE_TIMEOUT));
  }

  /**
   * Persist sensor data directly to Supabase sensor_data table.
   * For aeris/sensors/{device_id} topics: saves the flat payload immediately.
   * For legacy devices/{id}/sensors/{key} topics: debounced to batch sensor keys.
   */
  async function persistAerisSensorData(deviceId, payload) {
    const reading = {
      device_id: deviceId,
      timestamp: new Date().toISOString(),
      temperature: sanitize(payload.temp, -999),
      humidity:    sanitize(payload.hum,  -999),
      co2:         sanitize(payload.co2,  0),
      ch4:         sanitize(payload.ch4,  -999),
      light:       sanitize(payload.lux,  -999),
      pressure:    sanitize(payload.pressure, -999),
      gas:         sanitize(payload.gas, -1),
      soil:        payload.soil ?? null,
      fan:         payload.fan  ?? null,
      piston:      payload.piston ?? null,
    };

    const hasData = [reading.temperature, reading.humidity, reading.co2,
                     reading.ch4, reading.pressure, reading.light,
                     reading.gas, reading.soil]
                     .some(v => v !== null && v !== undefined);
    if (!hasData) return;

    const { error } = await supabase.from('sensor_data').insert(reading);
    if (error) console.warn('⚠️  Failed to persist aeris sensor data:', error.message);
  }

  /**
   * Persist the latest legacy sensor data for a device (debounced, batches keys)
   */
  function persistSensorData(deviceId) {
    if (persistTimers.has(deviceId)) return; // already scheduled

    persistTimers.set(deviceId, setTimeout(async () => {
      persistTimers.delete(deviceId);
      const state = deviceState.get(deviceId);
      if (!state?.sensors) return;

      const sensors = state.sensors;
      const reading = {
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        temperature: sensors.temperature?.value ?? null,
        humidity: sensors.humidity?.value ?? null,
        co2: sensors.co2?.value ?? null,
        ch4: sensors.ch4?.value ?? null,
        pressure: sensors.pressure?.value ?? null,
        light: sensors.light?.value ?? null,
      };

      const hasData = [reading.temperature, reading.humidity, reading.co2,
                       reading.ch4, reading.pressure, reading.light]
                       .some(v => v !== null && v !== undefined);
      if (!hasData) return;

      const { error } = await supabase.from('sensor_data').insert(reading);
      if (error) console.warn('⚠️  Failed to persist sensor data:', error.message);
    }, PERSIST_DEBOUNCE));
  }

  /**
   * Update device status to online + last_seen in devices table
   */
  async function updateDeviceOnline(deviceId) {
    const update = { status: 'online', last_seen: new Date().toISOString() };

    const { data: existing } = await supabase
      .from('devices')
      .select('ip_address, geo_updated_at')
      .eq('device_id', deviceId)
      .single();

    if (existing?.ip_address) {
      const age = existing.geo_updated_at
        ? Date.now() - new Date(existing.geo_updated_at).getTime()
        : Infinity;
      if (age > SEVEN_DAYS_MS) {
        const geo = await resolveGeo(existing.ip_address);
        if (geo) {
          Object.assign(update, geo);
          update.geo_updated_at = new Date().toISOString();
        }
      }
    }

    const { error } = await supabase
      .from('devices')
      .update(update)
      .eq('device_id', deviceId);
    if (error) console.warn('⚠️  Failed to update device status:', error.message);
  }

  // ── MQTT events ──────────────────────────────────────────────────────────
  mqttClient.on('connect', () => {
    console.log('✅  MQTT connected:', BROKER);
    _brokerStatus = 'connected';
    broadcast({ type: 'broker_status', status: 'connected' });
    // Smart Greenhouse firmware (sgh-aeris/gateway/{imei8}/…) + legacy device topics
    mqttClient.subscribe('sgh-aeris/gateway/+/sensors',   { qos: 1 });
    mqttClient.subscribe('sgh-aeris/gateway/+/heartbeat', { qos: 0 });
    mqttClient.subscribe('sgh-aeris/gateway/+/ack',       { qos: 1 });
    deviceRegistry.forEach((_, id) => subscribeDevice(id));
  });

  mqttClient.on('reconnect', () => {
    _brokerStatus = 'reconnecting';
    broadcast({ type: 'broker_status', status: 'reconnecting' });
  });

  mqttClient.on('offline', () => {
    _brokerStatus = 'disconnected';
    broadcast({ type: 'broker_status', status: 'disconnected' });
  });

  mqttClient.on('error', e => {
    _brokerStatus = 'error';
    console.error('MQTT error:', e);
    broadcast({ type: 'broker_status', status: 'error', message: e.message });
  });

  mqttClient.on('message', (topic, payload) => {
    const parts = topic.split('/');
    let parsed;
    try { parsed = JSON.parse(payload.toString()); } catch { parsed = payload.toString(); }

    // ── sgh-aeris/gateway/{imei8}/{kind} — Smart Greenhouse firmware protocol
    if (parts[0] === 'sgh-aeris' && parts[1] === 'gateway' && parts[2]) {
      const deviceId = parts[2];
      const kind     = parts[3];

      if (!deviceState.has(deviceId)) deviceState.set(deviceId, { sensors: {} });
      const state = deviceState.get(deviceId);

      if (kind === 'sensors') {
        // Retained status envelope / LWT — update status only, do not persist a row
        if (parsed && typeof parsed === 'object' &&
            (parsed.status === 'online' || parsed.status === 'offline')) {
          const isOnline = parsed.status === 'online';
          state.online   = isOnline;
          state.lastSeen = new Date().toISOString();

          supabase.from('devices')
            .update({ status: parsed.status, last_seen: state.lastSeen })
            .eq('device_id', deviceId)
            .then(({ error }) => {
              if (error) console.warn('⚠️  Failed to update device status:', error.message);
            });

          broadcast({
            type: 'device_data',
            deviceId,
            state,
            timestamp: state.lastSeen,
          });

          if (isOnline) resetOfflineTimer(deviceId);
          return;
        }

        // Sensor reading — map firmware keys → UI keys and apply sentinels
        const ts = new Date().toISOString();
        const uiReadings = {
          temperature: sanitize(parsed.temp, -999),
          humidity:    sanitize(parsed.hum,  -999),
          co2:         sanitize(parsed.co2,  0),
          ch4:         sanitize(parsed.ch4,  -999),
          pressure:    sanitize(parsed.pressure, -999),
          light:       sanitize(parsed.lux,  -999),
          gas:         sanitize(parsed.gas,  -1),
        };
        const RAW_KEY_MAP = {
          temperature: 'temp', humidity: 'hum', co2: 'co2', ch4: 'ch4',
          pressure: 'pressure', light: 'lux',
        };
        const rawReadings = (parsed.raw && typeof parsed.raw === 'object') ? parsed.raw : {};
        for (const [key, value] of Object.entries(uiReadings)) {
          if (value !== null) {
            state.sensors[key] = {
              value,
              raw: rawReadings[RAW_KEY_MAP[key]] ?? null,
              unit: '',
              timestamp: ts,
            };
          }
        }
        for (const key of ['soil', 'fan', 'piston']) {
          if (parsed[key] !== undefined && parsed[key] !== null) {
            state.sensors[key] = { value: parsed[key], unit: '', timestamp: ts };
          }
        }
        state.online   = true;
        state.lastSeen = ts;

        persistAerisSensorData(deviceId, parsed).catch(e => console.warn('⚠️  aeris persist error:', e.message));
        updateDeviceOnline(deviceId).catch(() => {});

        broadcast({
          type: 'device_data',
          deviceId,
          state,
          timestamp: ts,
        });

        resetOfflineTimer(deviceId);
        return;
      }

      if (kind === 'heartbeat') {
        state.online   = true;
        state.lastSeen = new Date().toISOString();
        broadcast({
          type: 'device_heartbeat',
          deviceId,
          timestamp: state.lastSeen,
        });
        resetOfflineTimer(deviceId);
        return;
      }

      if (kind === 'ack') {
        broadcast({
          type: 'device_ack',
          deviceId,
          payload: parsed,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      return;
    }

    // ── Legacy devices/{id}/sensors/{key} and devices/{id}/status ───────────
    if (parts[0] !== 'devices' || parts.length < 3) return;

    const [, deviceId, dataType, sensorKey] = parts;

    if (!deviceState.has(deviceId)) deviceState.set(deviceId, { sensors: {} });
    const state = deviceState.get(deviceId);

    if (dataType === 'status') {
      state.power    = parsed?.power ?? parsed;
      state.online   = true;
      state.lastSeen = new Date().toISOString();
      updateDeviceOnline(deviceId).catch(() => {});
    } else if (dataType === 'sensors' && sensorKey) {
      state.sensors[sensorKey] = {
        value: parsed?.value ?? parsed,
        unit:  parsed?.unit  ?? '',
        timestamp: new Date().toISOString(),
      };
      persistSensorData(deviceId);
    }

    broadcast({
      type: 'device_data',
      deviceId,
      state: deviceState.get(deviceId),
      timestamp: new Date().toISOString(),
    });

    resetOfflineTimer(deviceId);
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
          if (offlineTimers.has(deviceId)) {
            clearTimeout(offlineTimers.get(deviceId));
            offlineTimers.delete(deviceId);
          }
          if (persistTimers.has(deviceId)) {
            clearTimeout(persistTimers.get(deviceId));
            persistTimers.delete(deviceId);
          }
          deviceRegistry.delete(deviceId);
          deviceState.delete(deviceId);
          broadcast({ type: 'device_removed', deviceId });
          break;
        }

        case 'toggle_power': {
          const { deviceId, power } = msg;
          const cmd = power ? 'SYSTEM_ON' : 'SYSTEM_OFF';
          mqttClient.publish(`sgh-aeris/gateway/${deviceId}/control`, cmd, { qos: 1 });
          break;
        }

        case 'control': {
          const { deviceId, command } = msg;
          const VALID = new Set([
            'SYSTEM_ON', 'SYSTEM_OFF', 'FAN_ON', 'FAN_OFF', 'PISTON_OPEN', 'PISTON_CLOSE',
            'DISPLAY_RAW', 'DISPLAY_NORMALIZED', 'DISPLAY_BOTH',
          ]);
          if (!VALID.has(command)) {
            console.warn('Rejecting unknown command', command);
            break;
          }
          mqttClient.publish(`sgh-aeris/gateway/${deviceId}/control`, command, { qos: 1 });
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

/** Returns the current MQTT broker connection status for GET /api/iot/mqtt-status */
module.exports.getStatus = () => ({ status: _brokerStatus, connected: _brokerStatus === 'connected' });