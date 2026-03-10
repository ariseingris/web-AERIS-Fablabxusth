import { Navigate } from 'react-router-dom'

// Wraps protected pages. Redirects to /login if no active session.
export default function ProtectedRoute({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return children
}