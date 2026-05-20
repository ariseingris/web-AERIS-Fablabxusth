import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLang } from '../contexts/LangContext'
import { t } from '../i18n'
import { useColors } from '../hooks/useColors'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../contexts/SubscriptionContext'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { useMqttBridge } from '../hooks/useMqttBridge'

// ── Metric options for export modal ───────────────────────────────────────────
const METRIC_OPTIONS = [
  { key: 'all',         label: '📋 Tất cả / All metrics' },
  { key: 'temperature', label: '🌡️ Temperature' },
  { key: 'humidity',    label: '💧 Humidity' },
  { key: 'co2',         label: '🌿 CO₂' },
  { key: 'ch4',         label: '💨 CH₄' },
  { key: 'pressure',    label: '🔵 Pressure' },
  { key: 'light',       label: '☀️ Light' },
  { key: 'gas',         label: '⚡ Gas' },
  { key: 'soil',        label: '🌱 Soil' },
]

const RANGE_OPTIONS = [
  { label: '1h',  hours: 1   },
  { label: '24h', hours: 24  },
  { label: '7d',  hours: 168 },
  { label: '30d', hours: 720 },
]

const FORMAT_EXT = { excel: '.xlsx', latex: '.tex', docs: '.html' }
const FORMAT_LABEL = { excel: 'Excel', latex: 'LaTeX', docs: 'Google Docs' }

