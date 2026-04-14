import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useColors } from '../hooks/useColors'
import { useLang } from '../contexts/LangContext'
import { useAuth } from '../hooks/useAuth'
import { t } from '../i18n'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts, lang = 'vi') {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60)      return t('comm_just_now', lang)
  if (diff < 3600)    return `${Math.floor(diff / 60)} ${t('comm_mins_ago', lang)}`
  if (diff < 86400)   return `${Math.floor(diff / 3600)} ${t('comm_hours_ago', lang)}`
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ${t('comm_days_ago', lang)}`
  return new Date(ts).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')
}

function initials(email = '') {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  '#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ec4899',
  '#14b8a6','#f97316','#6366f1','#84cc16','#ef4444',
]
function avatarColor(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IcoSearch  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IcoPlus    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoLike    = ({ filled }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
const IcoComment = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const IcoBack    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
const IcoSend    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IcoClose   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoTag     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
const IcoSpinner = () => (
  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
)

function SkeletonCard() {
  return (
    <div className="cm-card" style={{ cursor: 'default', pointerEvents: 'none' }}>
      {[180, 120, 80].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 16 : 12,
          width: `${w}px`,
          maxWidth: '100%',
          borderRadius: 4,
          background: 'var(--cm-input-bg)',
          marginBottom: 10,
          animation: 'shimmer 1.4s ease infinite',
          opacity: 0.6,
        }} />
      ))}
    </div>
  )
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
// Colors are driven by --cm-* CSS variables injected by CommunityPage from useColors()
const CSS = `
.cm-wrap { font-family: 'Inter', system-ui, sans-serif; }

/* ── topbar ── */
.cm-topbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; gap: 12px; flex-wrap: wrap;
}
.cm-topbar-title {
  font-size: 20px; font-weight: 700; color: var(--cm-text);
  display: flex; align-items: center; gap: 10px;
}
.cm-topbar-right { display: flex; align-items: center; gap: 10px; }

.cm-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--cm-input-bg); border: 1px solid var(--cm-input-border);
  border-radius: 9px; padding: 0 13px; height: 38px; width: 230px;
  transition: border-color 0.2s;
}
.cm-search:focus-within { border-color: var(--cm-accent-border); }
.cm-search input {
  background: none; border: none; outline: none;
  color: var(--cm-text); font-family: 'Inter', sans-serif; font-size: 13px; flex: 1;
}
.cm-search input::placeholder { color: var(--cm-placeholder); }
.cm-search svg { color: var(--cm-placeholder); flex-shrink: 0; }

.cm-create-btn {
  display: flex; align-items: center; gap: 7px;
  background: #10b981; color: #052e16; border: none; border-radius: 9px;
  padding: 0 16px; height: 38px; font-family: 'Inter', sans-serif;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s; white-space: nowrap;
}
.cm-create-btn:hover { background: #34d399; box-shadow: 0 0 18px rgba(16,185,129,0.35); }

/* ── post card ── */
.cm-card {
  background: var(--cm-card-bg); border: 1px solid var(--cm-card-border);
  border-radius: 14px; padding: 20px 22px; margin-bottom: 14px; cursor: pointer;
  transition: background 0.18s, border-color 0.18s, transform 0.18s;
  position: relative; overflow: hidden;
}
.cm-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px; background: transparent; transition: background 0.18s; border-radius: 3px 0 0 3px;
}
.cm-card:hover { background: var(--cm-card-hover-bg); border-color: var(--cm-card-hover-border); transform: translateY(-1px); }
.cm-card:hover::before { background: #10b981; }

.cm-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.cm-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700;
  color: #fff; flex-shrink: 0; letter-spacing: 0.5px;
}
.cm-author { font-size: 13.5px; font-weight: 600; color: var(--cm-text); }
.cm-time   { font-size: 11.5px; color: var(--cm-placeholder); margin-top: 1px; }

.cm-title { font-size: 15px; font-weight: 600; color: var(--cm-text); margin-bottom: 8px; line-height: 1.45; }
.cm-body  { font-size: 13px; color: var(--cm-muted); line-height: 1.7; margin-bottom: 14px; }

.cm-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.cm-tag {
  font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px;
  background: rgba(16,185,129,0.1); color: #10b981;
  border: 1px solid rgba(16,185,129,0.2); font-family: 'JetBrains Mono', monospace;
  display: flex; align-items: center; gap: 4px;
}

