import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLang } from '../contexts/LangContext'
import { useTheme } from '../contexts/ThemeContext'
import { useColors } from '../hooks/useColors'
import { t } from '../i18n'

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

export default function SettingsPage() {
  const { lang, switchLang } = useLang()
  const { theme, setTheme } = useTheme()
  const C = useColors()
  const [tab, setTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ displayName: '', bio: '', timezone: 'Asia/Ho_Chi_Minh' })
  const [notifs, setNotifs] = useState({ email: true, push: false, updates: true, security: true })
  const [appearance, setAppearance] = useState({ compact: false, animations: true })

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: C.inputBg, border: `1px solid ${C.inputBorder}`,
    color: C.inputColor, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.2s',
  }

  const save = async () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const handlePwChange = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail('')
    alert(error ? error.message : t('login_check_email', lang))
  }

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
          <Field label={t('set_display_name', lang)} C={C}>
            <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="..." style={inputStyle} />
          </Field>
          <Field label={t('set_bio', lang)} hint={t('set_bio_hint', lang)} C={C}>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
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
          <button onClick={save} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#065f46,#10b981)',
            color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
          }}>{t('set_save', lang)}</button>
        </div>
      )}
    </div>
  )
}