import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useLang } from '../contexts/LangContext'
import { useTheme } from '../contexts/ThemeContext'
import { useColors } from '../hooks/useColors'
import { useAuth } from '../hooks/useAuth'
import { t } from '../i18n'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function Tab({ label, active, onClick, C }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
      background: active ? C.accentBg : 'transparent',
      color: active ? C.accent : C.muted,
      fontWeight: active ? 600 : 400, fontSize: 14, cursor: 'pointer',
      fontFamily: 'inherit', transition: 'all 0.2s',
      borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent',
    }}>{label}</button>
  )
}

function Section({ title, children, C }) {
  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: C.body, margin: '0 0 16px' }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, hint, children, C }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: C.muted, display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: C.faint, margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}

function Toggle({ value, onChange, label, C }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <span style={{ fontSize: 14, color: C.body }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
        background: value ? 'linear-gradient(90deg,#065f46,#10b981)' : C.cardBorder,
        border: `1px solid ${value ? C.accentBorder : C.cardBorder}`,
        transition: 'all 0.25s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 22 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: value ? '#fff' : C.muted,
          transition: 'left 0.25s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  )
}

// ─── Avatar Upload with crop preview ──────────────────────────────────────────
function AvatarUpload({ currentUrl, onUpload, C, lang, user }) {
  const fileRef = useRef()
  const canvasRef = useRef()
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [rawFile, setRawFile] = useState(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRawFile(file)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        // Crop to square (center crop)
        const canvas = canvasRef.current
        const size = 256
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')

        const srcSize = Math.min(img.width, img.height)
        const sx = (img.width - srcSize) / 2
        const sy = (img.height - srcSize) / 2

        ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size)
        setPreview(canvas.toDataURL('image/webp', 0.85))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!preview || !user?.id) return
    setUploading(true)
    try {
      const res = await fetch(preview)
      const blob = await res.blob()

      const filePath = `${user.id}/avatar.webp`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/webp' })

      if (uploadError) { toast.error(uploadError.message); return }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      onUpload(publicUrl)
      setPreview(null)
      setRawFile(null)
      toast.success('Avatar updated!')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const displayUrl = preview || currentUrl || ''

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Avatar preview */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          width: 88, height: 88, borderRadius: 18, overflow: 'hidden',
          border: `2px dashed ${preview ? C.accent : C.cardBorder}`,
          background: C.inputBg, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.2s',
          position: 'relative',
        }}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Avatar" style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} />
        ) : (
          <span style={{ fontSize: 28, color: C.faint }}>📷</span>
        )}
        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.2s',
          borderRadius: 16,
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0'}
        >
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 500 }}>
            {t('set_change_avatar', lang)}
          </span>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: C.faint }}>
          {t('set_avatar_hint', lang)}
        </span>
        {preview && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12,
                background: 'linear-gradient(135deg,#065f46,#10b981)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading ? '...' : t('set_upload', lang)}
            </button>
            <button
              onClick={() => { setPreview(null); setRawFile(null) }}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12,
                background: C.cardBg, color: C.muted,
                border: `1px solid ${C.cardBorder}`, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('admin_cancel', lang)}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main SettingsPage ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { lang, switchLang } = useLang()
  const { theme, setTheme } = useTheme()
  const C = useColors()
  const { user, profile, refreshProfile } = useAuth()

  const [tab, setTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    timezone: 'Asia/Ho_Chi_Minh',
    avatarUrl: '',
  })
  const [notifs, setNotifs] = useState({ email: true, push: false, updates: true, security: true })
  const [appearance, setAppearance] = useState({ compact: false, animations: true })

  // Load profile data
  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        displayName: profile.full_name || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatar_url || '',
      }))
    }
  }, [profile])

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: C.inputBg, border: `1px solid ${C.inputBorder}`,
    color: C.inputColor, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.2s',
  }

  const save = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.displayName,
          bio: form.bio,
          avatar_url: form.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        toast.error(error.message)
        return
      }

      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePwChange = async () => {
    const email = user?.email || ''
    if (!email) { toast.error('No email found'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) toast.error(error.message)
    else toast.success(t('login_check_email', lang))
  }

  // Live preview name
  const previewName = form.displayName || user?.email?.split('@')[0] || 'User'

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.body, maxWidth: 640 }}>
      <style>{`*{box-sizing:border-box}input:focus,select:focus,textarea:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px ${C.accentBg}}`}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.heading, margin: 0 }}>{t('set_title', lang)}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.subheading }}>{t('set_subtitle', lang)}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.cardBorder}`, marginBottom: 24 }}>
        {[['profile', t('set_tab_profile', lang)], ['notifications', t('set_tab_notif', lang)], ['appearance', t('set_tab_appear', lang)], ['security', t('set_tab_sec', lang)]].map(([id, label]) => (
          <Tab key={id} label={label} active={tab === id} onClick={() => setTab(id)} C={C} />
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <Section title={t('set_profile_sec', lang)} C={C}>
          {/* Avatar */}
          <AvatarUpload
            currentUrl={form.avatarUrl}
            onUpload={(url) => setForm(f => ({ ...f, avatarUrl: url }))}
            C={C}
            lang={lang}
            user={user}
          />

          {/* Live preview card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: 16, background: C.accentBg, borderRadius: 12,
            border: `1px solid ${C.accentBorder}`, marginBottom: 20,
          }}>
            <img
              src={form.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(previewName)}&background=059669&color=ffffff&bold=true`}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.heading }}>{previewName}</div>
              <div style={{ fontSize: 12, color: C.faint, fontFamily: "'DM Mono', monospace" }}>
                {user?.email || ''}
              </div>
              {form.bio && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {form.bio.length > 80 ? form.bio.slice(0, 80) + '…' : form.bio}
                </div>
              )}
            </div>
            <span style={{
              marginLeft: 'auto', fontSize: 10, color: C.accent,
              fontFamily: "'DM Mono', monospace", opacity: 0.6,
            }}>
              {t('set_live_preview', lang)}
            </span>
          </div>

          <Field label={t('set_display_name', lang)} C={C}>
            <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="..." style={inputStyle} />
          </Field>
          <Field label={t('set_bio', lang)} hint={t('set_bio_hint', lang)} C={C}>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} maxLength={160} />
          </Field>
          <Field label={t('set_language', lang)} C={C}>
            <select value={lang} onChange={e => switchLang(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </Field>
          <Field label={t('set_timezone', lang)} C={C}>
            <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh (UTC+7)</option>
              <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
              <option value="UTC">UTC (UTC+0)</option>
            </select>
          </Field>
        </Section>
      )}

      {/* Notifications tab */}
      {tab === 'notifications' && (
        <Section title={t('set_tab_notif', lang)} C={C}>
          <Toggle value={notifs.email} onChange={v => setNotifs(n => ({ ...n, email: v }))} label={t('set_notif_email', lang)} C={C} />
          <Toggle value={notifs.push} onChange={v => setNotifs(n => ({ ...n, push: v }))} label={t('set_notif_push', lang)} C={C} />
          <Toggle value={notifs.updates} onChange={v => setNotifs(n => ({ ...n, updates: v }))} label={t('set_notif_upd', lang)} C={C} />
          <Toggle value={notifs.security} onChange={v => setNotifs(n => ({ ...n, security: v }))} label={t('set_notif_sec', lang)} C={C} />
        </Section>
      )}

      {/* Appearance tab */}
      {tab === 'appearance' && (
        <Section title={t('set_tab_appear', lang)} C={C}>
          <Field label={t('set_theme', lang)} C={C}>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['dark', t('set_theme_dark', lang)], ['light', t('set_theme_light', lang)], ['system', t('set_theme_sys', lang)]].map(([tOpt, label]) => (
                <button key={tOpt} onClick={() => setTheme(tOpt)} style={{
                  flex: 1, padding: 10, borderRadius: 8,
                  border: `1px solid ${theme === tOpt ? C.accentBorder : C.cardBorder}`,
                  background: theme === tOpt ? C.accentBg : C.cardBg,
                  color: theme === tOpt ? C.accent : C.muted,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, transition: 'all 0.2s',
                }}>{label}</button>
              ))}
            </div>
          </Field>
          <Toggle value={appearance.compact} onChange={v => setAppearance(a => ({ ...a, compact: v }))} label={t('set_compact', lang)} C={C} />
          <Toggle value={appearance.animations} onChange={v => setAppearance(a => ({ ...a, animations: v }))} label={t('set_animations', lang)} C={C} />
        </Section>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <>
          <Section title={t('set_sec_pw', lang)} C={C}>
            <p style={{ fontSize: 14, color: C.muted, margin: '0 0 16px' }}>{t('set_sec_pw_desc', lang)}</p>
            <button onClick={handlePwChange} style={{
              padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.cardBorder}`,
              background: C.cardBg, color: C.body, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
            }}>{t('set_sec_pw_btn', lang)}</button>
          </Section>
          <Section title={t('set_sec_logout', lang)} C={C}>
            <p style={{ fontSize: 14, color: C.muted, margin: '0 0 16px' }}>{t('set_sec_logout_desc', lang)}</p>
            <button onClick={() => supabase.auth.signOut({ scope: 'global' })} style={{
              padding: '10px 20px', borderRadius: 8,
              border: '1px solid rgba(220,38,38,0.3)',
              background: 'rgba(220,38,38,0.08)', color: '#dc2626',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
            }}>{t('set_sec_logout_btn', lang)}</button>
          </Section>
        </>
      )}

      {/* Save button */}
      {tab !== 'security' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          {saved && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8,
              background: C.accentBg, border: `1px solid ${C.accentBorder}`, color: C.accent, fontSize: 14,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              {t('set_saved', lang)}
            </div>
          )}
          <button onClick={save} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#065f46,#10b981)',
            color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
            opacity: saving ? 0.6 : 1,
          }}>{saving ? '...' : t('set_save', lang)}</button>
        </div>
      )}
    </div>
  )
}