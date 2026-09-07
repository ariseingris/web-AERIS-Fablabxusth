// frontend/src/pages/IoTDashboard.jsx
// Full IoT dashboard with:
//   - Device list sidebar
//   - MultiChart (recharts) for sensor history
//   - SensorStatCards for live readings
//   - Connection status badges (WS + MQTT)
//   - Device control panel (power, custom commands)
//   - Real-time MQTT updates via useMqttBridge hook

import { useState, useCallback } from 'react'
import { useLang } from '../contexts/LangContext'
import { useColors } from '../hooks/useColors'
import { useMqttBridge } from '../hooks/useMqttBridge'
import useHistoricalData from '../hooks/useHistoricalData'
import MultiChart from '../components/MultiChart'
import SensorStatCards from '../components/SensorStatCards'
import ReportExporter from '../components/ReportExporter'
import StatusBadge from '../components/StatusBadge'

// ─── Sensor emoji map ─────────────────────────────────────────────────────────
const SENSOR_ICONS = {
  temperature: '🌡️', humidity: '💧', pressure: '🔵',
  light: '☀️', motion: '👁️', co2: '🌿',
  voltage: '⚡', current: '🔌', ch4: '💨', default: '📊',
}

const RAW_UNIT_LABELS = {
  temperature: '°C', humidity: '%', co2: 'ppm',
  ch4: '%', pressure: 'hPa', light: 'lux',
}

// ─── Labels (vi / en) ────────────────────────────────────────────────────────
const L = {
  title:         { vi: 'Trung tâm IoT',       en: 'IoT Control Center' },
  subtitle:      { vi: 'Chọn thiết bị để bắt đầu điều khiển', en: 'Select a device to start controlling' },
  devices:       { vi: 'Thiết bị',             en: 'Devices' },
  addDevice:     { vi: '+ Thêm thiết bị',      en: '+ Add Device' },
  noDevices:     { vi: 'Chưa có thiết bị nào', en: 'No devices yet' },
  addFirst:      { vi: 'Thêm thiết bị đầu tiên', en: 'Add First Device' },
  noSelected:    { vi: 'Chưa chọn thiết bị',   en: 'No Device Selected' },
  noSelectedSub: { vi: 'Chọn thiết bị ở bảng trái để xem dashboard và điều khiển.', en: 'Choose a device from the left panel to view its dashboard and controls.' },
  power:         { vi: 'Nguồn',                en: 'Power' },
  on:            { vi: 'BẬT',                  en: 'ON' },
  off:           { vi: 'TẮT',                  en: 'OFF' },
  online:        { vi: 'Trực tuyến',           en: 'Online' },
  offline:       { vi: 'Ngoại tuyến',          en: 'Offline' },
  waiting:       { vi: 'Đang chờ dữ liệu cảm biến…', en: 'Waiting for sensor data…' },
  waitingSub:    { vi: 'Publish vào', en: 'Publish to' },
  sendCmd:       { vi: '+ Gửi lệnh',           en: '+ Send Command' },
  command:       { vi: 'lệnh',                 en: 'command' },
  value:         { vi: 'giá trị',              en: 'value' },
  send:          { vi: 'Gửi',                  en: 'Send' },
  remove:        { vi: 'Xoá',                  en: 'Remove' },
  connected:     { vi: 'Đã kết nối',           en: 'Connected' },
  disconnected:  { vi: 'Ngắt kết nối',         en: 'Disconnected' },
  reconnecting:  { vi: 'Đang kết nối lại',     en: 'Reconnecting' },
  dataPoints:    { vi: 'điểm dữ liệu',        en: 'data points' },
  liveData:      { vi: 'Dữ liệu trực tiếp',   en: 'Live Data' },
  controls:      { vi: 'Điều khiển',           en: 'Controls' },
  rawData:       { vi: 'Dữ liệu Raw',          en: 'Raw Data' },
  normalizedData:{ vi: 'Đã chuẩn hoá',         en: 'Normalized' },
  unitFriendly:  { vi: 'Đơn vị thông thường',  en: 'Common units' },
  unitAdc:       { vi: 'ADC (chuyên sâu)',     en: 'ADC (technical)' },
  // Add modal
  addTitle:      { vi: 'Thêm thiết bị IoT',   en: 'Add IoT Device' },
  deviceId:      { vi: 'Device ID',            en: 'Device ID' },
  deviceIdHint:  { vi: '(phải khớp topic MQTT)', en: '(must match MQTT topic)' },
  deviceName:    { vi: 'Tên hiển thị',         en: 'Display Name' },
  iconLabel:     { vi: 'Biểu tượng',           en: 'Icon' },
  cancel:        { vi: 'Huỷ',                  en: 'Cancel' },
  add:           { vi: 'Thêm',                 en: 'Add' },
  topicSub:      { vi: 'Sẽ subscribe vào:',    en: 'Will subscribe to:' },
  topicPub:      { vi: 'Sẽ publish vào:',      en: 'Will publish to:' },
  // Status
  ws:            { vi: 'Kết nối',              en: 'WS' },
  mqtt:          { vi: 'MQTT',                 en: 'MQTT' },
}
const lv = (key, lang) => L[key]?.[lang] ?? L[key]?.en ?? key

