// frontend/src/hooks/useMqttBridge.js
import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

/**
 * useMqttBridge
 * Connects to the backend WebSocket→MQTT bridge.
 * Returns live device list + control helpers.
 */
export function useMqttBridge() {
  const [brokerStatus, setBrokerStatus] = useState('disconnected');
  const [wsStatus,     setWsStatus]     = useState('connecting');
  const [devices,      setDevices]      = useState([]);
  const wsRef           = useRef(null);
  const reconnectRef    = useRef(null);

  // ── send helper ────────────────────────────────────────────────────────────
  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(msg));
  }, []);

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
          break;

        case 'device_data':
          setDevices(prev =>
            prev.map(d => d.id === msg.deviceId ? { ...d, state: msg.state } : d)
          );
          break;
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

  return { brokerStatus, wsStatus, devices, registerDevice, removeDevice, togglePower, sendCommand };
}