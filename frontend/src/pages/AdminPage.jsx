import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useColors } from '../hooks/useColors'
import { useLang } from '../contexts/LangContext'
import { t } from '../i18n'

export default function AdminPage() {
  const C = useColors()
  const { lang } = useLang()
  const [tab, setTab] = useState('overview')

  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, approvedPosts: 0, pendingPosts: 0 })
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [pageContent, setPageContent] = useState([])
  const [editingContent, setEditingContent] = useState(null)

  useEffect(() => {
    fetchStats()
    fetchUsers()
    fetchPosts()
    fetchPageContent()
  }, [])

  async function fetchStats() {
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: approvedPosts },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('approved', true),
    ])
    setStats({
      totalUsers:    totalUsers    ?? 0,
      totalPosts:    totalPosts    ?? 0,
      approvedPosts: approvedPosts ?? 0,
      pendingPosts:  (totalPosts ?? 0) - (approvedPosts ?? 0),
    })
  }

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('community_posts')
      .select('id, title, approved, created_at, user_email')
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
  }

  async function fetchPageContent() {
    const { data } = await supabase
      .from('page_content')
      .select('*')
      .order('page')
    setPageContent(data ?? [])
  }

  async function togglePostApproval(postId, currentApproved) {
    await supabase.from('community_posts').update({ approved: !currentApproved }).eq('id', postId)
    fetchPosts()
    fetchStats()
  }

  async function setUserRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchUsers()
  }

  async function savePageContent(item) {
    await supabase.from('page_content').update({
      content_vi:  item.content_vi,
      content_en:  item.content_en,
      updated_at:  new Date().toISOString(),
    }).eq('id', item.id)
    setEditingContent(null)
    fetchPageContent()
  }

  const tabs = [
    { key: 'overview', label: t('admin_tab_overview', lang) },
    { key: 'users',    label: t('admin_tab_users',    lang) },
    { key: 'posts',    label: t('admin_tab_posts',    lang) },
    { key: 'content',  label: t('admin_tab_content',  lang) },
  ]

  const inputStyle = {
    width: '100%', background: C.inputBg, color: C.inputColor,
    border: `1px solid ${C.inputBorder}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 14, resize: 'vertical',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const thCellStyle = {
    textAlign: 'left', padding: '10px 12px', color: C.muted,
    fontSize: 12, fontWeight: 500, borderBottom: `1px solid ${C.divider}`,
  }
  const tdCellStyle = { padding: '12px', fontSize: 14, color: C.body }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.body, maxWidth: 1100 }}>
      <style>{`*{box-sizing:border-box}select:focus,textarea:focus{border-color:${C.accent}!important;outline:none}`}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.heading, margin: 0 }}>
          🛡️ {t('admin_title', lang)}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.subheading }}>
          {t('admin_subtitle', lang)}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: `1px solid ${tab === tb.key ? C.accentBorder : C.cardBorder}`,
              background: tab === tb.key ? C.accentBg : C.cardBg,
              color: tab === tb.key ? C.accent : C.body,
              fontSize: 14, cursor: 'pointer',
              fontWeight: tab === tb.key ? 500 : 400,
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { label: t('admin_stat_users',    lang), value: stats.totalUsers,    color: C.accent },
            { label: t('admin_stat_posts',    lang), value: stats.totalPosts,    color: C.body },
            { label: t('admin_stat_approved', lang), value: stats.approvedPosts, color: '#4ade80' },
            { label: t('admin_stat_pending',  lang), value: stats.pendingPosts,  color: '#fb923c' },
          ].map(card => (
            <div key={card.label} style={{
              background: C.cardBg, border: `1px solid ${C.cardBorder}`,
              borderRadius: 12, padding: '20px 24px',
            }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  t('admin_col_email',  lang),
                  t('admin_col_name',   lang),
                  t('admin_col_role',   lang),
                  t('admin_col_joined', lang),
                  t('admin_col_action', lang),
                ].map(h => <th key={h} style={thCellStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${C.divider}` }}>
                  <td style={tdCellStyle}>{u.email}</td>
                  <td style={tdCellStyle}>{u.full_name || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: u.role === 'admin' ? C.accentBg : C.cardBorder,
                      color: u.role === 'admin' ? C.accent : C.muted,
                      border: `1px solid ${u.role === 'admin' ? C.accentBorder : C.cardBorder}`,
                      borderRadius: 6, padding: '2px 10px', fontSize: 12,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: C.muted, fontSize: 13 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={u.role}
                      onChange={e => setUserRole(u.id, e.target.value)}
                      style={{
                        background: C.inputBg, color: C.inputColor,
                        border: `1px solid ${C.inputBorder}`,
                        borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Posts ── */}
      {tab === 'posts' && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  t('admin_col_title',  lang),
                  t('admin_col_author', lang),
                  t('admin_col_status', lang),
                  t('admin_col_date',   lang),
                  t('admin_col_action', lang),
                ].map(h => <th key={h} style={thCellStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.divider}` }}>
                  <td style={{ padding: '12px', color: C.body, fontSize: 14, maxWidth: 280 }}>{p.title}</td>
                  <td style={{ padding: '12px', color: C.muted, fontSize: 13 }}>{p.user_email ?? '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: p.approved ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
                      color: p.approved ? '#4ade80' : '#fbbf24',
                      borderRadius: 6, padding: '2px 10px', fontSize: 12,
                      border: `1px solid ${p.approved ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
                    }}>
                      {p.approved ? t('admin_approved', lang) : t('admin_pending', lang)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: C.muted, fontSize: 13 }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => togglePostApproval(p.id, p.approved)}
                      style={{
                        background: p.approved ? 'rgba(248,113,113,0.1)' : C.accentBg,
                        color: p.approved ? '#f87171' : C.accent,
                        border: `1px solid ${p.approved ? 'rgba(248,113,113,0.3)' : C.accentBorder}`,
                        borderRadius: 6, padding: '4px 12px',
                        fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {p.approved ? t('admin_unapprove', lang) : t('admin_approve', lang)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Content ── */}
      {tab === 'content' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pageContent.length === 0 && (
            <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: 40 }}>
              No page content entries found. Run the SQL migration to seed data.
            </div>
          )}
          {pageContent.map(item => (
            <div key={item.id} style={{
              background: C.cardBg, border: `1px solid ${C.cardBorder}`,
              borderRadius: 10, padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <span style={{ color: C.body, fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ color: C.muted, fontSize: 12, marginLeft: 10 }}>({item.page})</span>
                </div>
                {editingContent?.id !== item.id && (
                  <button
                    onClick={() => setEditingContent({ ...item })}
                    style={{
                      background: C.accentBg, color: C.accent,
                      border: `1px solid ${C.accentBorder}`,
                      borderRadius: 6, padding: '4px 14px', fontSize: 13, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {t('admin_edit', lang)}
                  </button>
                )}
              </div>

              {editingContent?.id === item.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 4 }}>🇻🇳 Tiếng Việt</label>
                    <textarea
                      value={editingContent.content_vi}
                      onChange={e => setEditingContent(prev => ({ ...prev, content_vi: e.target.value }))}
                      rows={3}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 4 }}>🇬🇧 English</label>
                    <textarea
                      value={editingContent.content_en}
                      onChange={e => setEditingContent(prev => ({ ...prev, content_en: e.target.value }))}
                      rows={3}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => savePageContent(editingContent)}
                      style={{
                        background: 'linear-gradient(135deg,#065f46,#10b981)', color: '#fff',
                        border: 'none', borderRadius: 8,
                        padding: '7px 20px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {t('admin_save', lang)}
                    </button>
                    <button
                      onClick={() => setEditingContent(null)}
                      style={{
                        background: C.cardBg, color: C.muted,
                        border: `1px solid ${C.cardBorder}`, borderRadius: 8,
                        padding: '7px 20px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {t('admin_cancel', lang)}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>🇻🇳 VI</div>
                    <div style={{ color: C.body, fontSize: 13 }}>{item.content_vi || '—'}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>🇬🇧 EN</div>
                    <div style={{ color: C.body, fontSize: 13 }}>{item.content_en || '—'}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