// ─── Add Device Modal ─────────────────────────────────────────────────────────
function AddDeviceModal({ onAdd, onClose, lang, C }) {
  const [form, setForm] = useState({ deviceId: '', name: '', icon: '📡' })
  const icons = ['📡', '💡', '🌡️', '🔌', '🏠', '🚗', '🌊', '🔧', '📷', '🎛️']

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cardBg, border: `1px solid ${C.cardBorder}`,
          borderRadius: 16, padding: 28, width: 420, maxWidth: '92vw',
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.heading }}>
          {lv('addTitle', lang)}
        </h3>

        {/* Device ID */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: C.subheading, fontWeight: 600 }}>
            {lv('deviceId', lang)}{' '}
            <span style={{ color: C.faint, fontWeight: 400 }}>{lv('deviceIdHint', lang)}</span>
          </label>
          <input
            value={form.deviceId}
            onChange={e => setForm({ ...form, deviceId: e.target.value.replace(/\s/g, '_') })}
            placeholder="e.g. device_a"
            style={{
              background: C.accentBg, border: `1px solid ${C.cardBorder}`,
              borderRadius: 8, padding: '9px 12px',
              color: C.body, fontSize: 13,
              fontFamily: "'DM Mono', monospace", outline: 'none',
            }}
          />
        </div>

        {/* Display name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: C.subheading, fontWeight: 600 }}>
            {lv('deviceName', lang)}
          </label>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Phòng khách"
            style={{
              background: C.accentBg, border: `1px solid ${C.cardBorder}`,
              borderRadius: 8, padding: '9px 12px',
              color: C.body, fontSize: 13,
              fontFamily: "'Inter', sans-serif", outline: 'none',
            }}
          />
        </div>

        {/* Icon picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: C.subheading, fontWeight: 600 }}>
            {lv('iconLabel', lang)}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {icons.map(ic => (
              <button key={ic} onClick={() => setForm({ ...form, icon: ic })} style={{
                fontSize: 20, width: 40, height: 40, borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${form.icon === ic ? C.accent : C.cardBorder}`,
                background: form.icon === ic ? C.accentBg : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>{ic}</button>
            ))}
          </div>
        </div>

        {/* Topic preview */}
        <div style={{
          background: C.accentBg, border: `1px solid ${C.accentBorder}`,
          borderRadius: 8, padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <span style={{ fontSize: 11, color: C.faint }}>{lv('topicSub', lang)}</span>
          <code style={{ fontSize: 11, color: C.accent, fontFamily: "'DM Mono', monospace" }}>
            devices/{form.deviceId || '<id>'}/status
          </code>
          <code style={{ fontSize: 11, color: C.accent, fontFamily: "'DM Mono', monospace" }}>
            devices/{form.deviceId || '<id>'}/sensors/#
          </code>
          <span style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{lv('topicPub', lang)}</span>
          <code style={{ fontSize: 11, color: C.accent, fontFamily: "'DM Mono', monospace" }}>
            devices/{form.deviceId || '<id>'}/control
          </code>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${C.cardBorder}`,
            color: C.subheading, fontSize: 13, fontFamily: 'inherit',
          }}>{lv('cancel', lang)}</button>
          <button
            onClick={() => { if (form.deviceId.trim()) { onAdd(form.deviceId.trim(), form.name || form.deviceId, form.icon); onClose(); } }}
            style={{
              padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
              background: C.accentBgStrong, border: `1px solid ${C.accentBorderStrong}`,
              color: C.accent, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >{lv('add', lang)}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Power Toggle — custom pill ───────────────────────────────────────────────
function PowerToggle({ on, onToggle, lang, C }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', borderRadius: 12,
      background: C.accentBg, border: `1px solid ${C.accentBorder}`,
    }}>
      <span style={{ fontSize: 13, color: C.subheading, fontWeight: 600, minWidth: 50 }}>
        {lv('power', lang)}
      </span>
      <button
        onClick={() => onToggle(!on)}
        style={{
          position: 'relative', width: 48, height: 26, borderRadius: 13, border: 'none',
          background: on ? C.accent : C.divider, cursor: 'pointer',
          transition: 'background 0.25s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3,
          left: on ? 25 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
      <span style={{
        fontSize: 12, fontWeight: 700,
        fontFamily: "'DM Mono', monospace",
        color: on ? C.accent : C.faint,
        letterSpacing: 1,
      }}>
        {on ? lv('on', lang) : lv('off', lang)}
      </span>
    </div>
  )
}

// ─── Sensor Card (for per-device raw sensor view) ─────────────────────────────
function SensorCard({ sensorKey, data, C }) {
  const icon = SENSOR_ICONS[sensorKey] || SENSOR_ICONS.default
  const val  = data?.value ?? '—'
  const unit = data?.unit  ?? ''
  const ts   = data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : null

  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.cardBorder}`,
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      transition: 'border-color 0.2s, background 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.cardBorderHover; e.currentTarget.style.background = C.cardBgHover }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder;      e.currentTarget.style.background = C.cardBg }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: C.accentBg, border: `1px solid ${C.accentBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: C.faint, textTransform: 'capitalize', letterSpacing: 0.4 }}>
          {sensorKey}
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.accent, lineHeight: 1.2, marginTop: 2 }}>
          {val}<span style={{ fontSize: 13, color: C.subheading, marginLeft: 2 }}>{unit}</span>
        </div>
        {ts && <div style={{ fontSize: 10, color: C.faint, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>{ts}</div>}
      </div>
    </div>
  )
}

