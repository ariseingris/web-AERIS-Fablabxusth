import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'

export default function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAdmin, loading, navigate])

  if (loading) return null
  if (!isAdmin) return null
  return children
}
