import { createContext, useContext, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------
const IconDashboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
)
const IconBot = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" />
    <line x1="16" y1="16" x2="16" y2="16" />
  </svg>
)
const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)
const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconHelp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const IconLogOut = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const SidebarContext = createContext()

// ---------------------------------------------------------------------------
// Theme tokens (inline style values)
// ---------------------------------------------------------------------------
const DARK = {
  bg: '#0f172a',
  bgCollapsed: '#080f1a',
  border: 'rgba(100,116,139,0.3)',
  text: '#94a3b8',
  textHover: '#f1f5f9',
  itemActiveBg: 'rgba(16,185,129,0.15)',
  itemActiveColor: '#34d399',

  userNameColor: '#f1f5f9',
  userEmailColor: '#64748b',
  tooltipBg: '#1e293b',
  tooltipColor: '#f1f5f9',
  tooltipBorder: 'rgba(100,116,139,0.3)',
  divider: 'rgba(100,116,139,0.2)',
}

const LIGHT = {
  bg: '#ffffff',
  bgCollapsed: '#f8fafc',
  border: '#e2e8f0',
  text: '#64748b',
  textHover: '#0f172a',
  itemActiveBg: '#ecfdf5',
  itemActiveColor: '#059669',

  userNameColor: '#0f172a',
  userEmailColor: '#64748b',
  tooltipBg: '#ffffff',
  tooltipColor: '#0f172a',
  tooltipBorder: '#e2e8f0',
  divider: '#e2e8f0',
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
export default function Sidebar({ session, handleLogout }) {
  const [expanded, setExpanded] = useState(false)
  const { theme } = useTheme()

  const effectiveTheme =
    theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme

  const C = effectiveTheme === 'light' ? LIGHT : DARK

  const userEmail = session?.user?.email || 'user@example.com'
  const userName = userEmail.split('@')[0]

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        height: '100vh',
        flexShrink: 0,
        overflow: 'hidden',
        width: expanded ? 240 : 72,
        background: expanded ? C.bg : C.bgCollapsed,
        borderRight: `1px solid ${C.border}`,
        transition: 'width 0.25s ease, background 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '14px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: `1px solid ${C.border}`,
        minHeight: 60,
      }}>
        <img
          src="/Aeris.svg"
          alt="Aeris"
          style={{
            width: 32,
            height: 32,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
      </div>

      {/* ── Nav items ── */}
      <SidebarContext.Provider value={{ expanded, C }}>
        <ul style={{
          flex: 1,
          padding: '12px 8px',
          margin: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          <SidebarItem icon={<IconDashboard />} text="Tổng quan" to="/dashboard" exact />
          <SidebarItem icon={<IconBot />} text="Khu vực AI" to="/dashboard/ai" />
          <SidebarItem icon={<IconRefresh />} text="Cập nhật" to="/dashboard/update" />
          <li style={{ margin: '6px 0', borderTop: `1px solid ${C.divider}` }} />
          <SidebarItem icon={<IconSettings />} text="Cài đặt" to="/dashboard/settings" />
          <SidebarItem icon={<IconHelp />} text="Trợ giúp" to="/dashboard/help" />
        </ul>
      </SidebarContext.Provider>

      {/* ── User profile ── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: '10px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        overflow: 'hidden',
      }}>
        <img
          src={`https://ui-avatars.com/api/?name=${userName}&background=059669&color=ffffff&bold=true`}
          alt="Avatar"
          style={{
            width: 36, height: 36,
            borderRadius: 8,
            flexShrink: 0,
            objectFit: 'cover',
          }}
        />
        {expanded && (
          <div style={{
            flex: 1, minWidth: 0,
            display: 'flex', alignItems: 'center', gap: 4,
            overflow: 'hidden',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: C.userNameColor,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{userName}</div>
              <div style={{
                fontSize: 11, color: C.userEmailColor,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{userEmail}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              style={{
                width: 30, height: 30,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: C.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = 'transparent' }}
            >
              <IconLogOut />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// SidebarItem
// ---------------------------------------------------------------------------
function SidebarItem({ icon, text, to, exact = false }) {
  const { expanded, C } = useContext(SidebarContext)
  const [hovered, setHovered] = useState(false)

  return (
    <li style={{ position: 'relative', listStyle: 'none' }}>
      <NavLink
        to={to}
        end={exact}
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? 10 : 0,
          padding: '9px 10px',
          borderRadius: 8,
          textDecoration: 'none',
          color: isActive ? C.itemActiveColor : (hovered ? C.textHover : C.text),
          background: isActive ? C.itemActiveBg : (hovered ? 'rgba(255,255,255,0.05)' : 'transparent'),
          fontWeight: isActive ? 600 : 400,
          fontSize: 14,
          transition: 'all 0.15s',
          cursor: 'pointer',
          justifyContent: expanded ? 'flex-start' : 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        })}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
        {expanded && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
        )}
      </NavLink>

      {/* Tooltip when collapsed */}
      {!expanded && hovered && (
        <div style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: 10,
          padding: '6px 10px',
          borderRadius: 6,
          background: C.tooltipBg,
          color: C.tooltipColor,
          border: `1px solid ${C.tooltipBorder}`,
          fontSize: 13,
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </li>
  )
}