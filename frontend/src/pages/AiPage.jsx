import { useState, useRef, useEffect } from 'react'
import { useColors } from '../hooks/useColors'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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
function ConfirmModal({ onConfirm, onCancel, C }) {
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
        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 14, marginBottom: 16,
          background: '#f59e0b14', border: '1px solid #f59e0b44',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b',
        }}>
          <WarnIcon />
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.heading, margin: '0 0 8px' }}>
          Xác nhận quyền điều khiển
        </h3>
        <p style={{ fontSize: 13, color: C.subheading, lineHeight: 1.65, margin: '0 0 6px' }}>
          Bạn đang bật <b style={{ color: '#f59e0b' }}>chế độ điều khiển thiết bị</b>.
          Ở chế độ này AI có thể <b style={{ color: C.body }}>bật / tắt đèn, quạt và các thiết bị IoT</b> thực tế trong hệ thống của bạn.
        </p>
        <p style={{ fontSize: 12, color: C.faint, margin: '0 0 22px', lineHeight: 1.5 }}>
          ⚠️ Chỉ xác nhận nếu bạn thực sự muốn điều khiển thiết bị. Bạn có thể thu hồi quyền bất cứ lúc nào.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', borderRadius: 9,
            background: C.accentBg, border: `1px solid ${C.cardBorder}`,
            color: C.subheading, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>
            Huỷ bỏ
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '10px 0', borderRadius: 9,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none', color: '#000', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px #f59e0b44',
          }}>
            ✓ Cho phép điều khiển
          </button>
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
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
  const [mode, setMode] = useState('chat')
  const [controlGranted, setControlGranted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Chat thường · AI sẵn sàng trò chuyện', time: '' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const sessionId = useRef(`session_${Date.now()}`)

  const isControl = mode === 'control'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const now = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  const addSystem = (text) =>
    setMessages(prev => [...prev, { role: 'system', text, time: '' }])

  // ── Mode switching ──────────────────────────────────────────────────────────
  const switchToControl = () => {
    setShowConfirm(true)
  }

  const switchToChat = () => {
    setMode('chat')
    setControlGranted(false)
    addSystem('Đã chuyển về Chat thường · Quyền điều khiển đã thu hồi 🔒')
  }

  const confirmControl = () => {
    setShowConfirm(false)
    setMode('control')
    setControlGranted(true)
    addSystem('⚡ Chế độ điều khiển thiết bị đã được bật · Quyền đã cấp')
  }

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const snapshot = [...messages]
    const newMessages = [...snapshot, { role: 'user', text: trimmed, time: now() }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId.current,
          mode,
          control_granted: controlGranted,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Lỗi server: ${res.status}`)
      }

      const data = await res.json()
      if (!data.reply) throw new Error('Phản hồi không hợp lệ.')

      setMessages([...newMessages, { role: 'bot', text: data.reply, time: now() }])
    } catch (e) {
      setError(e.message)
      setMessages(snapshot)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.heading, margin: 0 }}>AI Assistant</h1>
          <p style={{ fontSize: 13, color: C.subheading, margin: '3px 0 0' }}>
            {isControl ? '⚡ Điều khiển thiết bị đang hoạt động' : 'Trò chuyện · Chuyển sang điều khiển khi cần'}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 4, background: C.accentBg, border: `1px solid ${C.cardBorder}`, borderRadius: 12 }}>
          {/* Chat button */}
          <button onClick={switchToChat} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            border: !isControl ? '1px solid #10b98155' : '1px solid transparent',
            background: !isControl ? '#10b98115' : 'transparent',
            color: !isControl ? '#10b981' : C.subheading,
            fontSize: 13, fontWeight: !isControl ? 600 : 400, cursor: 'pointer',
            transition: 'all 0.2s', fontFamily: 'inherit',
          }}>
            <ChatIcon /> Chat thường
          </button>

          {/* Control button */}
          <button onClick={switchToControl} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            border: isControl ? '1px solid #f59e0b55' : '1px solid transparent',
            background: isControl ? '#f59e0b15' : 'transparent',
            color: isControl ? '#f59e0b' : C.subheading,
            fontSize: 13, fontWeight: isControl ? 600 : 400, cursor: 'pointer',
            transition: 'all 0.2s', fontFamily: 'inherit',
          }}>
            <ControlIcon /> Điều khiển
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
            <b>Quyền điều khiển đang bật.</b>{' '}
            <span style={{ opacity: 0.75 }}>AI có thể bật/tắt đèn, quạt theo lệnh của bạn.</span>
          </span>
          <button onClick={switchToChat} style={{
            marginLeft: 'auto', fontSize: 12, color: '#f59e0b',
            background: '#f59e0b18', border: '1px solid #f59e0b44',
            borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Thu hồi quyền 🔒
          </button>
        </div>
      )}

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

        {/* Loading dots */}
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

        {/* Error */}
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
          placeholder={isControl
            ? '⚡ Nhập lệnh điều khiển... (vd: "Bật đèn phòng khách")'
            : 'Nhắn gì đó... (Enter gửi · Shift+Enter xuống dòng)'}
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

      {/* Confirm modal */}
      {showConfirm && <ConfirmModal onConfirm={confirmControl} onCancel={() => setShowConfirm(false)} C={C} />}
    </div>
  )
}