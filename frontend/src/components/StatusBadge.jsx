/**
 * StatusBadge
 * Colored dot + label. Pulses when status is connecting/reconnecting/checking.
 *
 * Props:
 *   status  — 'connected'|'open'|'ok' | 'connecting'|'reconnecting'|'checking' | 'disconnected'|'closed'|'error'|'offline'
 *   label   — text displayed next to the dot
 *   C       — colors object from useColors()
 */

const STATUS_CFG = {
  connected:    { color: '#34d399', glow: true,  pulse: false },
  open:         { color: '#34d399', glow: true,  pulse: false },
  ok:           { color: '#10b981', glow: true,  pulse: false },
  connecting:   { color: '#f59e0b', glow: false, pulse: true  },
  reconnecting: { color: '#f59e0b', glow: false, pulse: true  },
  checking:     { color: '#94a3b8', glow: false, pulse: true  },
  disconnected: { color: '#f87171', glow: false, pulse: false },
  closed:       { color: '#f87171', glow: false, pulse: false },
  error:        { color: '#ef4444', glow: false, pulse: false },
  offline:      { color: '#f87171', glow: false, pulse: false },
}

export default function StatusBadge({ status, label, C = {} }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.disconnected

  return (
    <>
      <style>{`
        @keyframes sb-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.85); }
        }
      `}</style>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontFamily: "'DM Mono', monospace",
        color: C.faint,
        background: C.accentBg,
        border: `1px solid ${cfg.color}`,
        borderRadius: 100,
        padding: '4px 10px',
        userSelect: 'none',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: cfg.color,
          display: 'inline-block', flexShrink: 0,
          boxShadow: cfg.glow ? `0 0 6px ${cfg.color}` : 'none',
          animation: cfg.pulse ? 'sb-pulse 1.2s ease-in-out infinite' : 'none',
        }} />
        {label}
      </span>
    </>
  )
}
