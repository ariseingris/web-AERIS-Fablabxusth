// frontend/src/components/MultiChart.jsx
// Recharts-based multi-metric line chart with time-range filter + line toggles

import { useState, useMemo, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useColors } from '../hooks/useColors'
import { useLang } from '../contexts/LangContext'

// ─── Metric config ────────────────────────────────────────────────────────────
const METRIC_CONFIG = {
  temperature: { label: { vi: 'Nhiệt độ', en: 'Temperature' }, unit: '°C', color: '#f97316', icon: '🌡️' },
  humidity:    { label: { vi: 'Độ ẩm',    en: 'Soil Humidity' }, unit: '%',  color: '#3b82f6', icon: '💧' },
  co2:         { label: { vi: 'CO₂',      en: 'CO₂' },          unit: 'ppm', color: '#22c55e', icon: '🌿' },
  ch4:         { label: { vi: 'CH₄',      en: 'CH₄' },          unit: 'ppm', color: '#a855f7', icon: '💨' },
  pressure:    { label: { vi: 'Áp suất',  en: 'Pressure' },     unit: 'hPa', color: '#06b6d4', icon: '🔵' },
  light:       { label: { vi: 'Ánh sáng', en: 'Light' },        unit: 'lux', color: '#eab308', icon: '☀️' },
}

// ─── Time range definitions (ms) ─────────────────────────────────────────────
const TIME_RANGES = [
  { key: '1h',  label: '1h',  ms: 60 * 60 * 1000 },
  { key: '6h',  label: '6h',  ms: 6 * 60 * 60 * 1000 },
  { key: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { key: '7d',  label: '7d',  ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'All', ms: Infinity },
]

const L = {
  chartTitle:  { vi: 'Biểu đồ cảm biến', en: 'Sensor Chart' },
  noData:      { vi: 'Chưa có dữ liệu', en: 'No data yet' },
  timeRange:   { vi: 'Khoảng thời gian', en: 'Time Range' },
  toggleAll:   { vi: 'Tất cả',           en: 'All' },
}
const lv = (key, lang) => L[key]?.[lang] ?? L[key]?.en ?? key

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, lang, C }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: C.cardBg,
      border: `1px solid ${C.cardBorder}`,
      borderRadius: 10,
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        fontSize: 11, color: C.faint, marginBottom: 6,
        fontFamily: "'DM Mono', monospace",
      }}>
        {new Date(label).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </div>
      {payload.map(entry => {
        const cfg = METRIC_CONFIG[entry.dataKey]
        return (
          <div key={entry.dataKey} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '2px 0', fontSize: 12,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: entry.color, display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ color: C.subheading, minWidth: 80 }}>
              {cfg?.label?.[lang] ?? entry.dataKey}
            </span>
            <span style={{ color: C.heading, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
              {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            </span>
            <span style={{ color: C.faint, fontSize: 10 }}>{cfg?.unit ?? ''}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── MultiChart Component ─────────────────────────────────────────────────────
export default function MultiChart({ data = [], metrics = [] }) {
  const C = useColors()
  const { lang } = useLang()

  // Resolve which metrics to use
  const activeMetrics = metrics.length > 0 ? metrics : Object.keys(METRIC_CONFIG)

  // Toggle state for each metric line
  const [hidden, setHidden] = useState({})
  const [range, setRange] = useState('all')

  const toggleMetric = useCallback((key) => {
    setHidden(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const toggleAll = useCallback(() => {
    const allHidden = activeMetrics.every(m => hidden[m])
    if (allHidden) {
      setHidden({})
    } else {
      const next = {}
      activeMetrics.forEach(m => { next[m] = true })
      setHidden(next)
    }
  }, [activeMetrics, hidden])

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (!data.length) return []
    const rangeObj = TIME_RANGES.find(r => r.key === range) || TIME_RANGES[5]
    if (rangeObj.ms === Infinity) return data
    const cutoff = Date.now() - rangeObj.ms
    return data.filter(d => {
      const ts = typeof d.timestamp === 'number' ? d.timestamp : new Date(d.timestamp).getTime()
      return ts >= cutoff
    })
  }, [data, range])

  const allHidden = activeMetrics.every(m => hidden[m])

  return (
    <div style={{
      background: C.cardBg,
      border: `1px solid ${C.cardBorder}`,
      borderRadius: 16,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      {/* ── Header + Controls ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <h3 style={{
          margin: 0, fontSize: 16, fontWeight: 600, color: C.heading,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>📈</span>
          {lv('chartTitle', lang)}
        </h3>

        {/* Time range pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TIME_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11,
                fontFamily: "'DM Mono', monospace", cursor: 'pointer',
                border: `1px solid ${range === r.key ? C.accent : C.cardBorder}`,
                background: range === r.key ? C.accentBg : 'transparent',
                color: range === r.key ? C.accent : C.faint,
                transition: 'all 0.15s',
                fontWeight: range === r.key ? 600 : 400,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metric toggle chips ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={toggleAll}
          style={{
            padding: '4px 10px', borderRadius: 100, fontSize: 11,
            border: `1px solid ${allHidden ? C.cardBorder : C.accentBorder}`,
            background: allHidden ? 'transparent' : C.accentBg,
            color: allHidden ? C.faint : C.accent,
            cursor: 'pointer', fontFamily: "'DM Mono', monospace",
            transition: 'all 0.15s',
          }}
        >
          {lv('toggleAll', lang)}
        </button>
        {activeMetrics.map(key => {
          const cfg = METRIC_CONFIG[key]
          if (!cfg) return null
          const isHidden = hidden[key]
          return (
            <button
              key={key}
              onClick={() => toggleMetric(key)}
              style={{
                padding: '4px 10px', borderRadius: 100, fontSize: 11,
                display: 'flex', alignItems: 'center', gap: 4,
                border: `1px solid ${isHidden ? C.cardBorder : cfg.color + '50'}`,
                background: isHidden ? 'transparent' : cfg.color + '15',
                color: isHidden ? C.faint : cfg.color,
                cursor: 'pointer', fontFamily: "'DM Mono', monospace",
                transition: 'all 0.15s',
                opacity: isHidden ? 0.5 : 1,
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isHidden ? C.faint : cfg.color,
                display: 'inline-block',
              }} />
              {cfg.icon} {cfg.label[lang] ?? cfg.label.en}
            </button>
          )
        })}
      </div>

      {/* ── Chart ── */}
      {filteredData.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 260, gap: 8,
          color: C.faint, fontSize: 13,
        }}>
          <span style={{ fontSize: 36 }}>📊</span>
          {lv('noData', lang)}
        </div>
      ) : (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.divider}
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => {
                  const d = new Date(ts)
                  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                }}
                stroke={C.faint}
                fontSize={10}
                fontFamily="'DM Mono', monospace"
                tick={{ fill: C.faint }}
                axisLine={{ stroke: C.divider }}
                tickLine={false}
              />
              <YAxis
                stroke={C.faint}
                fontSize={10}
                fontFamily="'DM Mono', monospace"
                tick={{ fill: C.faint }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={<ChartTooltip lang={lang} C={C} />}
                cursor={{ stroke: C.accent, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              {activeMetrics.map(key => {
                const cfg = METRIC_CONFIG[key]
                if (!cfg || hidden[key]) return null
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: cfg.color, stroke: C.cardBg, strokeWidth: 2 }}
                    animationDuration={800}
                    connectNulls
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