.cm-footer { display: flex; align-items: center; gap: 12px; }
.cm-stat {
  display: flex; align-items: center; gap: 5px;
  font-size: 12.5px; color: var(--cm-faint); cursor: pointer;
  padding: 4px 8px; border-radius: 7px; transition: all 0.15s; user-select: none;
}
.cm-stat:hover { background: var(--cm-hover-bg); color: var(--cm-muted); }
.cm-stat.liked  { color: #10b981; }

/* ── thread detail ── */
.cm-thread-q {
  background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2);
  border-radius: 14px; padding: 22px 24px; margin-bottom: 20px;
}
.cm-thread-title { font-size: 18px; font-weight: 700; color: var(--cm-text); margin-bottom: 10px; line-height: 1.45; }
.cm-thread-body  { font-size: 13.5px; color: var(--cm-muted); line-height: 1.75; margin-bottom: 16px; }

/* ── chat ── */
.cm-chat {
  display: flex; flex-direction: column;
  background: var(--cm-card-bg); border: 1px solid var(--cm-card-border);
  border-radius: 14px; overflow: hidden; min-height: 0;
  flex: 1;
}
.cm-chat-hdr {
  padding: 13px 18px; border-bottom: 1px solid var(--cm-card-border);
  font-size: 12.5px; font-weight: 600; color: var(--cm-faint);
  display: flex; align-items: center; gap: 7px; flex-shrink: 0;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.cm-msgs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.cm-msgs::-webkit-scrollbar { width: 4px; }
.cm-msgs::-webkit-scrollbar-thumb { background: var(--cm-input-border); border-radius: 2px; }

.cm-msg { display: flex; gap: 10px; align-items: flex-start; animation: msgIn 0.2s ease; }
.cm-msg.own { flex-direction: row-reverse; }
.cm-msg-av { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 2px; }
.cm-msg-wrap { max-width: 72%; }
.cm-msg-wrap.own { align-items: flex-end; }
.cm-msg-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.cm-msg-meta.own { flex-direction: row-reverse; }
.cm-msg-name { font-size: 11.5px; font-weight: 600; color: var(--cm-faint); }
.cm-msg-time { font-size: 10.5px; color: var(--cm-placeholder); }
.cm-bubble {
  background: var(--cm-input-bg); border: 1px solid var(--cm-input-border);
  border-radius: 12px 12px 12px 4px; padding: 10px 14px;
  font-size: 13.5px; color: var(--cm-text); line-height: 1.55;
}
.cm-bubble.own {
  background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.25);
  border-radius: 12px 12px 4px 12px;
}

