// frontend/src/components/SensorStatCards.jsx
// Grid of animated stat cards showing latest sensor values + trend arrows

import { useState, useEffect, useRef } from 'react'
import { useColors } from '../hooks/useColors'
import { useLang } from '../contexts/LangContext'

// ─── Metric definitions ───────────────────────────────────────────────────────
const METRICS = [
  { key: 'co2',         label: { vi: 'CO₂',      en: 'CO₂' },          unit: 'ppm', icon: '🌿', thresholdHigh: 1000 },
  { key: 'ch4',         label: { vi: 'CH₄',      en: 'CH₄' },          unit: 'ppm', icon: '💨', thresholdHigh: 50 },
  { key: 'temperature', label: { vi: 'Nhiệt độ', en: 'Temperature' },  unit: '°C',  icon: '🌡️', thresholdHigh: 40 },
  { key: 'humidity',    label: { vi: 'Độ ẩm đất', en: 'Soil Humidity' }, unit: '%',   icon: '💧', thresholdHigh: 90 },
  { key: 'pressure',    label: { vi: 'Áp suất',  en: 'Pressure' },     unit: 'hPa', icon: '🔵', thresholdHigh: 1050 },
  { key: 'light',       label: { vi: 'Ánh sáng', en: 'Light' },        unit: 'lux', icon: '☀️', thresholdHigh: 100000 },
]

const L = {
  sensorTitle: { vi: 'Cảm biến thời gian thực', en: 'Real-time Sensors' },
  noData:      { vi: 'Chưa có dữ liệu',          en: 'No data' },
  updated:     { vi: 'Cập nhật',                   en: 'Updated' },
}
const lv = (key, lang) => L[key]?.[lang] ?? L[key]?.en ?? key

// ─── Animated number ──────────────────────────────────────────────────────────
function AnimatedValue({ value, decimals = 1 }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    if (value === null || value === undefined) return
    const from = prev.current ?? value
    const diff = value - from
    if (Math.abs(diff) < 0.01) { setDisplay(value); prev.current = value; return }

    const duration = 400
    const start = performance.now()

    const frame = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      setDisplay(from + diff * eased)
      if (progress < 1) requestAnimationFrame(frame)
      else prev.current = value
    }
    requestAnimationFrame(frame)
  }, [value])

  if (display === null || display === undefined) return '—'
  return typeof display === 'number' ? display.toFixed(decimals) : display
}

// ─── Single Sensor Card ──────────────────────────────────────────────────────
function SensorCard({ metric, value, previousValue, C, lang, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const hasValue = value !== null && value !== undefined
  const hasPrev = previousValue !== null && previousValue !== undefined
  const diff = hasValue && hasPrev ? value - previousValue : 0
  const trend = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'stable'
  const isAlert = hasValue && value > metric.thresholdHigh

  return (
    <div
      id={`sensor-card-${metric.key}`}
      style={{
        background: C.cardBg,
        border: `1px solid ${isAlert ? '#f87171' + '60' : C.cardBorder}`,
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, background 0.2s',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = isAlert ? '#f87171' : C.cardBorderHover
        e.currentTarget.style.background = C.cardBgHover
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isAlert ? '#f87171' + '60' : C.cardBorder
        e.currentTarget.style.background = C.cardBg
      }}
    >
      {/* Alert glow for critical values */}
      {isAlert && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 6, height: 6, borderRadius: '50%',
          background: '#f87171',
          boxShadow: '0 0 8px #f87171',
          margin: 8,
        }} />
      )}

      {/* Top row: icon + trend badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: C.accentBg,
          border: `1px solid ${C.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {metric.icon}
        </div>

        {hasValue && hasPrev && trend !== 'stable' && (
          <span style={{
            fontSize: 10,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 600,
            color: trend === 'up' ? C.tagUp : C.tagDown,
            background: trend === 'up' ? C.tagUpBg : C.tagDownBg,
            border: `1px solid ${trend === 'up' ? C.tagUpBorder : C.tagDownBorder}`,
            borderRadius: 100,
            padding: '2px 7px',
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            {trend === 'up' ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}
          </span>
        )}
      </div>

      {/* Label */}
      <div style={{
        fontSize: 11, color: C.faint,
        letterSpacing: 0.4, fontWeight: 500,
      }}>
        {metric.label[lang] ?? metric.label.en}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontSize: 26, fontWeight: 700,
          color: isAlert ? '#f87171' : C.accent,
          lineHeight: 1,
          fontFamily: "'DM Mono', monospace",
        }}>
          {hasValue ? <AnimatedValue value={value} /> : '—'}
        </span>
        <span style={{
          fontSize: 12, color: C.subheading, fontWeight: 500,
        }}>
          {metric.unit}
        </span>
      </div>
    </div>
  )
}

// ─── SensorStatCards grid ─────────────────────────────────────────────────────
export default function SensorStatCards({ latestData = {}, previousData = {} }) {
  const C = useColors()
  const { lang } = useLang()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section heading */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{
          margin: 0, fontSize: 16, fontWeight: 600, color: C.heading,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>📊</span>
          {lv('sensorTitle', lang)}
        </h3>
        {Object.keys(latestData).length > 0 && (
          <span style={{
            fontSize: 10, color: C.faint,
            fontFamily: "'DM Mono', monospace",
          }}>
            {lv('updated', lang)}: {new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US')}
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: 12,
      }}>
        {METRICS.map((metric, i) => (
          <SensorCard
            key={metric.key}
            metric={metric}
            value={latestData[metric.key] ?? null}
            previousValue={previousData[metric.key] ?? null}
            C={C}
            lang={lang}
            delay={i * 60}
          />
        ))}
      </div>
    </div>
  )
}
