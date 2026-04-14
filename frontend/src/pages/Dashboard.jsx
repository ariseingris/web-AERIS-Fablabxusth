import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useLang } from '../contexts/LangContext'
import { t } from '../i18n'
import { useColors } from '../hooks/useColors'

function Sparkline({ data, color = '#10b981' }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const w = 80, h = 32
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatCard({ icon, label, value, sub, trend, sparkData, color = '#10b981', delay = 0, C }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  const up = trend >= 0
  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.cardBorder}`,
      borderRadius: 16, padding: 24,
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease, border-color 0.2s, background 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.cardBorderHover; e.currentTarget.style.background = C.cardBgHover }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.background = C.cardBg }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: C.accentBg, border: `1px solid ${C.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>{icon}</div>
        {sparkData && <Sparkline data={sparkData} color={color} />}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 600, color: C.heading, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: C.subheading, marginTop: 4 }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 11, fontFamily: "'DM Mono', monospace",
          color: up ? C.tagUp : C.tagDown,
          background: up ? C.tagUpBg : C.tagDownBg,
          border: `1px solid ${up ? C.tagUpBorder : C.tagDownBorder}`,
          borderRadius: 100, padding: '2px 8px',
        }}>
          {up ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
        <span style={{ fontSize: 12, color: C.faint }}>{sub}</span>
      </div>
    </div>
  )
}

function ActivityItem({ icon, title, time, color, C }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.divider}` }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: C.accentBg, border: `1px solid ${C.accentBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, color: C.body, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
      </div>
      <span style={{ fontSize: 11, color: C.faint, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{time}</span>
    </div>
  )
}

export default function Dashboard() {
  const { lang } = useLang()
  const C = useColors()
  const [session, setSession] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const userName = session?.user?.email?.split('@')[0] || (lang === 'vi' ? 'Người dùng' : 'User')

  const stats = [
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
      label: t('dash_users', lang), value: '15/20', sub: t('dash_vs_prev', lang), trend: 12.5,
      sparkData: [30, 45, 38, 52, 48, 60, 55, 70, 65, 80, 75, 90],
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
      label: t('dash_revenue', lang), value: '8/10 device/s', sub: t('dash_vs_prev', lang), trend: 8.3,
      sparkData: [20, 28, 25, 35, 30, 40, 38, 50, 45, 55, 52, 62],
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
      label: t('dash_tasks', lang), value: '1,204', sub: t('dash_this_week', lang), trend: 5.1,
      sparkData: [60, 72, 68, 80, 75, 85, 82, 90, 88, 95, 92, 98],
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
      label: t('dash_latency', lang), value: '12ms', sub: t('dash_avg_today', lang), trend: -3.2,
      sparkData: [18, 15, 20, 14, 16, 13, 15, 12, 14, 13, 12, 11],
      color: '#34d399',
    },
  ]

  const activities = [
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>, title: t('act_new_user', lang), time: lang === 'vi' ? '2 phút trước' : '2 mins ago', color: '#34d399' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>, title: t('act_task_done', lang), time: lang === 'vi' ? '15 phút trước' : '15 mins ago', color: '#10b981' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>, title: t('act_ai_reply', lang), time: lang === 'vi' ? '32 phút trước' : '32 mins ago', color: '#059669' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, title: t('act_update', lang), time: lang === 'vi' ? '1 giờ trước' : '1 hour ago', color: '#047857' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>, title: t('act_report', lang), time: lang === 'vi' ? '3 giờ trước' : '3 hours ago', color: '#065f46' },
    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>, title: t('act_settings', lang), time: lang === 'vi' ? '5 giờ trước' : '5 hours ago', color: '#10b981' },
  ]

  const quickActions = [
    { label: t('dash_qa_task', lang), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> },
    { label: t('dash_qa_ai', lang), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /></svg> },
    { label: t('dash_qa_export', lang), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> },
    { label: t('dash_qa_invite', lang), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> },
  ]

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.body, minHeight: '100vh' }}>
      <style>{`*{box-sizing:border-box}`}</style>

      {/* Welcome banner */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.heading, margin: 0, lineHeight: 1.2 }}>
              {t('dash_welcome', lang)}, <span style={{ color: C.accent }}>{userName}</span> 👋
            </h1>
            <p style={{ margin: '6px 0 0', color: C.subheading, fontSize: 14 }}>
              {t('dash_subtitle', lang)} · {new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {quickActions.map(({ label, icon }) => (
              <button key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: C.accentBgStrong, border: `1px solid ${C.accentBorderStrong}`,
                color: C.subheading, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.accentBg; e.currentTarget.style.color = C.accent }}
                onMouseLeave={e => { e.currentTarget.style.background = C.accentBgStrong; e.currentTarget.style.color = C.subheading }}
              >{icon}{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 80} C={C} />)}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        {/* Activity feed */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: C.body, margin: 0 }}>{t('dash_activity', lang)}</h2>
            <button style={{ fontSize: 12, color: C.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>{t('dash_view_all', lang)}</button>
          </div>
          {activities.map((a, i) => <ActivityItem key={i} {...a} C={C} />)}
        </div>

        {/* System health */}
        <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.body, margin: '0 0 20px' }}>{t('dash_health', lang)}</h2>
          {[
            { label: 'API Server', pct: 98, color: '#34d399' },
            { label: 'Database', pct: 94, color: '#10b981' },
            { label: 'AI Engine', pct: 87, color: '#059669' },
            { label: 'Storage', pct: 72, color: '#047857' },
          ].map(({ label, pct, color }) => (
            <div key={label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color }}>{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: C.divider, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 3, transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: C.accentBg, border: `1px solid ${C.accentBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, boxShadow: `0 0 6px ${C.accent}` }} />
              <span style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>{t('dash_all_clear', lang)}</span>
            </div>
            <p style={{ fontSize: 12, color: C.subheading, margin: '4px 0 0 16px' }}>{t('dash_uptime_val', lang)}</p>
          </div>
        </div>

      </div>

      <div style={{ marginTop: 32, paddingBottom: 24, textAlign: 'center', fontSize: 13, color: C.muted }}>
        Powered by AERIS Core Engine © 2026.
      </div>
    </div>
  )
}