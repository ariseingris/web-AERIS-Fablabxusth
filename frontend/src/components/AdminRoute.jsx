import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useColors } from '../hooks/useColors'

export default function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  const C = useColors()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 300, color: C.faint, fontSize: 13,
        fontFamily: "'DM Mono', monospace",
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          border: `2px solid ${C.divider}`,
          borderTopColor: C.accent,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
