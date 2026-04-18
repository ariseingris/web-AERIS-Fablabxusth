import React from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useTheme } from '../contexts/ThemeContext'
import { t } from '../i18n'
import { useLang } from '../contexts/LangContext'

// Icons
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
)

const CrossIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

export default function PricingCard() {
  const { isPro, upgradeToPro } = useSubscription()
  const { theme } = useTheme()
  const { lang } = useLang()

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const bg = isDark ? '#1e293b' : '#ffffff'
  const border = isDark ? 'rgba(100,116,139,0.3)' : '#e2e8f0'
  const textPrimary = isDark ? '#f8fafc' : '#0f172a'
  const textSecondary = isDark ? '#cbd5e1' : '#475569'

  const features = [
    { label: "AI Chat Messages", free: "10 / day", pro: "Unlimited", proOnly: true },
    { label: "Reports Export", free: "Excel Only", pro: "Excel, DOCX, LaTeX", proOnly: true },
    { label: "IoT Devices Config", free: "1 device", pro: "Unlimited", proOnly: true },
    { label: "Community Groups", free: "2 groups", pro: "Unlimited", proOnly: true },
    { label: "Ad-Free Experience", free: <CrossIcon/>, pro: <CheckIcon/>, proOnly: true },
  ]

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 20, 
      padding: '32px', maxWidth: 800, margin: '20px auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: textPrimary, margin: '0 0 8px' }}>Subscription Plans</h2>
        <p style={{ color: textSecondary, margin: 0 }}>Step up your farm management with AERIS Pro.</p>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* FREE TIER */}
        <div style={{
          flex: '1 1 300px',
          border: `1px solid ${border}`,
          borderRadius: 16, padding: '24px',
          background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          opacity: 0.8
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: textPrimary }}>Free Tier</h3>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, color: textPrimary }}>0 VNĐ<span style={{ fontSize: 13, fontWeight: 500, color: textSecondary }}>/mo</span></div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: textSecondary }}>
                <span>{f.label}</span>
                <span style={{ fontWeight: 600 }}>{f.free}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* PRO TIER */}
        <div style={{
          flex: '1 1 300px',
          border: `2px solid #f59e0b`,
          borderRadius: 16, padding: '24px',
          background: isDark ? '#1e293b' : '#ffffff',
          boxShadow: '0 20px 40px rgba(245, 158, 11, 0.15)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', fontSize: 12, fontWeight: 800, padding: '4px 12px',
            borderRadius: 20, letterSpacing: '0.05em'
          }}>RECOMMENDED</div>
          
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px', color: '#f59e0b' }}>Pro Tier</h3>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, color: textPrimary }}>500K VNĐ<span style={{ fontSize: 13, fontWeight: 500, color: textSecondary }}>/mo</span></div>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {features.map((f, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: f.proOnly ? '#f59e0b' : textPrimary, fontWeight: f.proOnly ? 600 : 400 }}>
                <span>{f.label}</span>
                <span style={{ display: 'flex', alignItems: 'center' }}>{f.pro}</span>
              </li>
            ))}
          </ul>

          <button onClick={upgradeToPro} disabled={isPro} style={{
            width: '100%', padding: '14px', borderRadius: 10,
            background: isPro ? (isDark ? '#334155' : '#e2e8f0') : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: isPro ? textSecondary : '#fff', fontSize: 15, fontWeight: 700,
            border: 'none', cursor: isPro ? 'not-allowed' : 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: isPro ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.3)'
          }}
          onMouseEnter={e => { if(!isPro) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)' } }}
          onMouseLeave={e => { if(!isPro) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.3)' } }}
          >
            {isPro ? "Currently Active" : "Upgrade to Pro"}
          </button>
        </div>

      </div>
    </div>
  )
}
