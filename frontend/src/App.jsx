import { useState, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './supabaseClient'
import ErrorBoundary from './components/ErrorBoundary'

// ── Page imports ─────────────────────────────────────────────
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AiPage from './pages/AiPage'
import UpdatePage from './pages/UpdatePage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'
import CommunityPage from './pages/CommunityPage'   // ← NEW
import AdminPage from './pages/AdminPage'
import AdminRoute from './components/AdminRoute'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import UpsellModal from './components/UpsellModal'
import { useLang } from './contexts/LangContext'
import { t } from './i18n'
import Sidebar from './components/Sidebar'
import IoTDashboard from './pages/IoTDashboard'
import GroupPage from './pages/GroupPage'
import ProductsPage from './pages/ProductsPage'

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
    <SubscriptionProvider>
      <UpsellModal />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a2e1e',
            color: '#e2f5e8',
            border: '1px solid #2d4a35',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: "'Inter', system-ui, sans-serif",
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#052e16' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
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
          <Route index                element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="ai"            element={<ErrorBoundary><AiPage /></ErrorBoundary>} />
          <Route path="update"        element={<ErrorBoundary><UpdatePage /></ErrorBoundary>} />
          <Route path="settings"      element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          <Route path="help"          element={<ErrorBoundary><HelpPage /></ErrorBoundary>} />
          <Route path="iot"           element={<ErrorBoundary><IoTDashboard /></ErrorBoundary>} />
          <Route path="community"     element={<ErrorBoundary><CommunityPage /></ErrorBoundary>} />
          <Route path="groups"        element={<ErrorBoundary><GroupPage /></ErrorBoundary>} />
          <Route path="groups/:id"    element={<ErrorBoundary><GroupPage /></ErrorBoundary>} />
          <Route path="products"      element={<ErrorBoundary><ProductsPage /></ErrorBoundary>} />
          <Route path="admin"         element={
            <AdminRoute>
              <ErrorBoundary><AdminPage /></ErrorBoundary>
            </AdminRoute>
          } />
        </Route>

        {/* ── FALLBACK ── */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
    </SubscriptionProvider>
  )
}