// ─── Device Control Panel ─────────────────────────────────────────────────────
function DeviceControlPanel({ device, onTogglePower, onSendCommand, onRemove, lang, C }) {
  const [showCmd,  setShowCmd]  = useState(false)
  const [cmd,      setCmd]      = useState('')
  const [cmdVal,   setCmdVal]   = useState('')

  const isPowered = device.state?.power === true || device.state?.power === 'on' || device.state?.power === 1
  const isOnline  = device.state?.online !== false

  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.cardBorder}`,
      borderRadius: 16, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Section heading */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{
          margin: 0, fontSize: 16, fontWeight: 600, color: C.heading,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>🎛️</span>
          {lv('controls', lang)}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Online badge */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontFamily: "'DM Mono', monospace",
            color: isOnline ? C.accent : C.faint,
            background: isOnline ? C.accentBg : C.divider,
            border: `1px solid ${isOnline ? C.accentBorder : C.cardBorder}`,
            borderRadius: 100, padding: '3px 9px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isOnline ? C.accent : C.faint, display: 'inline-block',
              boxShadow: isOnline ? `0 0 6px ${C.accent}` : 'none',
            }} />
            {isOnline ? lv('online', lang) : lv('offline', lang)}
          </span>
          {/* Remove */}
          <button onClick={() => onRemove(device.id)} style={{
            background: 'transparent', border: `1px solid ${C.cardBorder}`,
            color: C.faint, borderRadius: 6, cursor: 'pointer',
            padding: '4px 10px', fontSize: 12, fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.color = C.faint;   e.currentTarget.style.borderColor = C.cardBorder }}
          >{lv('remove', lang)}</button>
        </div>
      </div>

      {/* Power */}
      <PowerToggle on={isPowered} onToggle={p => onTogglePower(device.id, p)} lang={lang} C={C} />

      {/* Custom command */}
      <div>
        {!showCmd ? (
          <button onClick={() => setShowCmd(true)} style={{
            background: 'transparent', border: `1px dashed ${C.accentBorder}`,
            color: C.accent, borderRadius: 8, padding: '8px 16px',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}>{lv('sendCmd', lang)}</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              placeholder={lv('command', lang)}
              value={cmd}
              onChange={e => setCmd(e.target.value)}
              style={{
                flex: 1, minWidth: 100,
                background: C.accentBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 8, padding: '8px 12px', color: C.body,
                fontSize: 13, fontFamily: "'DM Mono', monospace", outline: 'none',
              }}
            />
            <input
              placeholder={lv('value', lang)}
              value={cmdVal}
              onChange={e => setCmdVal(e.target.value)}
              style={{
                flex: 1, minWidth: 100,
                background: C.accentBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 8, padding: '8px 12px', color: C.body,
                fontSize: 13, fontFamily: "'DM Mono', monospace", outline: 'none',
              }}
            />
            <button onClick={() => {
              if (cmd) { onSendCommand(device.id, cmd, cmdVal); setCmd(''); setCmdVal(''); setShowCmd(false) }
            }} style={{
              background: C.accentBgStrong, border: `1px solid ${C.accentBorderStrong}`,
              color: C.accent, borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{lv('send', lang)}</button>
            <button onClick={() => setShowCmd(false)} style={{
              background: 'transparent', border: `1px solid ${C.cardBorder}`,
              color: C.subheading, borderRadius: 8, padding: '8px 12px',
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>✕</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main IoTDashboard ────────────────────────────────────────────────────────
export default function IoTDashboard() {
  const { lang } = useLang()
  const C = useColors()
  const {
    brokerStatus, wsStatus, devices,
    sensorHistory, latestSensor, previousSensor,
    registerDevice, removeDevice, togglePower, sendCommand,
  } = useMqttBridge()

  const [selectedId,   setSelectedId]   = useState(
    () => localStorage.getItem('selectedDeviceId') || null
  )
  const [showAddModal, setShowAddModal] = useState(false)
  const [range,        setRange]        = useState('7d')
  const [displayMode, setDisplayMode] = useState('normalized')
  const [rawUnitStyle, setRawUnitStyle] = useState('friendly')

  const handleToggleDisplayMode = useCallback((mode) => {
    setDisplayMode(mode)
    if (selectedId) {
      sendCommand(selectedId, mode === 'raw' ? 'DISPLAY_RAW' : 'DISPLAY_NORMALIZED')
    }
  }, [selectedId, sendCommand])

  const { data: historyData, loading: historyLoading } = useHistoricalData(selectedId, range)

  const handleAdd = useCallback((deviceId, name, icon) => {
    registerDevice(deviceId, name, icon)
    setSelectedId(deviceId)
    localStorage.setItem('selectedDeviceId', deviceId)
  }, [registerDevice])

  const handleRemove = useCallback((deviceId) => {
    removeDevice(deviceId)
    if (selectedId === deviceId) {
      setSelectedId(null)
      localStorage.removeItem('selectedDeviceId')
    }
  }, [removeDevice, selectedId])

  const selected = devices.find(d => d.id === selectedId)

  // Get sensor data for the selected device
  const selectedHistory   = selectedId ? (sensorHistory[selectedId] || [])  : []
  const selectedLatest    = selectedId ? (latestSensor[selectedId] || {})   : {}
  const selectedPrevious  = selectedId ? (previousSensor[selectedId] || {}) : {}

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.body, minHeight: '100vh' }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes pulse-dot {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.heading, margin: 0, lineHeight: 1.2 }}>
              {lv('title', lang)}
              {selected && (
                <span style={{ color: C.accent, fontWeight: 400 }}> / {selected.name}</span>
              )}
            </h1>
            <p style={{ margin: '6px 0 0', color: C.subheading, fontSize: 14 }}>
              {selected
                ? `ID: ${selected.id} · ${selected.state?.online !== false ? lv('online', lang) : lv('offline', lang)}`
                : lv('subtitle', lang)}
            </p>
          </div>

          {/* Status badges + Add button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge
              status={wsStatus}
              label={`WS · ${wsStatus === 'open' ? lv('connected', lang) : wsStatus === 'connecting' ? lv('reconnecting', lang) : lv('disconnected', lang)}`}
              C={C}
            />
            <StatusBadge
              status={brokerStatus}
              label={`HiveMQ · ${brokerStatus === 'connected' ? lv('connected', lang) : brokerStatus === 'reconnecting' ? lv('reconnecting', lang) : lv('disconnected', lang)}`}
              C={C}
            />
            {/* Data point counter */}
            {selectedId && selectedHistory.length > 0 && (
              <span style={{
                fontSize: 11, fontFamily: "'DM Mono', monospace", color: C.faint,
                background: C.accentBg, border: `1px solid ${C.accentBorder}`,
                borderRadius: 100, padding: '4px 10px',
              }}>
                {selectedHistory.length} {lv('dataPoints', lang)}
              </span>
            )}
            {/* Add device */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: C.accentBgStrong, border: `1px solid ${C.accentBorderStrong}`,
                color: C.accent, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.accentBg }}
              onMouseLeave={e => { e.currentTarget.style.background = C.accentBgStrong }}
            >{lv('addDevice', lang)}</button>
          </div>
        </div>
      </div>

      {/* ── Layout: device list | main panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Device list ── */}
        <div style={{
          background: C.cardBg, border: `1px solid ${C.cardBorder}`,
          borderRadius: 16, overflow: 'hidden',
          position: 'sticky', top: 16,
        }}>
          <div style={{
            padding: '12px 16px', fontSize: 11, fontWeight: 700,
            letterSpacing: 1.5, textTransform: 'uppercase', color: C.faint,
            borderBottom: `1px solid ${C.cardBorder}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {lv('devices', lang)}
            <span style={{
              background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBorder}`,
              borderRadius: 10, padding: '1px 7px', fontSize: 11,
              fontFamily: "'DM Mono', monospace",
            }}>{devices.length}</span>
          </div>

          {devices.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 10, padding: 24, color: C.faint, fontSize: 12, textAlign: 'center',
            }}>
              <span style={{ fontSize: 28 }}>📡</span>
              <span>{lv('noDevices', lang)}</span>
              <button onClick={() => setShowAddModal(true)} style={{
                background: C.accentBgStrong, border: `1px solid ${C.accentBorderStrong}`,
                color: C.accent, borderRadius: 8, padding: '7px 12px',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>{lv('addFirst', lang)}</button>
            </div>
          ) : (
            devices.map(device => {
              const isPowered = device.state?.power === true || device.state?.power === 'on'
              const isOnline  = device.state?.online !== false
              const isSelected = device.id === selectedId
              const hasData = (sensorHistory[device.id]?.length || 0) > 0
              return (
                <button key={device.id} onClick={() => { setSelectedId(device.id); localStorage.setItem('selectedDeviceId', device.id) }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', width: '100%', textAlign: 'left',
                  background: isSelected ? C.accentBg : 'transparent',
                  borderLeft: `3px solid ${isSelected ? C.accent : 'transparent'}`,
                  border: 'none',
                  borderBottom: `1px solid ${C.cardBorder}`,
                  cursor: 'pointer', color: C.body,
                  transition: 'background 0.15s',
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{device.icon || '📡'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? C.accent : C.body,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{device.name}</div>
                    <div style={{
                      fontSize: 10, color: C.faint, marginTop: 1,
                      fontFamily: "'DM Mono', monospace",
                    }}>{device.id}</div>
                  </div>
                  {/* Status dots */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: isOnline ? C.accent : C.faint, display: 'inline-block',
                      boxShadow: isOnline ? `0 0 4px ${C.accent}` : 'none',
                    }} />
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: isPowered ? '#f59e0b' : 'transparent',
                      border: `1px solid ${C.cardBorder}`, display: 'inline-block',
                    }} />
                    {hasData && (
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#3b82f6', display: 'inline-block',
                      }} title="Has data" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* ── Main panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!selected ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 360, gap: 14, padding: 40, textAlign: 'center',
              background: C.cardBg, border: `1px dashed ${C.cardBorder}`, borderRadius: 16,
            }}>
              <span style={{ fontSize: 52 }}>🛰️</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.heading, margin: 0 }}>
                {lv('noSelected', lang)}
              </h2>
              <p style={{ color: C.subheading, fontSize: 14, maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
                {devices.length > 0 ? lv('noSelectedSub', lang) : lv('subtitle', lang)}
              </p>
              {devices.length === 0 && (
                <button onClick={() => setShowAddModal(true)} style={{
                  background: C.accentBgStrong, border: `1px solid ${C.accentBorderStrong}`,
                  color: C.accent, borderRadius: 8, padding: '9px 20px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>{lv('addDevice', lang)}</button>
              )}
            </div>
          ) : (
            <>
              {/* Device header card */}
              <div style={{
                background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 16, padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, fontSize: 28,
                  background: C.accentBg, border: `1px solid ${C.accentBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{selected.icon || '📡'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.heading, lineHeight: 1 }}>
                    {selected.name}
                  </div>
                  <div style={{
                    fontSize: 12, color: C.faint, marginTop: 4,
                    fontFamily: "'DM Mono', monospace",
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    ID: {selected.id}
                    <span style={{
                      background: selected.state?.online !== false ? C.accentBg : C.divider,
                      color: selected.state?.online !== false ? C.accent : C.faint,
                      border: `1px solid ${selected.state?.online !== false ? C.accentBorder : C.cardBorder}`,
                      borderRadius: 100, padding: '1px 8px', fontSize: 10,
                    }}>
                      {selected.state?.online !== false ? lv('online', lang) : lv('offline', lang)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw / Normalized toggle */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {['normalized', 'raw'].map(mode => (
                  <button key={mode} onClick={() => handleToggleDisplayMode(mode)} style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${displayMode === mode ? C.accent : C.cardBorder}`,
                    background: displayMode === mode ? C.accentBg : 'transparent',
                    color: displayMode === mode ? C.accent : C.faint,
                    fontWeight: displayMode === mode ? 600 : 400,
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    {mode === 'raw' ? lv('rawData', lang) : lv('normalizedData', lang)}
                  </button>
                ))}

                {displayMode === 'raw' && (
                  <div style={{ display: 'flex', gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: `1px solid ${C.cardBorder}` }}>
                    {['friendly', 'adc'].map(style => (
                      <button key={style} onClick={() => setRawUnitStyle(style)} style={{
                        padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        border: `1px solid ${rawUnitStyle === style ? C.accent : C.cardBorder}`,
                        background: rawUnitStyle === style ? C.accentBg : 'transparent',
                        color: rawUnitStyle === style ? C.accent : C.faint,
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {style === 'adc' ? lv('unitAdc', lang) : lv('unitFriendly', lang)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sensor Stat Cards — normalized OR raw */}
              {displayMode === 'normalized' ? (
                <SensorStatCards latestData={selectedLatest} previousData={selectedPrevious} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {['temperature', 'humidity', 'co2', 'ch4', 'pressure', 'light'].map(key => (
                    <SensorCard
                      key={key}
                      sensorKey={key}
                      data={{
                        value: selectedLatest[`${key}_raw`] ?? '—',
                        unit: rawUnitStyle === 'adc' ? 'ADC' : RAW_UNIT_LABELS[key],
                      }}
                      C={C}
                    />
                  ))}
                </div>
              )}

              {/* Range picker + loading hint */}
              {displayMode === 'normalized' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  padding: '6px 2px',
                }}>
                  {['1h', '6h', '24h', '7d', '30d', '90d'].map(r => {
                    const active = r === range
                    return (
                      <button key={r} onClick={() => setRange(r)} style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12,
                        fontFamily: "'DM Mono', monospace", cursor: 'pointer',
                        border: `1px solid ${active ? C.accent : C.cardBorder}`,
                        background: active ? C.accentBg : 'transparent',
                        color: active ? C.accent : C.faint,
                        fontWeight: active ? 600 : 400,
                        transition: 'all 0.15s',
                      }}>{r}</button>
                    )
                  })}
                  {historyLoading && (
                    <span style={{
                      fontSize: 11, color: C.faint,
                      fontFamily: "'DM Mono', monospace", marginLeft: 4,
                    }}>Loading…</span>
                  )}
                </div>
              )}

              {/* Multi-metric Chart */}
              <MultiChart
                data={displayMode === 'raw' ? selectedHistory : historyData}
                metrics={['temperature', 'humidity', 'co2', 'ch4', 'pressure', 'light']}
                mode={displayMode}
              />

              {/* Report Exporter */}
              <ReportExporter
                device={selected}
                lang={lang}
                C={C}
              />

              {/* Device controls */}
              <DeviceControlPanel
                device={selected}
                onTogglePower={togglePower}
                onSendCommand={sendCommand}
                onRemove={handleRemove}
                lang={lang}
                C={C}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <AddDeviceModal
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
          lang={lang}
          C={C}
        />
      )}
    </div>
  )
}