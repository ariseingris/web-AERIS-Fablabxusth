import React from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useTheme } from '../contexts/ThemeContext'

export default function UpsellModal() {
  const { upsellType, hideUpsell, upgradeToPro } = useSubscription()
  const { theme } = useTheme()

  if (!upsellType) return null

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const messages = {
    ai: "Free users are limited to 10 AI chat messages per day. Upgrade to Pro for unlimited AI interactions!",
    device: "Free users can only connect 1 IoT device. Upgrade to Pro for unlimited device tracking and monitoring!",
    group: "Free users can only create 2 groups. Upgrade to Pro to create unlimited groups for your farm management!",
    report: "LaTeX and DOCX report exports are available exclusively on the Pro plan. Upgrade to unlock all advanced export formats!"
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(251, 191, 36, 0.3)' : '#fcd34d'}`,
        color: isDark ? '#f8fafc' : '#0f172a',
        borderRadius: 24, padding: '36px', maxWidth: 440, width: '90%',
        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px ${isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.3)'}`,
        animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 24px',
          background: isDark ? 'rgba(251, 191, 36, 0.15)' : '#fef3c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f59e0b', fontSize: 32
        }}>
          ✨
        </div>
        
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px', background: '-webkit-linear-gradient(right, #f59e0b, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Limit Reached
        </h2>
        
        <p style={{ fontSize: 15, lineHeight: 1.6, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 32 }}>
          {messages[upsellType] || "You have reached limits on your Free plan. Upgrade to Pro for unlimited features!"}
        </p>

        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <button onClick={upgradeToPro} style={{
            padding: '14px', borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.4)' }}
          >
            Upgrade to Pro (500k VNĐ/mo)
          </button>
          
          <button onClick={hideUpsell} style={{
            padding: '12px', borderRadius: 12,
            background: 'transparent',
            border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            color: isDark ? '#94a3b8' : '#64748b', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.2s, color 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#334155' : '#f1f5f9'; e.currentTarget.style.color = isDark ? '#f8fafc' : '#0f172a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b' }}
          >
            Maybe Later
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
