import { useState, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom'
import { supabase } from './supabaseClient'

// ── Page imports ─────────────────────────────────────────────
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AiPage from './pages/AiPage'
import UpdatePage from './pages/UpdatePage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'
import CommunityPage from './pages/CommunityPage'   // ← NEW
import { useLang } from './contexts/LangContext'
import { t } from './i18n'
import Sidebar from './components/Sidebar'
import IoTDashboard from './pages/IoTDashboard'

// ============================================================
// MAIN LAYOUT  — sidebar + content side by side (inline styles)
// ============================================================
function MainLayout({ session, handleLogout }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      width: '100%',
      overflow: 'hidden',
      background: 'var(--bg-color)',
    }}>
      <Sidebar session={session} handleLogout={handleLogout} />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
        minWidth: 0,
      }}>
        <Outlet />
      </main>
    </div>
  )
}

// ============================================================
// PROTECTED ROUTE
// ============================================================
function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const { lang } = useLang()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0a1a12',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(16,185,129,0.2)',
            borderTopColor: '#10b981',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          <span style={{ color: '#4ade80', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
            {t('login_loading', lang)}
          </span>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <Router>
      <Routes>

        {/* ── PUBLIC ── */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={session ? <Navigate to="/dashboard" /> : <Login />}
        />

        {/* ── DASHBOARD (protected, with sidebar) ── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <MainLayout session={session} handleLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index                element={<Dashboard />} />
          <Route path="ai"            element={<AiPage />} />
          <Route path="update"        element={<UpdatePage />} />
          <Route path="settings"      element={<SettingsPage />} />
          <Route path="help"          element={<HelpPage />} />
          <Route path="iot"           element={<IoTDashboard />} />
          <Route path="community"     element={<CommunityPage />} />  {/* ← NEW */}
        </Route>

        {/* ── FALLBACK ── */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  )
}