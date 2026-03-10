import { Navigate } from 'react-router-dom'

// Skip page simply redirects straight to the dashboard.
// Can be used as a route: <Route path="/skip" element={<Skip />} />
export default function Skip() {
  return <Navigate to="/dashboard" replace />
}