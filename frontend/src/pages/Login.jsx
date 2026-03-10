import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'
import { t } from '../i18n'

export default function Login() {
  const { lang } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else navigate('/dashboard')
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  const handleSocialLogin = async (provider) => {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a1a12', fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .auth-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .auth-input:focus { border-color: rgba(16,185,129,0.6) !important; box-shadow: 0 0 0 3px rgba(16,185,129,0.12) !important; outline: none; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes pulse-ring { 0%{transform:scale(0.9);opacity:0.5} 100%{transform:scale(1.5);opacity:0} }
      `}</style>

      {/* Background blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-15%', right: '-10%',
          width: 500, height: 500, borderRadius: '60% 40% 50% 70%/50% 60% 40% 60%',
          background: 'radial-gradient(circle,rgba(6,95,70,0.4) 0%,transparent 70%)',
          filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-8%',
          width: 400, height: 400, borderRadius: '40% 60% 70% 30%/60% 40% 60% 40%',
          background: 'radial-gradient(circle,rgba(16,185,129,0.25) 0%,transparent 70%)',
          filter: 'blur(70px)', animation: 'float 13s ease-in-out infinite reverse',
        }} />
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.04) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420, margin: '0 16px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '40px 36px',
        position: 'relative', zIndex: 1,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <img src="/Aeris.svg" alt="Aeris" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 500, color: '#d1fae5', letterSpacing: '0.06em' }}>
            Aeris
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0fdf4', margin: '0 0 4px' }}>
          {mode === 'login' ? t('login_title', lang) : t('login_signup_title', lang)}
        </h1>
        <p style={{ fontSize: 14, color: '#6ee7b7', margin: '0 0 28px' }}>
          {mode === 'login' ? t('login_welcome', lang) : t('login_start', lang)}
        </p>

        {/* Success state */}
        {success ? (
          <div style={{
            padding: '20px', borderRadius: 12, textAlign: 'center',
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
            <p style={{ color: '#34d399', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{t('login_check_email', lang)}</p>
            <p style={{ color: '#86efac', fontSize: 13 }}>{t('login_confirm_sent', lang)} <strong>{email}</strong></p>
          </div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
                color: '#f87171', fontSize: 13,
              }}>{error}</div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleSignUp}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#86efac', display: 'block', marginBottom: 6 }}>{t('login_email', lang)}</label>
                <input
                  className="auth-input"
                  type="email" placeholder={t('login_email_ph', lang)}
                  value={email} onChange={e => setEmail(e.target.value)} required
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f0fdf4', fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#86efac', display: 'block', marginBottom: 6 }}>{t('login_pw', lang)}</label>
                <input
                  className="auth-input"
                  type="password" placeholder={t('login_pw_ph', lang)}
                  value={password} onChange={e => setPassword(e.target.value)} required
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 9,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f0fdf4', fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: loading ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#065f46,#10b981)',
                color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', marginBottom: 12, transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.3)',
              }}>
                {loading ? t('login_loading', lang) : mode === 'login' ? t('login_btn_in', lang) : t('login_btn_up', lang)}
              </button>
            </form>

            {/* Mode toggle */}
            <p style={{ textAlign: 'center', fontSize: 14, color: '#4ade80', margin: '0 0 20px' }}>
              {mode === 'login' ? t('login_no_acct', lang) : t('login_has_acct', lang)}
              <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }} style={{
                background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontWeight: 600,
                fontSize: 14, fontFamily: 'inherit', padding: 0, textDecoration: 'underline',
              }}>
                {mode === 'login' ? t('login_go_up', lang) : t('login_go_in', lang)}
              </button>
            </p>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 12, color: '#4ade80', fontFamily: "'DM Mono',monospace", letterSpacing: '0.08em' }}>{t('login_or', lang)}</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Social */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { provider: 'google', label: 'Google', icon: <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#ea4335" d="M5.26 9.77A7.22 7.22 0 0 1 12 4.8c1.74 0 3.31.62 4.54 1.64l3.38-3.38A12 12 0 0 0 12 0C7.4 0 3.44 2.7 1.38 6.63l3.88 3.14z" /><path fill="#34a853" d="M16.04 17.9A7.19 7.19 0 0 1 12 19.2c-2.96 0-5.5-1.77-6.74-4.35l-3.88 3.12A12 12 0 0 0 12 24c3.23 0 6.16-1.2 8.38-3.17l-4.34-2.93z" /><path fill="#fbbc04" d="M19.2 12c0-.64-.07-1.28-.18-1.9H12v3.77h4.04A3.6 3.6 0 0 1 14.4 16l4.34 2.93A11.93 11.93 0 0 0 20.8 12h-1.6z" /><path fill="#4285f4" d="M1.38 6.63A11.9 11.9 0 0 0 0 12c0 1.95.47 3.78 1.38 5.37l3.88-3.12A7.15 7.15 0 0 1 4.8 12c0-.86.15-1.69.41-2.46L1.38 6.63z" /></svg> },
                { provider: 'twitter', label: 'X', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
              ].map(({ provider, label, icon }) => (
                <button key={provider} onClick={() => handleSocialLogin(provider)} disabled={loading} style={{
                  flex: 1, padding: '11px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', color: '#d1fae5', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}