import { useState, useRef, useEffect, useCallback } from 'react'
import { useColors } from '../hooks/useColors'
import { useLang } from '../contexts/LangContext'
import { t } from '../i18n'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../hooks/useAuth'
import StatusBadge from '../components/StatusBadge'
import toast from 'react-hot-toast'

const _BASE          = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API_URL        = `${_BASE}/api/ai/chat-proxy`
const HEALTH_URL     = `${_BASE}/api/ai/health`
const MODEL_INFO_URL = `${_BASE}/api/ai/model-info`
const RETRY_DELAYS   = [1000, 2000, 4000] // exponential backoff: 1s, 2s, 4s

// ── Icons ─────────────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const ChatIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const ControlIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07" />
  </svg>
)
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const UnlockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
)
const BotIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
  </svg>
)
const WarnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel, C, lang }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: C.cardBg, border: '1px solid #f59e0b55',
        borderRadius: 18, padding: 28, maxWidth: 420, width: '90%',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px #f59e0b11',
        animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, marginBottom: 16,
          background: '#f59e0b14', border: '1px solid #f59e0b44',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b',
        }}>
          <WarnIcon />
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, margin: '0 0 8px' }}>
          {t('ai_modal_title', lang)}
        </h3>
        <p style={{ fontSize: 13, color: C.subheading, lineHeight: 1.65, margin: '0 0 6px' }}>
          {t('ai_modal_p1a', lang)}<b style={{ color: '#f59e0b' }}>{t('ai_modal_p1b', lang)}</b>
          {t('ai_modal_p1c', lang)}<b style={{ color: C.body }}>{t('ai_modal_p1d', lang)}</b>{t('ai_modal_p1e', lang)}
        </p>
        <p style={{ fontSize: 12, color: C.faint, margin: '0 0 22px', lineHeight: 1.5 }}>
          {t('ai_modal_warn', lang)}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', borderRadius: 9,
            background: C.accentBg, border: `1px solid ${C.cardBorder}`,
            color: C.subheading, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>
            {t('ai_modal_cancel', lang)}
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '10px 0', borderRadius: 9,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none', color: '#000', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px #f59e0b44',
          }}>
            {t('ai_modal_confirm', lang)}
          </button>
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}

// ── Report Format Modal ───────────────────────────────────────────────────────
function ReportFormatModal({ onConfirm, onCancel, C, lang }) {
  const [format, setFormat] = useState('markdown')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.cardBorder}`,
        borderRadius: 18, padding: 28, maxWidth: 320, width: '90%',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      }}>
        <h3 style={{ marginTop: 0, color: C.heading }}>{t('ai_format_title', lang) || "Select Format"}</h3>
        <select value={format} onChange={e => setFormat(e.target.value)} style={{
          width: '100%', padding: '10px', borderRadius: 8, background: C.accentBg, border: `1px solid ${C.accentBorder}`, color: C.body, marginBottom: 20
        }}>
          <option value="markdown">Markdown</option>
          <option value="latex">LaTeX</option>
          <option value="excel">Excel</option>
          <option value="docx">DOCX</option>
        </select>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 10, background: C.accentBg, color: C.subheading, border: `1px solid ${C.cardBorder}`, borderRadius: 8 }}>{t('ai_modal_cancel', lang) || "Cancel"}</button>
          <button onClick={() => onConfirm(format)} style={{ flex: 1, padding: 10, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>{t('ai_format_next', lang) || "Next"}</button>
        </div>
      </div>
    </div>
  )
}


// ── Research Dialog ───────────────────────────────────────────────────────────
function ResearchDialog({ onSubmit, onCancel, C }) {
  const [q, setQ] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.cardBorder}`,
        borderRadius: 18, padding: 28, maxWidth: 400, width: '90%',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <h3 style={{ marginTop: 0, color: C.heading, fontSize: 16, fontWeight: 700 }}>
          Research Plants
        </h3>
        <p style={{ fontSize: 13, color: C.subheading, margin: '0 0 14px' }}>
          Enter a topic to research (e.g. "rice diseases", "irrigation tips")
        </p>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && q.trim() && onSubmit(q.trim())}
          placeholder="Search topic..."
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            background: C.accentBg, border: `1px solid ${C.accentBorder}`,
            color: C.body, fontSize: 14, marginBottom: 18, boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', borderRadius: 9,
            background: C.accentBg, border: `1px solid ${C.cardBorder}`,
            color: C.subheading, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button
            onClick={() => q.trim() && onSubmit(q.trim())}
            disabled={!q.trim()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              background: q.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : C.accentBg,
              border: 'none', color: q.trim() ? '#fff' : C.faint,
              fontSize: 13, fontWeight: 700, cursor: q.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >Search</button>
        </div>
      </div>
    </div>
  )
}