// ── Helper: trigger file download from string content ─────────────────────────
function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Export Options Modal ──────────────────────────────────────────────────────
function ExportOptionsModal({ format, deviceOptions, onClose, lang, C }) {
  const [cfgDevice, setCfgDevice]     = useState('')
  const [cfgMetric, setCfgMetric]     = useState('all')
  const [cfgRange, setCfgRange]       = useState(24)
  const [cfgFilename, setCfgFilename] = useState('')
  const [exporting, setExporting]     = useState(false)

  const ext = FORMAT_EXT[format] || '.xlsx'
  const fmtLabel = FORMAT_LABEL[format] || format

  const runExport = async () => {
    if (!cfgDevice) return
    setExporting(true)
    try {
      // 1. Fetch via backend API — same path useHistoricalData uses
      //    (bypasses Supabase RLS, which blocks direct frontend reads)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const since = new Date(Date.now() - cfgRange * 60 * 60 * 1000).toISOString()
      const params = new URLSearchParams({ limit: '5000', from: since })
      const resp = await fetch(
        `${API_URL}/api/iot/data/${encodeURIComponent(cfgDevice)}?${params}`
      )
      if (!resp.ok) throw new Error(`Server error ${resp.status}`)
      const { data: rawRows } = await resp.json()

      if (!rawRows || rawRows.length === 0) {
        // Probe without time filter to distinguish "no data ever" vs "not in range"
        const probeParams = new URLSearchParams({ limit: '1' })
        const probeResp = await fetch(
          `${API_URL}/api/iot/data/${encodeURIComponent(cfgDevice)}?${probeParams}`
        )
        const { data: probeRows } = await probeResp.json()
        if (!probeRows || probeRows.length === 0) {
          toast.error(lang === 'vi'
            ? 'Thiết bị này chưa có dữ liệu nào.'
            : 'This device has no recorded data yet.')
        } else {
          const lastTs = new Date(probeRows[0].timestamp).toLocaleString()
          toast.error(lang === 'vi'
            ? `Không có dữ liệu trong khoảng này. Dữ liệu gần nhất: ${lastTs}`
            : `No data in this range. Last reading: ${lastTs}`)
        }
        return
      }

      // 2. Filter to selected metric(s) if not "all"
      const allMetrics = ['temperature','humidity','co2','ch4','pressure','light','gas','soil']
      const metricCols = cfgMetric === 'all' ? allMetrics : [cfgMetric]
      const keepCols = ['timestamp', ...metricCols]

      const rows = rawRows.map(r => {
        const filtered = {}
        for (const k of keepCols) {
          if (k in r) filtered[k] = r[k]
        }
        return filtered
      })

      // 3. Check if the chosen metric actually has data
      if (cfgMetric !== 'all') {
        const hasValue = rows.some(r => r[cfgMetric] !== null && r[cfgMetric] !== undefined)
        if (!hasValue) {
          toast.error(lang === 'vi'
            ? `Thiết bị này không ghi nhận "${cfgMetric}".`
            : `This device does not report "${cfgMetric}".`)
          return
        }
      }

      // 4. Resolve filename
      const safeBase = (cfgFilename || `sensor_${cfgDevice}_${Date.now()}`)
        .replace(/[^\w.-]/g, '_')

      // 5. Format-specific export
      if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Sensor Data')
        ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }))
        XLSX.writeFile(wb, `${safeBase}.xlsx`)
      }
      else if (format === 'latex') {
        const cols = Object.keys(rows[0])
        const header = cols.join(' & ') + ' \\\\'
        const body = rows.map(r =>
          cols.map(c => String(r[c] ?? '-').replace(/_/g, '\\_')).join(' & ') + ' \\\\'
        ).join('\n')
        const tex = `\\begin{table}[h]
\\centering
\\caption{Sensor Data — ${cfgDevice}}
\\begin{tabular}{${'l'.repeat(cols.length)}}
\\hline
${header}
\\hline
${body}
\\hline
\\end{tabular}
\\end{table}`
        downloadBlob(tex, `${safeBase}.tex`, 'text/plain;charset=utf-8;')
      }
      else if (format === 'docs') {
        const cols = Object.keys(rows[0])
        const html = `<table border="1" cellspacing="0" cellpadding="4">
<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`
        downloadBlob(html, `${safeBase}.html`, 'text/html;charset=utf-8;')
      }

      toast.success(lang === 'vi' ? 'Đã xuất file' : 'Export complete')
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setExporting(false)
    }
  }

  const inputStyle = {
    width: '100%', background: C.accentBg, border: `1px solid ${C.cardBorder}`,
    borderRadius: 8, padding: '9px 12px', color: C.body, fontSize: 13,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cardBg, border: `1px solid ${C.cardBorder}`,
          borderRadius: 16, padding: 28, width: 440, maxWidth: '92vw',
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          animation: 'exportModalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Title */}
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.heading, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>📤</span>
          {lang === 'vi' ? `Xuất file ${fmtLabel}` : `Export as ${fmtLabel}`}
        </h3>

        {/* Device picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: C.subheading, fontWeight: 600 }}>
            {lang === 'vi' ? 'Thiết bị' : 'Device'}
          </label>
          <select value={cfgDevice} onChange={e => setCfgDevice(e.target.value)} style={inputStyle}>
            <option value="">{lang === 'vi' ? '-- Chọn thiết bị --' : '-- Select device --'}</option>
            {deviceOptions.map(d => (
              <option key={d.id} value={d.id}>
                {d.icon} {d.name} ({d.id})
              </option>
            ))}
          </select>
          {deviceOptions.length === 0 && (
            <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>
              {lang === 'vi'
                ? 'Chưa có thiết bị nào. Thêm thiết bị ở Trung tâm IoT trước.'
                : 'No devices found. Add one in the IoT Control Center first.'}
            </div>
          )}
        </div>

        {/* Metric picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: C.subheading, fontWeight: 600 }}>
            {lang === 'vi' ? 'Loại dữ liệu' : 'Metric'}
          </label>
          <select value={cfgMetric} onChange={e => setCfgMetric(e.target.value)} style={inputStyle}>
            {METRIC_OPTIONS.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Time range pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: C.subheading, fontWeight: 600 }}>
            {lang === 'vi' ? 'Khoảng thời gian' : 'Time Range'}
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {RANGE_OPTIONS.map(({ label, hours }) => {
              const active = cfgRange === hours
              return (
                <button
                  key={hours}
                  onClick={() => setCfgRange(hours)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13,
                    fontFamily: "'DM Mono', monospace", cursor: 'pointer',
                    border: `1px solid ${active ? C.accent : C.cardBorder}`,
                    background: active ? C.accentBg : 'transparent',
                    color: active ? C.accent : C.subheading,
                    fontWeight: active ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >{label}</button>
              )
            })}
          </div>
        </div>

        {/* Filename input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: C.subheading, fontWeight: 600 }}>
            {lang === 'vi' ? 'Tên file' : 'Filename'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <input
              value={cfgFilename}
              onChange={e => setCfgFilename(e.target.value)}
              placeholder={`sensor_${cfgDevice || 'device'}_${Date.now()}`}
              style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1 }}
            />
            <span style={{
              background: C.accentBg, border: `1px solid ${C.cardBorder}`,
              borderLeft: 'none', borderRadius: '0 8px 8px 0',
              padding: '9px 12px', fontSize: 13, color: C.faint,
              fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap',
            }}>{ext}</span>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${C.cardBorder}`,
            color: C.subheading, fontSize: 13, fontFamily: 'inherit',
          }}>{lang === 'vi' ? 'Huỷ' : 'Cancel'}</button>
          <button
            onClick={runExport}
            disabled={!cfgDevice || exporting}
            style={{
              padding: '9px 22px', borderRadius: 8, cursor: (!cfgDevice || exporting) ? 'not-allowed' : 'pointer',
              background: (!cfgDevice || exporting) ? C.accentBg : C.accentBgStrong,
              border: `1px solid ${C.accentBorderStrong}`,
              color: (!cfgDevice || exporting) ? C.faint : C.accent,
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
          >
            {exporting && (
              <span style={{
                width: 14, height: 14, display: 'inline-block',
                border: `2px solid ${C.accent}`, borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'exportSpin 0.8s linear infinite',
              }} />
            )}
            {exporting
              ? (lang === 'vi' ? 'Đang xuất...' : 'Exporting...')
              : (lang === 'vi' ? 'Xuất' : 'Export')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Sparkline({ data, color = '#10b981' }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const w = 80, h = 32
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatCard({ icon, label, value, sub, trend, sparkData, color = '#10b981', delay = 0, C }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  const up = trend >= 0
  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.cardBorder}`,
      borderRadius: 16, padding: 24,
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease, border-color 0.2s, background 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.cardBorderHover; e.currentTarget.style.background = C.cardBgHover }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.background = C.cardBg }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: C.accentBg, border: `1px solid ${C.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>{icon}</div>
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 600, color: C.heading, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: C.subheading, marginTop: 4 }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 11, fontFamily: "'DM Mono', monospace",
          color: up ? C.tagUp : C.tagDown,
          background: up ? C.tagUpBg : C.tagDownBg,
          border: `1px solid ${up ? C.tagUpBorder : C.tagDownBorder}`,
          borderRadius: 100, padding: '2px 8px',
        }}>
          {up ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
        <span style={{ fontSize: 12, color: C.faint }}>{sub}</span>
      </div>
    </div>
  )
}

function ActivityItem({ icon, title, time, color, C }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.divider}` }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: C.accentBg, border: `1px solid ${C.accentBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, color: C.body, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
      </div>
      <span style={{ fontSize: 11, color: C.faint, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{time}</span>
    </div>
  )
}

export default function Dashboard() {
  const { lang } = useLang()
  const C = useColors()
  const { profile, user } = useAuth()
  const { showUpsell, isPro } = useSubscription()
  const { devices: mqttDevices } = useMqttBridge()

  const navigate = useNavigate()
  const [myGroup, setMyGroup] = useState(null)
  const [groupLoading, setGroupLoading] = useState(true)
  const [userCount, setUserCount] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportModal, setExportModal] = useState(null)   // 'excel'|'latex'|'docs'|null
  const [dbDeviceIds, setDbDeviceIds] = useState([])
  const exportRef = useRef(null)

  useEffect(() => {
    const fetchMyGroup = async () => {
      if (!user?.id) return
      const { data: membership } = await supabase
        .from('group_members')
        .select('group_id, role, groups(id, name, description)')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (membership?.groups) {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', membership.group_id)
        setMyGroup({ ...membership.groups, memberCount: count || 0, role: membership.role })
      }
      setGroupLoading(false)
    }
    fetchMyGroup()
  }, [user?.id])

  useEffect(() => {
    const fetchUserCount = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      setUserCount(count)
    }
    fetchUserCount()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch registered devices from backend as fallback
  useEffect(() => {
    if (!exportModal) return
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    fetch(`${API_URL}/api/iot/devices`)
      .then(r => r.json())
      .then(({ devices }) => {
        const ids = (devices ?? []).map(d => d.device_id).filter(Boolean)
        setDbDeviceIds(ids)
      })
      .catch(() => setDbDeviceIds([]))
  }, [exportModal])

  // Merge mqttDevices + DB-only fallback device_ids
  const deviceOptions = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const d of mqttDevices ?? []) {
      if (!d?.id || seen.has(d.id)) continue
      seen.add(d.id)
      out.push({ id: d.id, name: d.name || d.id, icon: d.icon || '📡' })
    }
    for (const id of dbDeviceIds) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ id, name: id, icon: '📊' })
    }
    return out
  }, [mqttDevices, dbDeviceIds])

  const openExportModal = (format) => {
    setExportOpen(false)
    if ((format === 'latex' || format === 'docs') && !isPro) {
      showUpsell('export')
      return
    }
    setExportModal(format)
  }

  const userName = profile?.full_name
    || user?.email?.split('@')[0]
    || (lang === 'vi' ? 'Người dùng' : 'User')

  const stats = [
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
      label: t('dash_users', lang), value: userCount !== null ? `${userCount} users` : '...', sub: t('dash_vs_prev', lang), trend: 12.5,
      sparkData: [30, 45, 38, 52, 48, 60, 55, 70, 65, 80, 75, 90],
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
      label: t('dash_revenue', lang), value: '8/10 device/s', sub: t('dash_vs_prev', lang), trend: 8.3,
      sparkData: [20, 28, 25, 35, 30, 40, 38, 50, 45, 55, 52, 62],
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
      label: t('dash_tasks', lang), value: '1,204', sub: t('dash_this_week', lang), trend: 5.1,
      sparkData: [60, 72, 68, 80, 75, 85, 82, 90, 88, 95, 92, 98],
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
      label: t('dash_latency', lang), value: '12ms', sub: t('dash_avg_today', lang), trend: -3.2,
      sparkData: [18, 15, 20, 14, 16, 13, 15, 12, 14, 13, 12, 11],
      color: '#34d399',
    },
  ]

  const activities = [
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>, title: t('act_new_user', lang), time: lang === 'vi' ? '2 phút trước' : '2 mins ago', color: '#34d399' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>, title: t('act_task_done', lang), time: lang === 'vi' ? '15 phút trước' : '15 mins ago', color: '#10b981' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>, title: t('act_ai_reply', lang), time: lang === 'vi' ? '32 phút trước' : '32 mins ago', color: '#059669' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, title: t('act_update', lang), time: lang === 'vi' ? '1 giờ trước' : '1 hour ago', color: '#047857' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>, title: t('act_report', lang), time: lang === 'vi' ? '3 giờ trước' : '3 hours ago', color: '#065f46' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>, title: t('act_settings', lang), time: lang === 'vi' ? '5 giờ trước' : '5 hours ago', color: '#10b981' },
  ]

  const quickActions = [
    { label: t('dash_qa_task', lang), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> },
    { label: t('dash_qa_ai', lang), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /></svg> },
    { label: t('dash_qa_export', lang), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> },
    { label: t('dash_qa_invite', lang), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> },
  ]

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.body, minHeight: '100vh' }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes exportModalIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        @keyframes exportSpin{100%{transform:rotate(360deg)}}
      `}</style>

      {/* Welcome banner */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.heading, margin: 0, lineHeight: 1.2 }}>
              {t('dash_welcome', lang)}, <span style={{ color: C.accent }}>{userName}</span> 👋
            </h1>
            <p style={{ margin: '6px 0 0', color: C.subheading, fontSize: 14 }}>
              {t('dash_subtitle', lang)} · {new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {quickActions.map(({ label, icon }) => {
              const isExport = label === t('dash_qa_export', lang)

              if (isExport) {
                return (
                  <div key={label} ref={exportRef} style={{ position: 'relative' }}>
                    {/* Trigger button */}
                    <button
                      onClick={() => setExportOpen(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 8,
                        background: exportOpen ? C.accentBg : C.accentBgStrong,
                        border: `1px solid ${C.accentBorderStrong}`,
                        color: exportOpen ? C.accent : C.subheading,
                        fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                        fontFamily: 'inherit',
                      }}
                    >{icon}{label}</button>

                    {/* Dropdown panel */}
                    {exportOpen && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                        background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                        borderRadius: 16, padding: 20, zIndex: 200, minWidth: 220,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                      }}>
                        {/* Section title */}
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: C.heading,
                          marginBottom: 14, letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}>
                          {lang === 'vi' ? 'Xuất file' : 'Export as'}
                        </div>

                        {/* Format options */}
                        {[
                          { format: 'excel', label: '📊 Excel (.xlsx)', pro: false },
                          { format: 'latex', label: '📄 LaTeX',         pro: true  },
                          { format: 'docs',  label: '📝 Google Docs',   pro: true  },
                        ].map(({ format, label: fLabel, pro }) => (
                          <button
                            key={format}
                            onClick={() => openExportModal(format)}
                            style={{
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%', padding: '10px 14px',
                              borderRadius: 10, marginBottom: 4,
                              background: 'none', border: '1px solid transparent',
                              color: C.body, fontSize: 14, cursor: 'pointer',
                              fontFamily: 'inherit', textAlign: 'left',
                              transition: 'all 0.15s', gap: 8,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = C.accentBg
                              e.currentTarget.style.borderColor = C.accentBorder
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'none'
                              e.currentTarget.style.borderColor = 'transparent'
                            }}
                          >
                            <span>{fLabel}</span>
                            {pro && (
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                fontFamily: "'DM Mono', monospace",
                                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                                color: '#000', borderRadius: 100, padding: '2px 7px',
                                flexShrink: 0,
                              }}>PRO</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              // All other quick action buttons (unchanged)
              return (
                <button key={label}
                  onClick={() => {
                    if (label === t('dash_qa_invite', lang)) navigate('/dashboard/groups')
                    if (label === t('dash_qa_ai', lang))     navigate('/dashboard/ai')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    background: C.accentBgStrong, border: `1px solid ${C.accentBorderStrong}`,
                    color: C.subheading, fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.accentBg; e.currentTarget.style.color = C.accent }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.accentBgStrong; e.currentTarget.style.color = C.subheading }}
                >{icon}{label}</button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => {
          const card = <StatCard key={s.label} {...s} delay={i * 80} C={C} />
          if (s.label === t('dash_users', lang)) {
            return (
              <div key={s.label} onClick={() => navigate('/dashboard/groups')} style={{ cursor: 'pointer' }} title={lang === 'vi' ? 'Xem nhóm của bạn' : 'View your group'}>
                {card}
              </div>
            )
          }
          return card
        })}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 280px', gap: 16 }}>

        {/* Activity feed */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: C.body, margin: 0 }}>{t('dash_activity', lang)}</h2>
            <button style={{ fontSize: 12, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>{t('dash_view_all', lang)}</button>
          </div>
          {activities.map((a, i) => <ActivityItem key={i} {...a} C={C} />)}
        </div>

        {/* My Group */}
        <div
          onClick={() => navigate('/dashboard/groups')}
          style={{
            background: C.cardBg, border: `1px solid ${C.cardBorder}`,
            borderRadius: 16, padding: 24, cursor: 'pointer',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.cardBorderHover; e.currentTarget.style.background = C.cardBgHover }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.background = C.cardBg }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.body, margin: '0 0 16px' }}>
            {lang === 'vi' ? '👥 Nhóm của tôi' : '👥 My Group'}
          </h2>

          {groupLoading ? (
            <div style={{ color: C.muted, fontSize: 13 }}>
              {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
            </div>
          ) : myGroup ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.heading }}>{myGroup.name}</div>
              <div style={{ fontSize: 13, color: C.subheading, lineHeight: 1.5 }}>
                {myGroup.description || ''}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: C.accentBg, border: `1px solid ${C.accentBorder}`,
                borderRadius: 100, padding: '4px 12px', width: 'fit-content',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>
                  {myGroup.memberCount} {lang === 'vi' ? 'thành viên' : 'members'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {lang === 'vi' ? `Vai trò: ${myGroup.role}` : `Role: ${myGroup.role}`}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                {lang === 'vi'
                  ? 'Bạn chưa thuộc nhóm nào. Tạo hoặc tham gia nhóm ngay!'
                  : "You're not in any group yet. Create or join one!"}
              </div>
              <button
                onClick={e => { e.stopPropagation(); navigate('/dashboard/groups') }}
                style={{
                  background: 'linear-gradient(135deg,#065f46,#10b981)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                  fontWeight: 600, fontFamily: 'inherit', width: 'fit-content',
                }}
              >
                {lang === 'vi' ? '+ Tạo nhóm' : '+ Create Group'}
              </button>
            </div>
          )}
        </div>

        {/* System health */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.body, margin: '0 0 20px' }}>{t('dash_health', lang)}</h2>
          {[
            { label: 'API Server', pct: 98, color: '#34d399' },
            { label: 'Database', pct: 94, color: '#10b981' },
            { label: 'AI Engine', pct: 87, color: '#059669' },
            { label: 'Storage', pct: 72, color: '#047857' },
          ].map(({ label, pct, color }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color }}>{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: C.divider, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 3, transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: C.accentBg, border: `1px solid ${C.accentBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, boxShadow: `0 0 6px ${C.accent}` }} />
              <span style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>{t('dash_all_clear', lang)}</span>
            </div>
            <p style={{ fontSize: 12, color: C.subheading, margin: '4px 0 0 16px' }}>{t('dash_uptime_val', lang)}</p>
          </div>
        </div>

      </div>

      <div style={{ marginTop: 32, paddingBottom: 24, textAlign: 'center', fontSize: 13, color: C.muted }}>
        Powered by AERIS Core Engine © 2026.
      </div>

      {/* Export Options Modal */}
      {exportModal && (
        <ExportOptionsModal
          format={exportModal}
          deviceOptions={deviceOptions}
          onClose={() => setExportModal(null)}
          lang={lang}
          C={C}
        />
      )}
    </div>
  )
}