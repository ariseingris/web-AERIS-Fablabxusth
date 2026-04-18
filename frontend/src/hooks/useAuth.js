import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * useAuth — returns { session, user, profile, isAdmin, loading }
 * Checks role from profiles table AND user_metadata for admin status.
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
      .select('role, full_name, email, bio, avatar_url')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
    setLoading(false)
  }

  // Admin check: profiles table role OR user_metadata.role
  const isAdmin = profile?.role === 'admin'
    || session?.user?.user_metadata?.role === 'admin'

  const refreshProfile = () => {
    const userId = session?.user?.id
    if (userId) fetchProfile(userId)
  }

  return {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin,
    loading,
    refreshProfile,
  }
}