// ── Group Picker Modal ─────────────────────────────────────────────────────────
function GroupPickerModal({ groups, selectedId, onSelect, onSubmit, onCancel, C }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.cardBorder}`,
        borderRadius: 18, padding: 28, maxWidth: 360, width: '90%',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <h3 style={{ marginTop: 0, color: C.heading, fontSize: 16, fontWeight: 700 }}>
          Select Group
        </h3>
        {groups.length === 0 ? (
          <p style={{ fontSize: 13, color: C.subheading }}>
            No groups found. Join or create a group first.
          </p>
        ) : (
          <select
            value={selectedId}
            onChange={e => onSelect(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: C.accentBg, border: `1px solid ${C.accentBorder}`,
              color: C.body, fontSize: 14, marginBottom: 18, boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          >
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', borderRadius: 9,
            background: C.accentBg, border: `1px solid ${C.cardBorder}`,
            color: C.subheading, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button
            onClick={onSubmit}
            disabled={!selectedId || groups.length === 0}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              background: (selectedId && groups.length > 0) ? 'linear-gradient(135deg, #10b981, #059669)' : C.accentBg,
              border: 'none', color: (selectedId && groups.length > 0) ? '#fff' : C.faint,
              fontSize: 13, fontWeight: 700,
              cursor: (selectedId && groups.length > 0) ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >Generate Schedule</button>
        </div>
      </div>
    </div>
  )
}

// ── Announcement Modal ─────────────────────────────────────────────────────────
function AnnouncementModal({ onSubmit, onCancel, C }) {
  const [text, setText] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.cardBorder}`,
        borderRadius: 18, padding: 28, maxWidth: 440, width: '90%',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <h3 style={{ marginTop: 0, color: C.heading, fontSize: 16, fontWeight: 700 }}>
          Post Announcement
        </h3>
        <p style={{ fontSize: 13, color: C.subheading, margin: '0 0 14px' }}>
          This will be submitted for community review.
        </p>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write your announcement..."
          rows={5}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            background: C.accentBg, border: `1px solid ${C.accentBorder}`,
            color: C.body, fontSize: 14, resize: 'vertical', marginBottom: 18,
            boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6,
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', borderRadius: 9,
            background: C.accentBg, border: `1px solid ${C.cardBorder}`,
            color: C.subheading, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button
            onClick={() => text.trim() && onSubmit(text.trim())}
            disabled={!text.trim()}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              background: text.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : C.accentBg,
              border: 'none', color: text.trim() ? '#fff' : C.faint,
              fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >Post</button>
        </div>
      </div>
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, C, isControl }) {
  const isUser = msg.role === 'user'

  if (msg.role === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
        <span style={{
          fontSize: 11, color: C.faint, background: C.accentBg,
          border: `1px solid ${C.accentBorder}`, borderRadius: 100,
          padding: '3px 14px', fontFamily: "'DM Mono', monospace",
        }}>
          {msg.text}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: isControl ? '#f59e0b14' : C.accentBg,
          border: `1px solid ${isControl ? '#f59e0b44' : C.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isControl ? '#f59e0b' : '#10b981',
        }}>
          <BotIcon />
        </div>
      )}
      <div style={{
        maxWidth: '70%', padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        fontSize: 14, lineHeight: 1.65,
        background: isUser ? 'linear-gradient(135deg, #10b981, #059669)' : C.cardBg,
        border: isUser ? 'none' : `1px solid ${isControl ? '#f59e0b22' : C.cardBorder}`,
        color: isUser ? '#fff' : C.body,
        boxShadow: isUser ? '0 2px 14px #10b98130' : 'none',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.text}
        {msg.time && (
          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.45, textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>
            {msg.time}
          </div>
        )}
      </div>
    </div>
  )
}

// ── AiPage ────────────────────────────────────────────────────────────────────
export default function AiPage() {
  const C = useColors()
  const { session } = useAuth()
  const { showUpsell } = useSubscription()
  const { lang } = useLang()
  const [mode, setMode] = useState('chat')
  const [controlGranted, setControlGranted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [showResearchDialog, setShowResearchDialog] = useState(false)
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [reportFormat, setReportFormat] = useState('markdown')
  const [userGroups, setUserGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [messages, setMessages] = useState(() => [
    { role: 'system', text: t('ai_sys_ready', lang), time: '' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [healthStatus, setHealthStatus] = useState('checking') // 'checking' | 'ok' | 'error'
  const [modelInfo, setModelInfo] = useState(null) // { model, status, loaded_at }
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const sessionId = useRef(`session_${Date.now()}`)

  const checkHealth = useCallback(() => {
    fetch(HEALTH_URL)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(() => setHealthStatus('ok'))
      .catch(() => setHealthStatus('error'))
  }, [])

  useEffect(() => {
    checkHealth()
    fetch(MODEL_INFO_URL)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setModelInfo(data))
      .catch(() => {})
    // Re-poll every 30 s so the badge updates on failure or recovery
    const id = setInterval(checkHealth, 30_000)
    return () => clearInterval(id)
  }, [checkHealth])

  const isControl = mode === 'control'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const now = () => new Date().toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })

  const addSystem = (text) =>
    setMessages(prev => [...prev, { role: 'system', text, time: '' }])

  const showToast = (msg, type = 'error') => {
    if (type === 'success') toast.success(msg)
    else toast.error(msg)
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
  })

  const fetchUserGroups = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/groups`, { headers: authHeaders() })
      const data = await res.json()
      const groups = data.groups || []
      setUserGroups(groups)
      setSelectedGroupId(groups[0]?.id || '')
    } catch {
      showToast('Failed to load groups', 'error')
    }
  }

  const switchToChat = () => {
    if (mode === 'chat') return
    setMode('chat')
    setControlGranted(false)
    addSystem(t('ai_sys_to_chat', lang))
  }

  const switchToControl = () => {
    if (mode === 'control') return
    setPendingAction(null)
    if (!controlGranted) {
      setShowConfirm(true)
    } else {
      setMode('control')
      addSystem(t('ai_sys_ctrl_active', lang))
    }
  }

  const doQuickAction = async (actionType, extra = {}) => {
    setIsLoading(true)
    setError(null)
    const hdrs = authHeaders()

    try {
      if (actionType === 'research') {
        const { query } = extra
        setMessages(prev => [...prev, { role: 'user', text: `Research: ${query}`, time: now() }])
        const res = await fetch(`${BASE_URL}/api/ai/research`, {
          method: 'POST', headers: hdrs, body: JSON.stringify({ query }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 403 && data.error === 'requires_pro') showUpsell('ai')
          throw new Error(data.error || 'Research failed')
        }
        setMessages(prev => [...prev, { role: 'assistant', text: data.result, time: now() }])
      }

      else if (actionType === 'predict') {
        setMessages(prev => [...prev, { role: 'user', text: t('ai_qa_predict', lang), time: now() }])
        const res = await fetch(`${BASE_URL}/api/ai/predict`, {
          method: 'POST', headers: hdrs, body: JSON.stringify({ user_confirmed: true }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 403 && data.error === 'requires_pro') showUpsell('ai')
          throw new Error(data.error || 'Prediction failed')
        }
        setMessages(prev => [...prev, { role: 'assistant', text: data.prediction, time: now() }])
      }

      else if (actionType === 'report') {
        const { format } = extra
        setMessages(prev => [...prev, { role: 'user', text: `Generate ${format} report`, time: now() }])
        const res = await fetch(`${BASE_URL}/api/ai/report`, {
          method: 'POST', headers: hdrs,
          body: JSON.stringify({ user_confirmed: true, format }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 403 && data.error === 'requires_pro') showUpsell('ai')
          throw new Error(data.error || 'Report generation failed')
        }
        setMessages(prev => [...prev, { role: 'assistant', text: data.report, time: now() }])
        if (format !== 'markdown') {
          const ext = format === 'latex' ? 'tex' : format
          const blob = new Blob([data.report], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = `aeris_report.${ext}`; a.click()
          URL.revokeObjectURL(url)
          showToast(`Downloaded as .${ext}`, 'success')
        }
      }

      else if (actionType === 'schedule') {
        const { groupId } = extra
        setMessages(prev => [...prev, { role: 'user', text: `Generate schedule for group`, time: now() }])
        const res = await fetch(`${BASE_URL}/api/groups/${groupId}/schedule`, {
          method: 'POST', headers: hdrs, body: JSON.stringify({ user_confirmed: true }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Schedule generation failed')
        setMessages(prev => [...prev, { role: 'assistant', text: data.schedule, time: now() }])
        showToast('Schedule saved to group journal', 'success')
      }

      else if (actionType === 'announce') {
        const { content } = extra
        setMessages(prev => [...prev, { role: 'user', text: `Announcement: ${content}`, time: now() }])
        const res = await fetch(`${BASE_URL}/api/announcements`, {
          method: 'POST', headers: hdrs,
          body: JSON.stringify({ content, user_confirmed: true }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Announcement failed')
        setMessages(prev => [...prev, { role: 'assistant', text: 'Announcement submitted for community review.', time: now() }])
        showToast('Announcement submitted', 'success')
      }
    } catch (err) {
      const msg = err.message || t('ai_err_connect', lang)
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
      setPendingAction(null)
    }
  }

  const handleActionClick = (actionType) => {
    if (isLoading) return
    if (actionType === 'research') {
      setShowResearchDialog(true)
    } else if (actionType === 'report') {
      setShowFormatModal(true)
    } else if (actionType === 'predict') {
      setPendingAction('predict')
      setShowConfirm(true)
    } else if (actionType === 'schedule') {
      setPendingAction('schedule')
      setShowConfirm(true)
    } else if (actionType === 'announce') {
      setPendingAction('announce')
      setShowConfirm(true)
    }
  }

  const confirmFormat = (format) => {
    setShowFormatModal(false)
    setReportFormat(format)
    setPendingAction('report')
    setShowConfirm(true)
  }

  const confirmControl = async () => {
    setShowConfirm(false)
    setControlGranted(true)

    if (pendingAction === 'predict') {
      doQuickAction('predict')
    } else if (pendingAction === 'report') {
      doQuickAction('report', { format: reportFormat })
    } else if (pendingAction === 'schedule') {
      await fetchUserGroups()
      setShowGroupPicker(true)
    } else if (pendingAction === 'announce') {
      setShowAnnouncementDialog(true)
    } else {
      setMode('control')
      addSystem(t('ai_sys_ctrl_granted', lang))
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text, time: now() }])
    setIsLoading(true)

    const payload = {
      message: text,
      session_id: sessionId.current,
      mode,
      control_granted: controlGranted,
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    }

    let lastErr = null
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]))
      }
      try {
        const res = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(payload) })
        const data = await res.json()

        if (!res.ok) {
          if (res.status === 403 && data.error === 'requires_pro') {
            showUpsell('ai')
            setError('Free AI limit reached.')
            break
          }
          // 5xx errors are retryable; 4xx are not
          lastErr = data.error || `Server error ${res.status}`
          if (res.status < 500) break
          continue
        }

        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, time: now() }])
        lastErr = null
        break
      } catch (err) {
        lastErr = err.message || t('ai_err_connect', lang)
      }
    }

    if (lastErr) setError(lastErr)
    setIsLoading(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        *{box-sizing:border-box}
        textarea:focus{outline:none}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#10b98122;border-radius:4px}
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes fadeDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: C.heading, margin: 0 }}>
              {t('ai_page_title', lang) || "AERIS AI"}
              {modelInfo?.model && (
                <span style={{ fontSize: 14, fontWeight: 400, color: C.subheading, marginLeft: 8 }}>
                  ({modelInfo.model})
                </span>
              )}
            </h1>
            <StatusBadge
              status={healthStatus === 'ok' ? 'ok' : healthStatus === 'error' ? 'error' : 'checking'}
              label={
                healthStatus === 'ok'
                  ? (modelInfo?.status === 'ready' ? 'Model Ready' : 'AI Online')
                  : healthStatus === 'error' ? 'AI Offline' : 'Checking…'
              }
              C={C}
            />
            {modelInfo?.loaded_at && (
              <span style={{ fontSize: 11, color: C.faint, fontFamily: "'DM Mono', monospace" }}>
                loaded {new Date(modelInfo.loaded_at).toLocaleTimeString()}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: C.subheading, margin: '3px 0 0' }}>
            {isControl ? t('ai_sub_control', lang) : t('ai_sub_chat', lang)}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: C.accentBg, border: `1px solid ${C.cardBorder}`, borderRadius: 12 }}>
          <button onClick={switchToChat} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            border: !isControl ? '1px solid #10b98155' : '1px solid transparent',
            background: !isControl ? '#10b98115' : 'transparent',
            color: !isControl ? '#10b981' : C.subheading,
            fontSize: 13, fontWeight: !isControl ? 600 : 400, cursor: 'pointer',
            transition: 'all 0.2s', fontFamily: 'inherit',
          }}>
            <ChatIcon /> {t('ai_chat_label', lang)}
          </button>

          <button onClick={switchToControl} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            border: isControl ? '1px solid #f59e0b55' : '1px solid transparent',
            background: isControl ? '#f59e0b15' : 'transparent',
            color: isControl ? '#f59e0b' : C.subheading,
            fontSize: 13, fontWeight: isControl ? 600 : 400, cursor: 'pointer',
            transition: 'all 0.2s', fontFamily: 'inherit',
          }}>
            <ControlIcon /> {t('ai_control_label', lang)}
            <span style={{ opacity: 0.75, marginLeft: 2 }}>
              {isControl ? <UnlockIcon /> : <LockIcon />}
            </span>
          </button>
        </div>
      </div>

      {/* Control mode banner */}
      {isControl && (
        <div style={{
          padding: '10px 16px', borderRadius: 10,
          background: '#f59e0b0c', border: '1px solid #f59e0b33',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, color: '#f59e0b',
          animation: 'fadeDown 0.3s ease',
        }}>
          <UnlockIcon />
          <span>
            <b>{t('ai_banner_on', lang)}</b>{' '}
            <span style={{ opacity: 0.75 }}>{t('ai_banner_desc', lang)}</span>
          </span>
          <button onClick={switchToChat} style={{
            marginLeft: 'auto', fontSize: 12, color: '#f59e0b',
            background: '#f59e0b18', border: '1px solid #f59e0b44',
            borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {t('ai_revoke', lang)}
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'research', label: t('ai_qa_research', lang) || "Research Plants", icon: '🔍' },
          { id: 'predict', label: t('ai_qa_predict', lang) || "Analyze IoT Data", icon: '📈' },
          { id: 'report', label: t('ai_qa_report', lang) || "Generate Report", icon: '📑' },
          { id: 'schedule', label: t('ai_qa_schedule', lang) || "Group Schedule", icon: '📅' },
          { id: 'announce', label: t('ai_qa_announce', lang) || "Announcement", icon: '📢' },
        ].map(qa => (
          <button key={qa.id} onClick={() => handleActionClick(qa.id)} disabled={isLoading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 20, border: `1px solid ${C.cardBorder}`, background: C.cardBg,
            color: C.body, fontSize: 13, cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1, transition: 'all 0.2s',
          }}>
            <span>{qa.icon}</span> {qa.label}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div style={{
        flex: 1, minHeight: 340, maxHeight: 460, overflowY: 'auto',
        padding: 16, background: C.cardBg,
        border: `1px solid ${isControl ? '#f59e0b33' : C.cardBorder}`,
        borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.4s',
      }}>
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} C={C} isControl={isControl} />
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: isControl ? '#f59e0b14' : C.accentBg,
              border: `1px solid ${isControl ? '#f59e0b44' : C.accentBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isControl ? '#f59e0b' : '#10b981',
            }}>
              <BotIcon />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: C.cardBg, border: `1px solid ${C.cardBorder}` }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isControl ? '#f59e0b' : '#10b981',
                    animation: `bounce 1.2s ease ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 12,
            background: '#ef444412', border: '1px solid #ef444430', color: '#ef4444',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <WarnIcon /> {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-end',
        padding: '10px 14px', background: C.cardBg,
        border: `1px solid ${isControl ? '#f59e0b33' : C.cardBorder}`,
        borderRadius: 14, transition: 'border-color 0.4s',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={isControl ? t('ai_ph_control', lang) : t('ai_ph_chat', lang)}
          rows={1}
          style={{
            flex: 1, resize: 'none', border: 'none', background: 'transparent',
            color: C.body, fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit',
            maxHeight: 120, overflowY: 'auto', opacity: isLoading ? 0.5 : 1,
          }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0, border: 'none',
            background: (isLoading || !input.trim())
              ? C.accentBg
              : isControl
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #10b981, #059669)',
            cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: (isLoading || !input.trim()) ? C.faint : '#fff',
            boxShadow: (isLoading || !input.trim()) ? 'none'
              : isControl ? '0 2px 14px #f59e0b40' : '0 2px 14px #10b98140',
            transition: 'all 0.2s',
          }}
        >
          <SendIcon />
        </button>
      </div>

      {showConfirm && <ConfirmModal onConfirm={confirmControl} onCancel={() => { setShowConfirm(false); setPendingAction(null) }} C={C} lang={lang} />}
      {showFormatModal && <ReportFormatModal onConfirm={confirmFormat} onCancel={() => setShowFormatModal(false)} C={C} lang={lang} />}
      {showResearchDialog && (
        <ResearchDialog
          C={C}
          onCancel={() => setShowResearchDialog(false)}
          onSubmit={query => { setShowResearchDialog(false); doQuickAction('research', { query }) }}
        />
      )}
      {showGroupPicker && (
        <GroupPickerModal
          C={C}
          groups={userGroups}
          selectedId={selectedGroupId}
          onSelect={setSelectedGroupId}
          onCancel={() => { setShowGroupPicker(false); setPendingAction(null) }}
          onSubmit={() => { setShowGroupPicker(false); doQuickAction('schedule', { groupId: selectedGroupId }) }}
        />
      )}
      {showAnnouncementDialog && (
        <AnnouncementModal
          C={C}
          onCancel={() => { setShowAnnouncementDialog(false); setPendingAction(null) }}
          onSubmit={content => { setShowAnnouncementDialog(false); doQuickAction('announce', { content }) }}
        />
      )}
    </div>
  )
}