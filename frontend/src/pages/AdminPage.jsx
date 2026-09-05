// frontend/src/pages/AdminPage.jsx
// Full admin panel with: Overview, Users, Posts, Content Moderation, Page Content tabs
// GROUP 2: Content Moderation tab with filter, approve/reject, AI classification badge

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useColors } from '../hooks/useColors'
import { useLang } from '../contexts/LangContext'
import { t } from '../i18n'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ─── AI Classification Badge ──────────────────────────────────────────────────
function AiBadge({ classification, lang, C }) {
  const configs = {
    safe:      { label: t('admin_ai_safe', lang),      color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  icon: '✅' },
    uncertain: { label: t('admin_ai_uncertain', lang),  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  icon: '⚠️' },
    harmful:   { label: t('admin_ai_harmful', lang),    color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', icon: '🚫' },
  }
  const cfg = configs[classification] || {
    label: t('admin_ai_unknown', lang), color: C.faint, bg: C.divider, border: C.cardBorder, icon: '❓',
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontFamily: "'DM Mono', monospace",
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 100, padding: '2px 8px',
      fontWeight: 500,
    }}>
      <span style={{ fontSize: 10 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, lang, C }) {
  const configs = {
    published:      { label: 'Published',  color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  border: 'rgba(74,222,128,0.3)' },
    flagged:        { label: 'Flagged',    color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.3)' },
    hidden:         { label: 'Hidden',     color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    removed:        { label: 'Removed',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    // legacy
    approved:       { label: t('admin_approved', lang), color: '#4ade80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)' },
    rejected:       { label: t('admin_rejected', lang), color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    pending:        { label: t('admin_pending', lang),  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  }
  const cfg = configs[status] || configs.pending
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 6, padding: '2px 10px', fontSize: 12,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Flagged Content Moderation Tab ──────────────────────────────────────────
function ModerationTab({ C, lang }) {
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const session = (await supabase.auth.getSession()).data?.session
      const resp = await fetch(`${API_URL}/api/admin/flagged`, {
        headers: session?.access_token
          ? {
              'ngrok-skip-browser-warning': 'true',
              'Authorization': `Bearer ${session.access_token}`,
            }
          : { 'ngrok-skip-browser-warning': 'true' },
      })
      if (resp.ok) {
        const data = await resp.json()
        let result = data.posts ?? []
        if (filter !== 'all') result = result.filter(p => p.ai_classification === filter)
        setPosts(result)
      } else {
        // Fallback: direct Supabase query
        let query = supabase
          .from('community_posts')
          .select('id, title, body, user_email, author_id, status, ai_classification, tags, created_at, updated_at')
          .in('ai_classification', ['uncertain', 'harmful', 'pending_review'])
          .order('created_at', { ascending: false })
        if (filter !== 'all') query = query.eq('ai_classification', filter)
        const { data } = await query
        setPosts(data ?? [])
      }
    } catch {
      let query = supabase
        .from('community_posts')
        .select('id, title, body, user_email, author_id, status, ai_classification, tags, created_at, updated_at')
        .in('ai_classification', ['uncertain', 'harmful', 'pending_review'])
        .order('created_at', { ascending: false })
      if (filter !== 'all') query = query.eq('ai_classification', filter)
      const { data } = await query
      setPosts(data ?? [])
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const moderatePost = async (postId, action) => {
    setActionLoading(postId)
    try {
      const session = (await supabase.auth.getSession()).data?.session
      const resp = await fetch(`${API_URL}/api/admin/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ postId, action }),
      })
      if (resp.ok) {
        fetchPosts()
      } else {
        await supabase
          .from('community_posts')
          .update({
            status: action === 'approve' ? 'published' : 'removed',
            approved: action === 'approve',
            ai_classification: action === 'approve' ? 'admin_approved' : 'harmful',
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId)
        fetchPosts()
      }
    } catch {
      await supabase
        .from('community_posts')
        .update({
          status: action === 'approve' ? 'published' : 'removed',
          approved: action === 'approve',
          ai_classification: action === 'approve' ? 'admin_approved' : 'harmful',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
      fetchPosts()
    }
    setActionLoading(null)
  }

  const filters = [
    { key: 'all',            label: 'All Flagged',    dot: C.accent },
    { key: 'uncertain',      label: 'Uncertain',      dot: '#fbbf24' },
    { key: 'harmful',        label: 'Violation',      dot: '#f87171' },
    { key: 'pending_review', label: 'Needs Review',   dot: '#94a3b8' },
  ]

  const aiBadgeConfig = {
    uncertain:      { label: 'Uncertain',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)' },
    harmful:        { label: 'Violation',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    pending_review: { label: 'Needs Review', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header + Filter */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.heading }}>
            🚩 Flagged Content
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.subheading }}>
            Posts flagged by AI moderation that need admin review.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {filters.map(f => {
            const isActive = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8, fontSize: 12,
                  border: `1px solid ${isActive ? C.accentBorder : C.cardBorder}`,
                  background: isActive ? C.accentBg : 'transparent',
                  color: isActive ? C.accent : C.faint,
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isActive ? f.dot : 'transparent',
                  border: `1px solid ${f.dot}`,
                  display: 'inline-block',
                }} />
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: C.faint, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
          Loading...
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10, padding: 48, textAlign: 'center',
          background: C.cardBg, border: `1px dashed ${C.cardBorder}`, borderRadius: 14,
        }}>
          <span style={{ fontSize: 36 }}>✅</span>
          <span style={{ color: C.faint, fontSize: 14 }}>No flagged content — feed is clean.</span>
        </div>
      )}

      {!loading && posts.map(post => {
        const aiBadge = aiBadgeConfig[post.ai_classification]
        const isActioned = post.status === 'published' || post.status === 'removed'
        return (
          <div key={post.id} style={{
            background: C.cardBg, border: `1px solid ${C.cardBorder}`,
            borderRadius: 14, padding: '18px 22px',
            display: 'flex', flexDirection: 'column', gap: 12,
            transition: 'border-color 0.2s',
            opacity: isActioned ? 0.65 : 1,
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.cardBorderHover}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.cardBorder}
          >
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.title || '(No title)'}
                </div>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 3, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span>{post.user_email ?? 'Unknown'}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace" }}>
                    {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: C.muted }}>
                    status: {post.status}
                  </span>
                </div>
              </div>
              {aiBadge && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                  color: aiBadge.color, background: aiBadge.bg,
                  border: `1px solid ${aiBadge.border}`,
                  borderRadius: 100, padding: '2px 10px', fontWeight: 600, flexShrink: 0,
                }}>
                  {post.ai_classification === 'harmful' ? '🚫' : post.ai_classification === 'uncertain' ? '⚠️' : '🔍'} {aiBadge.label}
                </span>
              )}
            </div>

            {/* Content preview */}
            {(post.body || post.content) && (
              <div style={{
                fontSize: 13, color: C.muted, lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                background: C.accentBg, borderRadius: 8, padding: '10px 14px',
                border: `1px solid ${C.divider}`,
              }}>
                {post.body || post.content}
              </div>
            )}

            {post.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {post.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, color: C.accent,
                    background: C.accentBg, border: `1px solid ${C.accentBorder}`,
                    borderRadius: 4, padding: '1px 6px',
                    fontFamily: "'DM Mono', monospace",
                  }}>#{tag}</span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: `1px solid ${C.divider}`, paddingTop: 12 }}>
              <button
                onClick={() => moderatePost(post.id, 'approve')}
                disabled={actionLoading === post.id || post.status === 'published'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 8, fontSize: 12,
                  background: post.status === 'published' ? 'transparent' : 'rgba(74,222,128,0.1)',
                  color: post.status === 'published' ? C.faint : '#4ade80',
                  border: `1px solid ${post.status === 'published' ? C.cardBorder : 'rgba(74,222,128,0.3)'}`,
                  cursor: post.status === 'published' ? 'default' : 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  opacity: actionLoading === post.id ? 0.5 : 1,
                }}
              >
                ✅ Approve
              </button>

              <button
                onClick={() => moderatePost(post.id, 'remove')}
                disabled={actionLoading === post.id || post.status === 'removed'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 8, fontSize: 12,
                  background: post.status === 'removed' ? 'transparent' : 'rgba(248,113,113,0.08)',
                  color: post.status === 'removed' ? C.faint : '#f87171',
                  border: `1px solid ${post.status === 'removed' ? C.cardBorder : 'rgba(248,113,113,0.3)'}`,
                  cursor: post.status === 'removed' ? 'default' : 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  opacity: actionLoading === post.id ? 0.5 : 1,
                }}
              >
                🗑️ Remove
              </button>

              <div style={{ flex: 1 }} />

              <span style={{ fontSize: 10, color: C.faint, fontFamily: "'DM Mono', monospace" }}>
                {post.id?.substring(0, 8)}…
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const C = useColors()
  const { lang } = useLang()
  const [tab, setTab] = useState('overview')

  const [stats, setStats] = useState({
    totalUsers: 0, totalPosts: 0, approvedPosts: 0, pendingPosts: 0, rejectedPosts: 0
  })
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [pageContent, setPageContent] = useState([])
  const [editingContent, setEditingContent] = useState(null)
  const [roleUpdating, setRoleUpdating] = useState(null)

  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productForm, setProductForm] = useState({ name: '', name_vi: '', description: '', description_vi: '', image: null })
  const [imagePreview, setImagePreview] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [productSuccess, setProductSuccess] = useState('')
  const [productError, setProductError] = useState('')

  useEffect(() => {
    fetchStats()
    fetchUsers()
    fetchPosts()
    fetchPageContent()
    fetchProducts()
  }, [])

  async function fetchStats() {
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: publishedPosts },
      { count: flaggedPosts },
      { count: hiddenPosts },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).in('status', ['hidden', 'removed']),
    ])
    setStats({
      totalUsers:    totalUsers    ?? 0,
      totalPosts:    totalPosts    ?? 0,
      approvedPosts: publishedPosts ?? 0,
      pendingPosts:  flaggedPosts   ?? 0,
      rejectedPosts: hiddenPosts    ?? 0,
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
      .select('id, title, approved, status, created_at, user_email')
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
    const newStatus = currentApproved ? 'hidden' : 'published'
    await supabase.from('community_posts').update({
      approved: !currentApproved,
      status: newStatus,
    }).eq('id', postId)
    fetchPosts()
    fetchStats()
  }

  async function setUserRole(userId, newRole) {
    setRoleUpdating(userId)
    try {
      // Try backend API (will also update user_metadata)
      const session = (await supabase.auth.getSession()).data?.session
      const resp = await fetch(`${API_URL}/api/admin/set-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!resp.ok) {
        // Fallback: direct Supabase update
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      }
    } catch {
      // Fallback
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    }
    setRoleUpdating(null)
    fetchUsers()
  }

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data ?? [])
    setProductsLoading(false)
  }, [])

  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.name_vi || !productForm.description || !productForm.description_vi) {
      setProductError('Please fill in all fields.')
      return
    }
    setFormLoading(true)
    setProductError('')
    try {
      let image_url = null
      if (productForm.image) {
        const sanitized = productForm.image.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')   // remove diacritics
          .replace(/[^a-zA-Z0-9._-]/g, '_') // replace special chars with underscore
          .toLowerCase()
        const fileName = `${Date.now()}_${sanitized}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, productForm.image)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
        image_url = urlData.publicUrl
      }
      const { error } = await supabase.from('products').insert({
        name: productForm.name,
        name_vi: productForm.name_vi,
        description: productForm.description,
        description_vi: productForm.description_vi,
        image_url,
      })
      if (error) throw error
      setProductForm({ name: '', name_vi: '', description: '', description_vi: '', image: null })
      setImagePreview(null)
      setProductSuccess('Product added successfully!')
      setTimeout(() => setProductSuccess(''), 3000)
      fetchProducts()
    } catch (err) {
      setProductError(err.message || 'Failed to add product.')
    }
    setFormLoading(false)
  }

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return
    if (product.image_url?.includes('product-images')) {
      const fileName = product.image_url.split('/').pop()
      await supabase.storage.from('product-images').remove([fileName])
    }
    await supabase.from('products').delete().eq('id', product.id)
    fetchProducts()
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
    { key: 'overview',    label: t('admin_tab_overview', lang),    icon: '📊' },
    { key: 'moderation',  label: t('admin_tab_moderation', lang),  icon: '🛡️' },
    { key: 'users',       label: t('admin_tab_users', lang),       icon: '👥' },
    { key: 'posts',       label: t('admin_tab_posts', lang),       icon: '📝' },
    { key: 'content',     label: t('admin_tab_content', lang),     icon: '📄' },
    { key: 'products',    label: 'Products',                        icon: '📦' },
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
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 8,
              border: `1px solid ${tab === tb.key ? C.accentBorder : C.cardBorder}`,
              background: tab === tb.key ? C.accentBg : C.cardBg,
              color: tab === tb.key ? C.accent : C.body,
              fontSize: 14, cursor: 'pointer',
              fontWeight: tab === tb.key ? 500 : 400,
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 14 }}>{tb.icon}</span>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { label: t('admin_stat_users', lang),    value: stats.totalUsers,    color: C.accent,  icon: '👥' },
            { label: t('admin_stat_posts', lang),     value: stats.totalPosts,    color: C.body,    icon: '📝' },
            { label: 'Published',  value: stats.approvedPosts, color: '#4ade80', icon: '✅' },
            { label: 'Flagged',    value: stats.pendingPosts,  color: '#fbbf24', icon: '🚩' },
            { label: 'Hidden/Removed', value: stats.rejectedPosts, color: '#f87171', icon: '🚫' },
          ].map(card => (
            <div key={card.label} style={{
              background: C.cardBg, border: `1px solid ${C.cardBorder}`,
              borderRadius: 14, padding: '20px 24px',
              transition: 'border-color 0.2s, background 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.cardBorderHover; e.currentTarget.style.background = C.cardBgHover }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.background = C.cardBg }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>{card.value}</div>
                <span style={{ fontSize: 22 }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Content Moderation ── */}
      {tab === 'moderation' && (
        <ModerationTab C={C} lang={lang} />
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 14, overflow: 'hidden' }}>
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
                  <td style={tdCellStyle}>
                    <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
                      {u.email}
                    </span>
                  </td>
                  <td style={tdCellStyle}>{u.full_name || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: u.role === 'admin' ? C.accentBg
                        : u.role === 'moderator' ? 'rgba(251,191,36,0.12)'
                        : C.divider,
                      color: u.role === 'admin' ? C.accent
                        : u.role === 'moderator' ? '#fbbf24'
                        : C.muted,
                      border: `1px solid ${u.role === 'admin' ? C.accentBorder
                        : u.role === 'moderator' ? 'rgba(251,191,36,0.3)'
                        : C.cardBorder}`,
                      borderRadius: 6, padding: '2px 10px', fontSize: 12,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{
                    padding: '12px', color: C.muted, fontSize: 13,
                    fontFamily: "'DM Mono', monospace",
                  }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={u.role}
                      onChange={e => setUserRole(u.id, e.target.value)}
                      disabled={roleUpdating === u.id}
                      style={{
                        background: C.inputBg, color: C.inputColor,
                        border: `1px solid ${C.inputBorder}`,
                        borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer',
                        fontFamily: 'inherit',
                        opacity: roleUpdating === u.id ? 0.5 : 1,
                      }}
                    >
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
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
        <div style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 14, overflow: 'hidden' }}>
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
                    <StatusBadge
                      status={p.status || (p.approved ? 'approved' : 'pending')}
                      lang={lang} C={C}
                    />
                  </td>
                  <td style={{
                    padding: '12px', color: C.muted, fontSize: 13,
                    fontFamily: "'DM Mono', monospace",
                  }}>
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

      {/* ── Products ── */}
      {tab === 'products' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* Left: Add Product Form */}
          <div style={{
            background: C.cardBg, border: `1px solid ${C.cardBorder}`,
            borderRadius: 14, padding: 24,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.heading, marginBottom: 16 }}>
              📦 Add Product
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: C.muted, display: 'block', marginBottom: 4 }}>Product Name (English)</label>
                <input
                  value={productForm.name}
                  onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: C.muted, display: 'block', marginBottom: 4 }}>Product Name (Vietnamese)</label>
                <input
                  value={productForm.name_vi}
                  onChange={e => setProductForm(p => ({ ...p, name_vi: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: C.muted, display: 'block', marginBottom: 4 }}>Description (English)</label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: C.muted, display: 'block', marginBottom: 4 }}>Description (Vietnamese)</label>
                <textarea
                  rows={3}
                  value={productForm.description_vi}
                  onChange={e => setProductForm(p => ({ ...p, description_vi: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, color: C.muted, display: 'block', marginBottom: 4 }}>Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  style={{ ...inputStyle, padding: '6px 12px', cursor: 'pointer' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setProductForm(p => ({ ...p, image: file }))
                    setImagePreview(URL.createObjectURL(file))
                  }}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
                  />
                )}
              </div>

              {productError && (
                <div style={{ color: '#f87171', fontSize: 13 }}>{productError}</div>
              )}
              {productSuccess && (
                <div style={{ color: '#4ade80', fontSize: 13 }}>{productSuccess}</div>
              )}

              <button
                onClick={handleAddProduct}
                disabled={formLoading}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8,
                  background: 'linear-gradient(135deg,#065f46,#10b981)',
                  color: '#fff', border: 'none', fontSize: 14,
                  fontWeight: 600, cursor: formLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: formLoading ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {formLoading ? 'Adding...' : '📦 Add Product'}
              </button>
            </div>
          </div>

          {/* Right: Product List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.heading }}>
              Product List
              <span style={{
                marginLeft: 8, fontSize: 12, color: C.faint,
                fontFamily: "'DM Mono', monospace",
              }}>
                ({products.length})
              </span>
            </div>

            {productsLoading && (
              <div style={{ textAlign: 'center', padding: 40, color: C.faint, fontSize: 13 }}>Loading...</div>
            )}

            {!productsLoading && products.length === 0 && (
              <div style={{
                background: C.cardBg, border: `1px dashed ${C.cardBorder}`,
                borderRadius: 14, padding: 40, textAlign: 'center',
                color: C.faint, fontSize: 14,
              }}>
                No products yet.
              </div>
            )}

            {!productsLoading && products.map(product => (
              <div key={product.id} style={{
                background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 14, padding: '16px 20px',
                display: 'flex', gap: 14, alignItems: 'flex-start',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.cardBorderHover}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.cardBorder}
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.heading }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{product.name_vi}</div>
                  <div style={{
                    fontSize: 13, color: C.body, marginTop: 6,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {product.description}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  style={{
                    background: 'rgba(248,113,113,0.08)', color: '#f87171',
                    border: '1px solid rgba(248,113,113,0.3)',
                    borderRadius: 8, padding: '5px 12px', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
