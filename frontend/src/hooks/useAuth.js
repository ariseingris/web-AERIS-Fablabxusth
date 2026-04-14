import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * useAuth — returns { session, user, profile, isAdmin, loading }
 * Fetches the user's profile row (with role) from the `profiles` table.
 */
export function useAuth() {
  const [session, setSession]   = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
    setLoading(false)
  }

  return {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
  }
}