.cm-input-row {
  padding: 13px 14px; border-top: 1px solid var(--cm-card-border);
  display: flex; gap: 10px; align-items: flex-end; flex-shrink: 0;
}
.cm-textarea {
  flex: 1; background: var(--cm-input-bg); border: 1px solid var(--cm-input-border);
  border-radius: 10px; padding: 10px 14px; color: var(--cm-text);
  font-family: 'Inter', sans-serif; font-size: 13.5px; outline: none;
  resize: none; min-height: 40px; max-height: 110px; transition: border-color 0.15s;
  line-height: 1.5;
}
.cm-textarea:focus { border-color: var(--cm-accent-border); }
.cm-textarea::placeholder { color: var(--cm-placeholder); }
.cm-send-btn {
  width: 38px; height: 38px; border-radius: 10px; background: #10b981;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #052e16; flex-shrink: 0; transition: all 0.15s;
}
.cm-send-btn:hover:not(:disabled) { background: #34d399; box-shadow: 0 0 14px rgba(16,185,129,0.4); }
.cm-send-btn:disabled { background: var(--cm-hover-bg); color: var(--cm-placeholder); cursor: not-allowed; }

/* ── modal ── */
.cm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; z-index: 200;
  animation: fadeIn 0.15s ease;
}
.cm-modal {
  background: var(--cm-modal-bg); border: 1px solid var(--cm-card-border);
  border-radius: 16px; width: 540px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4); animation: slideUp 0.2s ease;
}
.cm-modal-hdr {
  padding: 18px 22px 16px; border-bottom: 1px solid var(--cm-card-border);
  display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0;
  background: var(--cm-modal-bg); z-index: 1;
}
.cm-modal-title { font-size: 16px; font-weight: 700; color: var(--cm-text); }
.cm-modal-close { background: none; border: none; color: var(--cm-faint); cursor: pointer; padding: 4px; border-radius: 6px; transition: color 0.15s; display: flex; }
.cm-modal-close:hover { color: var(--cm-text); }
.cm-modal-body { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
.cm-field-lbl { font-size: 11.5px; font-weight: 600; color: var(--cm-faint); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
.cm-field-inp {
  width: 100%; background: var(--cm-input-bg); border: 1px solid var(--cm-input-border);
  border-radius: 9px; padding: 10px 14px; color: var(--cm-text);
  font-family: 'Inter', sans-serif; font-size: 13.5px; outline: none; transition: border-color 0.15s;
  box-sizing: border-box;
}
.cm-field-inp:focus { border-color: var(--cm-accent-border); }
.cm-field-inp::placeholder { color: var(--cm-placeholder); }
.cm-field-ta { min-height: 110px; resize: vertical; }
.cm-modal-ftr {
  padding: 14px 22px; border-top: 1px solid var(--cm-card-border);
  display: flex; justify-content: flex-end; gap: 10px;
}
.cm-btn-ghost {
  padding: 0 16px; height: 36px; border-radius: 8px;
  background: var(--cm-input-bg); border: 1px solid var(--cm-input-border);
  color: var(--cm-muted); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.cm-btn-ghost:hover { border-color: var(--cm-card-hover-border); color: var(--cm-text); }

.cm-empty { text-align: center; padding: 48px 0; color: var(--cm-faint); font-size: 13.5px; }
.cm-badge {
  min-width: 18px; height: 18px; border-radius: 9px;
  background: #10b981; color: #052e16; font-size: 10px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center; padding: 0 5px;
  font-family: 'JetBrains Mono', monospace;
}
.cm-err { color: #f87171; font-size: 12.5px; padding: 6px 0; }

@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
@keyframes msgIn   { from { transform: translateY(5px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`

// ─── Main component ───────────────────────────────────────────────────────────
export default function CommunityPage() {
  const C = useColors()
  const { lang } = useLang()
  const { isAdmin } = useAuth()

  // CSS variables derived from the current theme
  const cssVars = `
    .cm-wrap {
      --cm-text:             ${C.heading};
      --cm-muted:            ${C.muted};
      --cm-faint:            ${C.faint};
      --cm-placeholder:      ${C.veryFaint};
      --cm-card-bg:          ${C.cardBg};
      --cm-card-border:      ${C.cardBorder};
      --cm-card-hover-bg:    ${C.cardBgHover};
      --cm-card-hover-border:${C.cardBorderHover};
      --cm-input-bg:         ${C.inputBg};
      --cm-input-border:     ${C.inputBorder};
      --cm-modal-bg:         ${C.cardBg};
      --cm-hover-bg:         ${C.cardBgHover};
      --cm-accent-border:    ${C.accentBorder};
    }
  `

  const [session, setSession]         = useState(null)
  const [posts, setPosts]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [selectedPost, setSelectedPost] = useState(null)
  const [myLikes, setMyLikes]         = useState(new Set())
  const [showModal, setShowModal]     = useState(false)

  // Fetch current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  // Fetch posts — admins see all, regular users see only approved
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('community_posts')
      .select('*, community_comments(count)')
      .order('created_at', { ascending: false })
    if (!isAdmin) {
      query = query.eq('approved', true)
    }
    const { data, error } = await query
    if (!error) setPosts(data || [])
    setLoading(false)
  }, [isAdmin])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // Fetch my likes
  useEffect(() => {
    if (!session) return
    supabase
      .from('community_likes')
      .select('post_id')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        if (data) setMyLikes(new Set(data.map(r => r.post_id)))
      })
  }, [session])

  // Realtime: new posts
  useEffect(() => {
    const channel = supabase
      .channel('community_posts_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' },
        () => fetchPosts())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' },
        () => fetchPosts())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchPosts])

  const handleLike = async (e, post) => {
    e.stopPropagation()
    if (!session) return
    const userId = session.user.id
    const postId = post.id
    const liked  = myLikes.has(postId)

    // Optimistic update
    setMyLikes(prev => { const s = new Set(prev); liked ? s.delete(postId) : s.add(postId); return s })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p))

    if (liked) {
      await supabase.from('community_likes').delete().match({ user_id: userId, post_id: postId })
      await supabase.rpc('decrement_post_likes', { post_id: postId })
    } else {
      await supabase.from('community_likes').insert({ user_id: userId, post_id: postId })
      await supabase.rpc('increment_post_likes', { post_id: postId })
    }
  }

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.body.toLowerCase().includes(search.toLowerCase()) ||
    (p.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  // If thread open, show thread view
  if (selectedPost) {
    return (
      <>
        <style>{cssVars}{CSS}</style>
        <div className="cm-wrap" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
          {/* topbar */}
          <div className="cm-topbar">
            <div className="cm-topbar-title">
              <button
                onClick={() => setSelectedPost(null)}
                style={{ background: 'var(--cm-hover-bg)', border: '1px solid var(--cm-input-border)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--cm-muted)', flexShrink: 0 }}
              >
                <IcoBack />
              </button>
              {t('comm_thread', lang)}
            </div>
          </div>
          <ThreadView
            post={posts.find(p => p.id === selectedPost.id) || selectedPost}
            session={session}
            liked={myLikes.has(selectedPost.id)}
            onLike={e => handleLike(e, selectedPost)}
            lang={lang}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <style>{cssVars}{CSS}</style>
      <div className="cm-wrap">
        {/* topbar */}
        <div className="cm-topbar">
          <div className="cm-topbar-title">
            {t('comm_title', lang)}
            {!loading && <span className="cm-badge">{posts.length}</span>}
          </div>
          <div className="cm-topbar-right">
            <div className="cm-search">
              <IcoSearch />
              <input
                placeholder={t('comm_search', lang)}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="cm-create-btn" onClick={() => setShowModal(true)}>
              <IcoPlus /> {t('comm_create', lang)}
            </button>
          </div>
        </div>

        {/* feed */}
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : filteredPosts.length === 0 ? (
          <div className="cm-empty">
            {search ? t('comm_no_results', lang) : t('comm_empty', lang)}
          </div>
        ) : (
          filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              liked={myLikes.has(post.id)}
              onLike={e => handleLike(e, post)}
              onClick={() => setSelectedPost(post)}
              lang={lang}
            />
          ))
        )}
      </div>

      {showModal && (
        <CreateModal
          session={session}
          lang={lang}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchPosts() }}
        />
      )}
    </>
  )
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
function PostCard({ post, liked, onLike, onClick, lang = 'vi' }) {
  const email   = post.user_email || post.user_id || ''
  const inits   = initials(email)
  const bgColor = avatarColor(post.user_id || email)
  const commentCount = post.community_comments?.[0]?.count ?? 0

  return (
    <div className="cm-card" onClick={onClick}>
      <div className="cm-card-header">
        <div className="cm-avatar" style={{ background: bgColor }}>{inits}</div>
        <div>
          <div className="cm-author">{email.split('@')[0] || t('comm_anon', lang)}</div>
          <div className="cm-time">{timeAgo(post.created_at, lang)}</div>
        </div>
      </div>
      <div className="cm-title">{post.title}</div>
      <div className="cm-body">{post.body.length > 180 ? post.body.slice(0, 180) + '…' : post.body}</div>
      {post.tags?.length > 0 && (
        <div className="cm-tags">
          {post.tags.map(tag => (
            <span key={tag} className="cm-tag"><IcoTag />{tag}</span>
          ))}
        </div>
      )}
      <div className="cm-footer">
        <div className={`cm-stat ${liked ? 'liked' : ''}`} onClick={onLike}>
          <IcoLike filled={liked} /> {post.likes}
        </div>
        <div className="cm-stat">
          <IcoComment /> {commentCount} {t('comm_comments', lang)}
        </div>
      </div>
    </div>
  )
}

// ─── ThreadView ───────────────────────────────────────────────────────────────
function ThreadView({ post, session, liked, onLike, lang = 'vi' }) {
  const [comments, setComments] = useState([])
  const [loadingC, setLoadingC] = useState(true)
  const bottomRef = useRef(null)

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoadingC(false)
  }, [post.id])

  useEffect(() => { fetchComments() }, [fetchComments])

  // Realtime comments
  useEffect(() => {
    const channel = supabase
      .channel(`comments_${post.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_comments', filter: `post_id=eq.${post.id}` },
        payload => setComments(prev => [...prev, payload.new])
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [post.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const email   = session?.user?.email || ''
  const inits   = initials(email)
  const bgColor = avatarColor(session?.user?.id || email)
  const commentCount = comments.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* question */}
      <div className="cm-thread-q">
        <div className="cm-card-header">
          <div className="cm-avatar" style={{ background: avatarColor(post.user_id) }}>
            {initials(post.user_email || post.user_id || '')}
          </div>
          <div>
            <div className="cm-author">{(post.user_email || post.user_id || '').split('@')[0] || t('comm_anon', lang)}</div>
            <div className="cm-time">{timeAgo(post.created_at, lang)}</div>
          </div>
        </div>
        <div className="cm-thread-title">{post.title}</div>
        <div className="cm-thread-body">{post.body}</div>
        {post.tags?.length > 0 && (
          <div className="cm-tags">
            {post.tags.map(t => <span key={t} className="cm-tag"><IcoTag />{t}</span>)}
          </div>
        )}
        <div className="cm-footer">
          <div className={`cm-stat ${liked ? 'liked' : ''}`} onClick={onLike}>
            <IcoLike filled={liked} /> {post.likes}
          </div>
        </div>
      </div>

      {/* chat */}
      <div className="cm-chat">
        <div className="cm-chat-hdr">
          <IcoComment /> {commentCount} {t('comm_comments', lang)}
        </div>
        <div className="cm-msgs">
          {loadingC && <div style={{ padding: '20px 0' }}><IcoSpinner /></div>}
          {!loadingC && comments.length === 0 && (
            <div className="cm-empty">{t('comm_no_comments', lang)}</div>
          )}
          {comments.map(c => {
            const isOwn = c.user_id === session?.user?.id
            const cEmail = c.user_email || c.user_id || ''
            return (
              <div key={c.id} className={`cm-msg ${isOwn ? 'own' : ''}`}>
                <div className="cm-msg-av" style={{ background: avatarColor(c.user_id) }}>
                  {initials(cEmail)}
                </div>
                <div className={`cm-msg-wrap ${isOwn ? 'own' : ''}`}>
                  <div className={`cm-msg-meta ${isOwn ? 'own' : ''}`}>
                    <span className="cm-msg-name">{cEmail.split('@')[0] || t('comm_anon', lang)}</span>
                    <span className="cm-msg-time">{timeAgo(c.created_at, lang)}</span>
                  </div>
                  <div className={`cm-bubble ${isOwn ? 'own' : ''}`}>{c.body}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {session ? (
          <ChatInput postId={post.id} userId={session.user.id} lang={lang} />
        ) : (
          <div style={{ padding: '14px 18px', color: 'var(--cm-faint)', fontSize: 13, borderTop: '1px solid var(--cm-card-border)', textAlign: 'center' }}>
            {t('comm_login_prompt', lang)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ChatInput ────────────────────────────────────────────────────────────────
function ChatInput({ postId, userId, lang = 'vi' }) {
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    await supabase.from('community_comments').insert({
      post_id: postId, user_id: userId, body: trimmed,
    })
    setText('')
    setSending(false)
  }

  return (
    <div className="cm-input-row">
      <textarea
        className="cm-textarea"
        rows={1}
        placeholder={t('comm_input_ph', lang)}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
      />
      <button className="cm-send-btn" onClick={send} disabled={!text.trim() || sending}>
        <IcoSend />
      </button>
    </div>
  )
}

// ─── CreateModal ──────────────────────────────────────────────────────────────
function CreateModal({ session, onClose, onCreated, lang = 'vi' }) {
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [tagsRaw, setTagsRaw]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  const submit = async () => {
    if (!title.trim() || !body.trim()) { setErr(t('comm_err_fields', lang)); return }
    if (!session) { setErr(t('comm_err_login', lang)); return }
    setSaving(true); setErr('')
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    const { error } = await supabase.from('community_posts').insert({
      user_id: session.user.id,
      title: title.trim(),
      body: body.trim(),
      tags,
    })
    if (error) { setErr(error.message); setSaving(false); return }
    onCreated()
  }

  return (
    <div className="cm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cm-modal">
        <div className="cm-modal-hdr">
          <span className="cm-modal-title">{t('comm_modal_title', lang)}</span>
          <button className="cm-modal-close" onClick={onClose}><IcoClose /></button>
        </div>
        <div className="cm-modal-body">
          <div>
            <div className="cm-field-lbl">{t('comm_field_title', lang)}</div>
            <input className="cm-field-inp" placeholder={t('comm_title_ph', lang)} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <div className="cm-field-lbl">{t('comm_field_body', lang)}</div>
            <textarea className="cm-field-inp cm-field-ta" placeholder={t('comm_body_ph', lang)} value={body} onChange={e => setBody(e.target.value)} />
          </div>
          <div>
            <div className="cm-field-lbl">{t('comm_field_tags', lang)} <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>({t('comm_tags_hint', lang)})</span></div>
            <input className="cm-field-inp" placeholder={t('comm_tags_ph', lang)} value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} />
          </div>
          {err && <div className="cm-err">{err}</div>}
        </div>
        <div className="cm-modal-ftr">
          <button className="cm-btn-ghost" onClick={onClose}>{t('comm_cancel', lang)}</button>
          <button className="cm-create-btn" onClick={submit} disabled={saving || !title.trim() || !body.trim()}>
            {saving ? t('comm_submitting', lang) : <><IcoPlus /> {t('comm_submit', lang)}</>}
          </button>
        </div>
      </div>
    </div>
  )
}