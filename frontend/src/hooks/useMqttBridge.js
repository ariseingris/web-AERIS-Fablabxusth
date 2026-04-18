// frontend/src/hooks/useMqttBridge.js
import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

const MAX_HISTORY = 1000; // keep at most 1000 data points per device

/**
 * useMqttBridge
 * Connects to the backend WebSocket→MQTT bridge.
 * Returns live device list + control helpers + sensor history for charts.
 */
export function useMqttBridge() {
  const [brokerStatus, setBrokerStatus] = useState('disconnected');
  const [wsStatus,     setWsStatus]     = useState('connecting');
  const [devices,      setDevices]      = useState([]);
  // sensorHistory: { [deviceId]: [ { timestamp, temperature, humidity, co2, ch4, pressure, light }, ... ] }
  const [sensorHistory, setSensorHistory] = useState({});
  // latestSensorData + previousSensorData keyed by deviceId
  const [latestSensor,   setLatestSensor]   = useState({});
  const [previousSensor, setPreviousSensor] = useState({});
  const wsRef           = useRef(null);
  const reconnectRef    = useRef(null);

  // ── send helper ────────────────────────────────────────────────────────────
  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(msg));
  }, []);

  // ── flatten sensor state into a row for the chart ──────────────────────────
  function flattenSensors(state, timestamp) {
    const sensors = state?.sensors || {};
    const row = { timestamp: timestamp || new Date().toISOString() };
    for (const [key, data] of Object.entries(sensors)) {
      const val = data?.value ?? data;
      if (typeof val === 'number' || typeof val === 'string') {
        row[key] = typeof val === 'string' ? parseFloat(val) || 0 : val;
      }
    }
    return row;
  }

  // ── connect / reconnect ────────────────────────────────────────────────────
  const connect = useCallback(() => {
    wsRef.current?.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen  = () => { setWsStatus('open'); clearTimeout(reconnectRef.current); };
    ws.onclose = () => { setWsStatus('closed'); reconnectRef.current = setTimeout(connect, 3500); };
    ws.onerror = () => setWsStatus('closed');

    ws.onmessage = ({ data }) => {
      let msg; try { msg = JSON.parse(data); } catch { return; }

      switch (msg.type) {
        case 'init':
          setBrokerStatus(msg.brokerStatus);
          setDevices(msg.devices || []);
          break;

        case 'broker_status':
          setBrokerStatus(msg.status);
          break;

        case 'device_registered':
          setDevices(prev =>
            prev.find(d => d.id === msg.device.id) ? prev : [...prev, msg.device]
          );
          break;

        case 'device_removed':
          setDevices(prev => prev.filter(d => d.id !== msg.deviceId));
          // Clean up sensor data
          setSensorHistory(prev => { const n = { ...prev }; delete n[msg.deviceId]; return n; });
          setLatestSensor(prev => { const n = { ...prev }; delete n[msg.deviceId]; return n; });
          setPreviousSensor(prev => { const n = { ...prev }; delete n[msg.deviceId]; return n; });
          break;

        case 'device_data': {
          const { deviceId, state, timestamp } = msg;
          // Update device list
          setDevices(prev =>
            prev.map(d => d.id === deviceId ? { ...d, state } : d)
          );

          // Build sensor row
          const row = flattenSensors(state, timestamp);
          const hasMetrics = Object.keys(row).length > 1; // more than just timestamp

          if (hasMetrics) {
            // Update history for chart
            setSensorHistory(prev => {
              const deviceData = prev[deviceId] || [];
              const next = [...deviceData, row];
              if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
              return { ...prev, [deviceId]: next };
            });

            // Update latest / previous sensor values
            setLatestSensor(prev => {
              // Before updating latest, save current latest as previous
              if (prev[deviceId]) {
                setPreviousSensor(p => ({ ...p, [deviceId]: prev[deviceId] }));
              }
              return { ...prev, [deviceId]: row };
            });
          }
          break;
        }
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => { clearTimeout(reconnectRef.current); wsRef.current?.close(); };
  }, [connect]);

  // ── public API ─────────────────────────────────────────────────────────────
  const registerDevice = useCallback((deviceId, name, icon = '📡') =>
    send({ type: 'register_device', deviceId, name, icon }), [send]);

  const removeDevice = useCallback((deviceId) =>
    send({ type: 'remove_device', deviceId }), [send]);

  const togglePower = useCallback((deviceId, power) => {
    send({ type: 'toggle_power', deviceId, power });
    // Optimistic update so toggle feels instant
    setDevices(prev =>
      prev.map(d => d.id === deviceId ? { ...d, state: { ...d.state, power } } : d)
    );
  }, [send]);

  const sendCommand = useCallback((deviceId, command, value) =>
    send({ type: 'control', deviceId, command, value }), [send]);

  return {
    brokerStatus, wsStatus, devices,
    sensorHistory, latestSensor, previousSensor,
    registerDevice, removeDevice, togglePower, sendCommand,
  };
}