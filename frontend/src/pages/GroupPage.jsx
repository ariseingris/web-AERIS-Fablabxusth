// frontend/src/pages/GroupPage.jsx
// GROUP 7: Full groups page — list, detail with Members/Journal/Progress/Discussion tabs
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useColors } from '../hooks/useColors'
import { useLang } from '../contexts/LangContext'
import { useAuth } from '../hooks/useAuth'
import { t } from '../i18n'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function authHeaders() {
  const session = (await supabase.auth.getSession()).data?.session
  return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
  return fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Create Group Modal
// ═══════════════════════════════════════════════════════════════════════════════
function CreateGroupModal({ open, onClose, onCreate, C, lang }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleCreate = async () => {
    if (!name.trim()) return
    setError('')
    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: name.trim(), description: desc.trim() })
        .select()
        .single()

      if (groupError) {
        setError(groupError.message)
        setCreating(false)
        return
      }

      // 2. Add creator as leader
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'leader' })

      if (memberError) {
        setError(memberError.message)
        setCreating(false)
        return
      }

      onCreate({ ...group, my_role: 'leader' })
    } catch (err) {
      console.error('Failed to create group:', err)
      console.error('Full error:', JSON.stringify(err, null, 2))
      setError(err.message || 'Failed to create group. Please try again.')
    }
    setCreating(false)
    setName('')
    setDesc('')
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: C.inputBg, border: `1px solid ${C.inputBorder}`,
    color: C.inputColor, fontSize: 14, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.cardBg, border: `1px solid ${C.cardBorder}`,
          borderRadius: 18, padding: 28, width: 420, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: C.heading }}>
          ✨ {t('grp_create_title', lang)}
        </h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6 }}>
            {t('grp_name', lang)}
          </label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle}
            placeholder="e.g. AERIS Team Alpha" autoFocus />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 6 }}>
            {t('grp_description', lang)}
          </label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Optional description…" />
        </div>
        {error && (
          <div style={{
            marginBottom: 12, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            color: '#f87171', fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13,
            background: C.cardBg, color: C.muted, border: `1px solid ${C.cardBorder}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{t('grp_cancel', lang)}</button>
          <button onClick={handleCreate} disabled={creating || !name.trim()} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13,
            background: 'linear-gradient(135deg,#065f46,#10b981)',
            color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            opacity: creating || !name.trim() ? 0.5 : 1,
          }}>{creating ? '...' : t('grp_create', lang)}</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Members Tab
// ═══════════════════════════════════════════════════════════════════════════════
function MembersTab({ groupId, isLeader, C, lang }) {
  const [members, setMembers] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [addError, setAddError] = useState('')

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('group_members')
        .select('user_id, role, joined_at, profiles(full_name, avatar_url, email)')
        .eq('group_id', groupId)
      setMembers(data ?? [])
    } catch { /* ignore */ }
  }, [groupId])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const addMember = async () => {
    if (!newEmail.trim()) return
    setAddingMember(true)
    setAddError('')
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', newEmail.trim().toLowerCase())
        .single()

      if (profileError || !profile) {
        setAddError('No user found with that email address.')
        setAddingMember(false)
        return
      }

      const { data: existing } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', profile.id)
        .single()

      if (existing) {
        setAddError('This user is already a member.')
        setAddingMember(false)
        return
      }

      const { error: insertError } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: profile.id, role: 'member' })

      if (insertError) throw insertError

      setNewEmail('')
      fetchMembers()
    } catch (err) {
      setAddError(err.message || 'Failed to add member.')
    }
    setAddingMember(false)
  }

  const removeMember = async (userId) => {
    try {
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
      fetchMembers()
    } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Add member (leader only) */}
      {(isLeader || true) && (
        <>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            background: C.accentBg, borderRadius: 12, padding: 12,
            border: `1px solid ${C.accentBorder}`,
          }}>
            <input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Enter member email address..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                background: C.inputBg, border: `1px solid ${C.inputBorder}`,
                color: C.inputColor, fontSize: 13, fontFamily: "'DM Mono', monospace",
                outline: 'none',
              }}
            />
            <button onClick={addMember} disabled={addingMember} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12,
              background: 'linear-gradient(135deg,#065f46,#10b981)',
              color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              opacity: addingMember ? 0.5 : 1,
            }}>
              + {t('grp_add_member', lang)}
            </button>
          </div>
          {addError && (
            <div style={{
              fontSize: 12, color: '#f87171', padding: '6px 12px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8,
            }}>
              ⚠️ {addError}
            </div>
          )}
        </>
      )}

      {/* Members list */}
      {members.map(m => (
        <div key={m.user_id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: C.cardBg,
          border: `1px solid ${C.cardBorder}`, borderRadius: 12,
          transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.cardBorderHover}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.cardBorder}
        >
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.profiles?.full_name || m.profiles?.email || 'U')}&background=059669&color=fff&bold=true&size=36`}
            alt="" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.body }}>
              {m.profiles?.full_name || m.profiles?.email?.split('@')[0] || 'Unknown'}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {m.profiles?.email || ''}
            </div>
          </div>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 100,
            fontFamily: "'DM Mono', monospace", fontWeight: 600,
            background: m.role === 'leader' ? C.accentBg : C.divider,
            color: m.role === 'leader' ? C.accent : C.faint,
            border: `1px solid ${m.role === 'leader' ? C.accentBorder : C.cardBorder}`,
          }}>
            {m.role === 'leader' ? `👑 ${t('grp_leader', lang)}` : t('grp_member', lang)}
          </span>
          {isLeader && m.role !== 'leader' && (
            <button onClick={() => removeMember(m.user_id)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11,
              background: 'rgba(248,113,113,0.08)', color: '#f87171',
              border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              {t('grp_remove', lang)}
            </button>
          )}
        </div>
      ))}

      {members.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: C.faint, fontSize: 13 }}>
          No members found.
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Journal Tab
// ═══════════════════════════════════════════════════════════════════════════════
function JournalTab({ groupId, C, lang }) {
  const [entries, setEntries] = useState([])
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('group_journal')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
      setEntries((data ?? []).map(e => ({ ...e, date: new Date(e.created_at).toLocaleDateString() })))
    } catch { /* ignore */ }
  }, [groupId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const addEntry = async () => {
    if (!content.trim()) return
    setPosting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('group_journal')
        .insert({ group_id: groupId, content: content.trim(), author_id: user.id })
      setContent('')
      fetchEntries()
    } catch { /* ignore */ }
    setPosting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Add entry */}
      <div style={{
        background: C.cardBg, border: `1px solid ${C.cardBorder}`,
        borderRadius: 14, padding: 16,
      }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={t('grp_journal_placeholder', lang)}
          rows={3}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            background: C.inputBg, border: `1px solid ${C.inputBorder}`,
            color: C.inputColor, fontSize: 13, fontFamily: 'inherit',
            outline: 'none', resize: 'vertical', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={addEntry} disabled={posting || !content.trim()} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 12,
            background: 'linear-gradient(135deg,#065f46,#10b981)',
            color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            opacity: posting || !content.trim() ? 0.5 : 1,
          }}>
            + {t('grp_journal_add', lang)}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.faint, fontSize: 13 }}>
          📝 {t('grp_journal_empty', lang)}
        </div>
      )}
      {entries.map((entry, i) => (
        <div key={entry.id} style={{ display: 'flex', gap: 14 }}>
          {/* Timeline line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i === 0 ? C.accent : C.cardBorder,
              border: `2px solid ${i === 0 ? C.accentBorder : C.divider}`,
              flexShrink: 0,
            }} />
            {i < entries.length - 1 && (
              <div style={{ width: 2, flex: 1, background: C.divider, marginTop: 4 }} />
            )}
          </div>
          {/* Content */}
          <div style={{
            flex: 1, background: C.cardBg, border: `1px solid ${C.cardBorder}`,
            borderRadius: 12, padding: '14px 18px', marginBottom: 2,
          }}>
            <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6 }}>
              {entry.content}
            </div>
            <div style={{
              display: 'flex', gap: 12, marginTop: 8,
              fontSize: 11, color: C.faint, fontFamily: "'DM Mono', monospace",
            }}>
              <span>{entry.date}</span>
              <span>{entry.author_id?.slice(0, 8)}…</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Progress Tab (Kanban)
// ═══════════════════════════════════════════════════════════════════════════════
function ProgressTab({ groupId, C, lang }) {
  const [tasks, setTasks] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [adding, setAdding] = useState(false)
  const [draggedId, setDraggedId] = useState(null)

  const fetchTasks = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('group_tasks')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
      setTasks(data ?? [])
    } catch { /* ignore */ }
  }, [groupId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const addTask = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('group_tasks')
        .insert({ group_id: groupId, title: newTitle.trim(), due_date: newDue || null, status: 'todo', assigned_to: user.id })
      setNewTitle('')
      setNewDue('')
      fetchTasks()
    } catch { /* ignore */ }
    setAdding(false)
  }

  const moveTask = async (taskId, newStatus) => {
    try {
      await supabase
        .from('group_tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
      fetchTasks()
    } catch { /* ignore */ }
  }

  const columns = [
    { key: 'todo', label: t('grp_todo', lang), color: '#fbbf24', icon: '📋' },
    { key: 'in_progress', label: t('grp_in_progress', lang), color: '#60a5fa', icon: '🔄' },
    { key: 'done', label: t('grp_done', lang), color: '#4ade80', icon: '✅' },
  ]

  const handleDrop = (e, columnKey) => {
    e.preventDefault()
    if (draggedId) {
      moveTask(draggedId, columnKey)
      setDraggedId(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Add task form */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: C.cardBg, borderRadius: 12, padding: 12,
        border: `1px solid ${C.cardBorder}`,
      }}>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder={t('grp_task_title', lang)}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            background: C.inputBg, border: `1px solid ${C.inputBorder}`,
            color: C.inputColor, fontSize: 13, fontFamily: 'inherit', outline: 'none',
          }}
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <input
          type="date"
          value={newDue}
          onChange={e => setNewDue(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, width: 150,
            background: C.inputBg, border: `1px solid ${C.inputBorder}`,
            color: C.inputColor, fontSize: 12, fontFamily: "'DM Mono', monospace", outline: 'none',
          }}
        />
        <button onClick={addTask} disabled={adding || !newTitle.trim()} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 12,
          background: 'linear-gradient(135deg,#065f46,#10b981)',
          color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          opacity: adding || !newTitle.trim() ? 0.5 : 1, whiteSpace: 'nowrap',
        }}>
          + {t('grp_add_task', lang)}
        </button>
      </div>

      {/* Kanban board */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
        minHeight: 300,
      }}>
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key)
          return (
            <div
              key={col.key}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, col.key)}
              style={{
                background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
                minHeight: 200,
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                paddingBottom: 10, borderBottom: `2px solid ${col.color}30`,
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 14 }}>{col.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.heading }}>{col.label}</span>
                <span style={{
                  fontSize: 10, marginLeft: 'auto',
                  background: `${col.color}20`, color: col.color,
                  borderRadius: 100, padding: '1px 7px',
                  fontFamily: "'DM Mono', monospace", fontWeight: 600,
                }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards */}
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDraggedId(task.id)}
                  onDragEnd={() => setDraggedId(null)}
                  style={{
                    background: draggedId === task.id ? C.accentBg : C.inputBg,
                    border: `1px solid ${draggedId === task.id ? C.accentBorder : C.divider}`,
                    borderRadius: 10, padding: '10px 14px',
                    cursor: 'grab', transition: 'all 0.15s',
                    borderLeft: `3px solid ${col.color}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.body }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>
                      {task.description.slice(0, 60)}
                    </div>
                  )}
                  <div style={{
                    display: 'flex', gap: 8, marginTop: 6,
                    fontSize: 10, color: C.faint, fontFamily: "'DM Mono', monospace",
                  }}>
                    {task.due_date && <span>📅 {task.due_date}</span>}
                    {task.assigned_to && <span>👤 {task.assigned_to.slice(0, 8)}</span>}
                  </div>

                  {/* Quick move buttons */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {columns.filter(c => c.key !== task.status).map(c => (
                      <button
                        key={c.key}
                        onClick={(e) => { e.stopPropagation(); moveTask(task.id, c.key) }}
                        style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 4,
                          background: `${c.color}15`, color: c.color,
                          border: `1px solid ${c.color}30`, cursor: 'pointer',
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        → {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {colTasks.length === 0 && (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.faint, fontSize: 11, opacity: 0.5,
                  border: `1px dashed ${C.divider}`, borderRadius: 10, minHeight: 60,
                }}>
                  Drop here
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Discussion Tab (placeholder)
// ═══════════════════════════════════════════════════════════════════════════════
function DiscussionTab({ C, lang }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 12, padding: 60, textAlign: 'center',
      background: C.cardBg, border: `1px dashed ${C.cardBorder}`, borderRadius: 14,
    }}>
      <span style={{ fontSize: 40 }}>💬</span>
      <span style={{ fontSize: 15, color: C.heading, fontWeight: 500 }}>
        {t('grp_discussion', lang)}
      </span>
      <span style={{ fontSize: 13, color: C.faint }}>
        {t('grp_discussion_placeholder', lang)}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Group Detail View
// ═══════════════════════════════════════════════════════════════════════════════
function GroupDetail({ groupId, onBack, C, lang }) {
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [tab, setTab] = useState('members')
  const [isLeader, setIsLeader] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const { data: group, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single()
        if (groupError) throw groupError
        setGroup(group)

        const { data: members } = await supabase
          .from('group_members')
          .select('user_id, role, joined_at, profiles(full_name, avatar_url, email)')
          .eq('group_id', groupId)

        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const me = (members ?? []).find(m => m.user_id === currentUser?.id)
        setIsLeader(me?.role === 'leader')
        console.log('currentUser:', currentUser?.id)
        console.log('members:', members)
        console.log('me:', me)
        console.log('isLeader:', me?.role === 'leader')
      } catch { /* ignore */ }
    })()
  }, [groupId, user])

  const renameGroup = async () => {
    if (!newName.trim() || newName.trim() === group.name) {
      setEditingName(false)
      return
    }
    setRenaming(true)
    const { error } = await supabase
      .from('groups')
      .update({ name: newName.trim() })
      .eq('id', groupId)
    if (!error) {
      setGroup(prev => ({ ...prev, name: newName.trim() }))
    }
    setRenaming(false)
    setEditingName(false)
  }

  if (!group) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: C.faint, fontSize: 13 }}>
        Loading...
      </div>
    )
  }

  const tabs = [
    { key: 'members',    label: t('grp_members', lang),    icon: '👥' },
    { key: 'journal',    label: t('grp_journal', lang),    icon: '📝' },
    { key: 'progress',   label: t('grp_progress', lang),   icon: '📊' },
    { key: 'discussion', label: t('grp_discussion', lang), icon: '💬' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 12,
          background: C.cardBg, color: C.muted, border: `1px solid ${C.cardBorder}`,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ← {t('grp_back', lang)}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameGroup(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus
                  style={{
                    fontSize: 20, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                    background: C.inputBg, border: `1px solid ${C.accentBorder}`,
                    color: C.heading, fontFamily: 'inherit', outline: 'none', width: 220,
                  }}
                />
                <button onClick={renameGroup} disabled={renaming} style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12,
                  background: 'linear-gradient(135deg,#065f46,#10b981)',
                  color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {renaming ? '...' : '✓'}
                </button>
                <button onClick={() => setEditingName(false)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  background: C.cardBg, color: C.muted,
                  border: `1px solid ${C.cardBorder}`, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.heading }}>
                  {group.name}
                </h2>
                {isLeader && (
                  <button
                    onClick={() => { setNewName(group.name); setEditingName(true) }}
                    title="Rename group"
                    style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11,
                      background: C.cardBg, color: C.muted,
                      border: `1px solid ${C.cardBorder}`, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
            {isLeader && !editingName && (
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 100,
                background: C.accentBg, color: C.accent,
                border: `1px solid ${C.accentBorder}`,
                fontFamily: "'DM Mono', monospace", fontWeight: 600,
              }}>
                👑 {t('grp_leader', lang)}
              </span>
            )}
          </div>
          {group.description && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.subheading }}>
              {group.description}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${C.divider}`, paddingBottom: 0 }}>
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 16px', borderRadius: '8px 8px 0 0',
              border: 'none',
              background: tab === tb.key ? C.accentBg : 'transparent',
              color: tab === tb.key ? C.accent : C.muted,
              fontSize: 13, cursor: 'pointer',
              fontWeight: tab === tb.key ? 600 : 400,
              fontFamily: 'inherit', transition: 'all 0.15s',
              borderBottom: tab === tb.key ? `2px solid ${C.accent}` : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: 13 }}>{tb.icon}</span>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'members' && <MembersTab groupId={groupId} isLeader={isLeader} C={C} lang={lang} />}
      {tab === 'journal' && <JournalTab groupId={groupId} C={C} lang={lang} />}
      {tab === 'progress' && <ProgressTab groupId={groupId} C={C} lang={lang} />}
      {tab === 'discussion' && <DiscussionTab C={C} lang={lang} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main GroupPage
// ═══════════════════════════════════════════════════════════════════════════════
export default function GroupPage() {
  const C = useColors()
  const { lang } = useLang()
  const { id: paramId } = useParams()
  const navigate = useNavigate()

  const [groups, setGroups] = useState([])
  const [selectedId, setSelectedId] = useState(paramId || null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id, role, groups(*)')
        .eq('user_id', user.id)
      const groups = (memberRows ?? []).map(row => ({ ...row.groups, my_role: row.role }))
      setGroups(groups)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])
  useEffect(() => { setSelectedId(paramId || null) }, [paramId])

  const handleSelectGroup = (id) => {
    setSelectedId(id)
    navigate(`/dashboard/groups/${id}`)
  }

  const handleBack = () => {
    setSelectedId(null)
    navigate('/dashboard/groups')
  }

  // ── Detail view ─────────────────────────────────────────────────────────
  if (selectedId) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.body, maxWidth: 1100 }}>
        <GroupDetail groupId={selectedId} onBack={handleBack} C={C} lang={lang} />
      </div>
    )
  }

  // ── List view ───────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: C.body, maxWidth: 1100 }}>
      <style>{`*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.heading, margin: 0 }}>
            👥 {t('grp_title', lang)}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: C.subheading }}>
            {t('grp_subtitle', lang)}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 10, fontSize: 13,
          background: 'linear-gradient(135deg,#065f46,#10b981)',
          color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontWeight: 500,
        }}>
          + {t('grp_create', lang)}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: C.faint, fontSize: 13 }}>
          Loading...
        </div>
      )}

      {/* Empty */}
      {!loading && groups.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, padding: 60, textAlign: 'center',
          background: C.cardBg, border: `1px dashed ${C.cardBorder}`, borderRadius: 18,
        }}>
          <span style={{ fontSize: 42 }}>👥</span>
          <span style={{ fontSize: 14, color: C.faint }}>
            {t('grp_no_groups', lang)}
          </span>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13,
            background: C.accentBg, color: C.accent,
            border: `1px solid ${C.accentBorder}`, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            + {t('grp_create', lang)}
          </button>
        </div>
      )}

      {/* Groups grid */}
      {!loading && groups.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {groups.map(g => (
            <div
              key={g.id}
              onClick={() => handleSelectGroup(g.id)}
              style={{
                background: C.cardBg, border: `1px solid ${C.cardBorder}`,
                borderRadius: 16, padding: '20px 24px',
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.accentBorder
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.cardBorder
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg,#065f46,#10b981)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  👥
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 600, color: C.heading,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {g.name}
                  </div>
                  {g.description && (
                    <div style={{
                      fontSize: 12, color: C.faint, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {g.description}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: `1px solid ${C.divider}`, paddingTop: 10,
              }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 100,
                  fontFamily: "'DM Mono', monospace", fontWeight: 600,
                  background: g.my_role === 'leader' ? C.accentBg : C.divider,
                  color: g.my_role === 'leader' ? C.accent : C.faint,
                  border: `1px solid ${g.my_role === 'leader' ? C.accentBorder : C.cardBorder}`,
                }}>
                  {g.my_role === 'leader' ? `👑 ${t('grp_leader', lang)}` : t('grp_member', lang)}
                </span>
                <span style={{
                  fontSize: 10, color: C.faint, fontFamily: "'DM Mono', monospace",
                }}>
                  {g.created_at ? new Date(g.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateGroupModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(newGroup) => {
          if (newGroup) setGroups(prev => [newGroup, ...prev])
          fetchGroups()
        }}
        C={C} lang={lang}
      />
    </div>
  )
}
