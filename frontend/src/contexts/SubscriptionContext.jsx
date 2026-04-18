import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'

const SubscriptionContext = createContext()

export function SubscriptionProvider({ children }) {
  const { session } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState({ devicesCount: 0, groupsCount: 0, aiCount: 0 })
  const [upsellType, setUpsellType] = useState(null) // null | 'ai' | 'device' | 'group' | 'report'

  const fetchStatus = async () => {
    if (!session) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscription/status`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.plan)
        setUsage(data.usage)
      }
    } catch (e) {
      console.warn('Could not fetch subscription logic', e)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [session])

  const showUpsell = (limitType) => {
    setUpsellType(limitType)
  }

  const hideUpsell = () => {
    setUpsellType(null)
  }

  const upgradeToPro = async () => {
    if (!session) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/subscription/upgrade`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        await fetchStatus() // refresh
        hideUpsell()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      usage,
      fetchStatus,
      showUpsell,
      hideUpsell,
      upgradeToPro,
      upsellType,
      isPro: subscription === 'pro'
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext)
}
