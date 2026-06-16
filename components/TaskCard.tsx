'use client'

import { useState } from 'react'
import { Task, TaskStatus, Comment } from '@/types'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp, MessageSquare, Pencil, Trash2, Send, X, Check } from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  task: Task
  projectId: string
  userName: string
  onStatusChange: (status: TaskStatus, isRegie?: boolean) => void
  onUpdated: () => void
}

const STATUS_CONFIG = {
  offen:     { label: 'Offen',     bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
  in_arbeit: { label: 'In Arbeit', bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  erledigt:  { label: 'Erledigt',  bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.3)' },
}

const REGIE_CONFIG = { label: 'Regie', bg: 'rgba(168,85,247,0.15)', color: '#a855f7', border: 'rgba(168,85,247,0.3)' }

export default function TaskCard({ task, projectId, userName, onStatusChange, onUpdated }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description || '')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  useEffect(() => {
    if (expanded) loadComments()
  }, [expanded])

  // Realtime for comments
  useEffect(() => {
    if (!expanded) return
    const channel = supabase
      .channel(`task-comments-${task.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${task.id}` }, () => loadComments())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [expanded, task.id])

  const loadComments = async () => {
    setLoadingComments(true)
    const { data } = await supabase.from('comments').select('*').eq('task_id', task.id).order('created_at')
    if (data) setComments(data)
    setLoadingComments(false)
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return
    await supabase.from('tasks').update({
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      modified_by: userName,
    }).eq('id', task.id)
    await supabase.from('activity_log').insert({
      project_id: projectId, task_id: task.id, actor: userName,
      action: 'Aufgabe bearbeitet', detail: editTitle.trim(),
    })
    setEditing(false)
    onUpdated()
  }

  const handleDelete = async () => {
    const titleSnapshot = task.title
    // Kommentare werden via Datenbank-Cascade (ON DELETE CASCADE) automatisch entfernt.
    // Der Aktivitätsverlauf bleibt bewusst erhalten (ON DELETE SET NULL) –
    // er ist ein Audit-Log und darf beim Löschen einer Aufgabe nicht verschwinden.
    await supabase.from('activity_log').insert({
      project_id: projectId, task_id: null, actor: userName,
      action: 'Aufgabe gelöscht', detail: titleSnapshot,
    })
    await supabase.from('tasks').delete().eq('id', task.id)
    onUpdated()
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    await supabase.from('comments').insert({
      task_id: task.id, project_id: projectId,
      author: userName, content: commentText.trim(),
    })
    await supabase.from('activity_log').insert({
      project_id: projectId, task_id: task.id, actor: userName,
      action: 'Kommentar hinzugefügt', detail: task.title,
    })
    setCommentText('')
    loadComments()
  }

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return
    await supabase.from('comments').update({ content: editCommentText.trim() }).eq('id', commentId)
    setEditingComment(null)
    loadComments()
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId)
    loadComments()
  }

  const cfg = STATUS_CONFIG[task.status]
  const statusOrder: TaskStatus[] = ['offen', 'in_arbeit', 'erledigt']

  // Regie-Toggle: setzt die Aufgabe automatisch auf "erledigt" und
  // schaltet die Regie-Kennzeichnung um. Regie ist kein eigener Status,
  // sondern eine Zusatzmarkierung innerhalb von "erledigt".
  const handleRegieToggle = () => {
    if (task.status === 'erledigt' && task.is_regie) {
      // Regie-Kennzeichnung entfernen, Aufgabe bleibt erledigt
      onStatusChange('erledigt', false)
    } else {
      // Regie setzen → Aufgabe gilt automatisch als erledigt
      onStatusChange('erledigt', true)
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: '0',
        opacity: task.status === 'erledigt' ? 0.75 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Main row */}
     <div
  style={{
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '12px',
  }}
>

       {/* Title */}
<div
  style={{
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  }}
>
  <p
    style={{
      color: 'var(--text-primary)',
      fontSize: '14px',
      fontWeight: 600,
      textDecoration:
        task.status === 'erledigt'
          ? 'line-through'
          : 'none',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      lineHeight: '1.4',
    }}
  >
    {task.title}
  </p>

  {task.completed_by && task.status === 'erledigt' && (
    <p
      style={{
        color: 'var(--text-muted)',
        fontSize: '11px',
        marginTop: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      ✓ {task.completed_by}
      {task.is_regie && (
        <span style={{
          color: REGIE_CONFIG.color,
          background: REGIE_CONFIG.bg,
          border: `1px solid ${REGIE_CONFIG.border}`,
          borderRadius: '4px',
          padding: '1px 6px',
          fontSize: '10px',
          fontWeight: 700,
        }}>
          Regie
        </span>
      )}
    </p>
  )}
</div>
   {/* Status buttons */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {statusOrder.map(s => {
            const c = STATUS_CONFIG[s]
            const active = task.status === s
            return (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                style={{
                  padding: '5px 8px', borderRadius: '6px', border: `1px solid ${active ? c.border : 'var(--border)'}`,
                  background: active ? c.bg : 'transparent', color: active ? c.color : 'var(--text-muted)',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer', minHeight: 'auto',
                  transition: 'all 0.15s', whiteSpace: 'nowrap', flex: '1 1 auto',
                }}
              >
                {c.label}
              </button>
            )
          })}
          {/* Regie: Zusatzmarkierung, kein eigener Status. Setzt die Aufgabe
              automatisch auf "erledigt" und kennzeichnet sie zusätzlich. */}
          <button
            onClick={handleRegieToggle}
            title="Als Regiearbeit kennzeichnen (Aufgabe gilt automatisch als erledigt)"
            style={{
              padding: '5px 8px', borderRadius: '6px',
              border: `1px solid ${task.is_regie ? REGIE_CONFIG.border : 'var(--border)'}`,
              background: task.is_regie ? REGIE_CONFIG.bg : 'transparent',
              color: task.is_regie ? REGIE_CONFIG.color : 'var(--text-muted)',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer', minHeight: 'auto',
              transition: 'all 0.15s', whiteSpace: 'nowrap', flex: '1 1 auto',
            }}
          >
            {REGIE_CONFIG.label}
          </button>
        </div>
       
        {/* Expand + actions */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {comments.length > 0 && !expanded && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MessageSquare size={12} /> {comments.length}
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: '4px', cursor: 'pointer', minHeight: 'auto', display: 'flex', alignItems: 'center' }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px' }}>
          {editing ? (
            <div>
              <input
                className="input"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ marginBottom: '8px', fontWeight: 600 }}
                autoFocus
              />
              <textarea
                className="input"
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="Beschreibung (optional)"
                rows={3}
                style={{ resize: 'vertical', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={handleSaveEdit} style={{ flex: 1, padding: '9px' }}>
                  <Check size={14} /> Speichern
                </button>
                <button className="btn btn-ghost" onClick={() => { setEditing(false); setEditTitle(task.title); setEditDesc(task.description || '') }} style={{ padding: '9px 12px' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Description */}
              {task.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px', lineHeight: 1.5 }}>
                  {task.description}
                </p>
              )}

              {/* Meta */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  Erstellt: {task.created_by} · {new Date(task.created_at).toLocaleDateString('de-AT')} {new Date(task.created_at).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {task.modified_by && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    Geändert: {task.modified_by}
                  </span>
                )}
              </div>

              {/* Edit + Delete */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setEditing(true); setEditTitle(task.title); setEditDesc(task.description || '') }}
                  style={{ fontSize: '13px', padding: '8px 12px', minHeight: 'auto' }}
                >
                  <Pencil size={13} /> Bearbeiten
                </button>
                {showDeleteConfirm ? (
                  <>
                    <button className="btn btn-danger" onClick={handleDelete} style={{ fontSize: '13px', padding: '8px 12px', minHeight: 'auto' }}>
                      Ja, löschen
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)} style={{ fontSize: '13px', padding: '8px 12px', minHeight: 'auto' }}>
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <button
                    className="btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ fontSize: '13px', padding: '8px 12px', minHeight: 'auto', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Trash2 size={13} /> Löschen
                  </button>
                )}
              </div>
            </>
          )}

          {/* Comments section */}
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Kommentare {comments.length > 0 && `(${comments.length})`}
            </p>

            {comments.map(c => (
              <div key={c.id} style={{ marginBottom: '10px', padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--accent-light)', fontSize: '12px', fontWeight: 700 }}>{c.author}</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {new Date(c.created_at).toLocaleDateString('de-AT')} {new Date(c.created_at).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {c.author === userName && (
                      <>
                        <button onClick={() => { setEditingComment(c.id); setEditCommentText(c.content) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', minHeight: 'auto', padding: '2px' }}>
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', minHeight: 'auto', padding: '2px' }}>
                          <X size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingComment === c.id ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      className="input"
                      value={editCommentText}
                      onChange={e => setEditCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditComment(c.id)}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={() => handleEditComment(c.id)} style={{ minHeight: 'auto', padding: '8px 12px' }}>
                      <Check size={14} />
                    </button>
                    <button className="btn btn-ghost" onClick={() => setEditingComment(null)} style={{ minHeight: 'auto', padding: '8px 12px' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{c.content}</p>
                )}
              </div>
            ))}

            {/* Add comment */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                className="input"
                placeholder="Kommentar schreiben ..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                style={{ minHeight: 'auto', padding: '10px 14px' }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
