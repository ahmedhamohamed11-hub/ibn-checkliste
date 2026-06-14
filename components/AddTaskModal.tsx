'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'

interface Props {
  projectId: string
  userName: string
  nextPosition: number
  onClose: () => void
  onCreated: () => void
}

export default function AddTaskModal({ projectId, userName, nextPosition, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSuggestions()
  }, [])

  const loadSuggestions = async () => {
    const { data } = await supabase
      .from('suggestion_library')
      .select('title')
      .order('usage_count', { ascending: false })
      .limit(10)
    if (data) setSuggestions(data.map(s => s.title))
  }

  const filtered = suggestions.filter(s =>
    title.length === 0 || s.toLowerCase().includes(title.toLowerCase())
  ).slice(0, 6)

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    await supabase.from('tasks').insert({
      project_id: projectId, title: title.trim(),
      description: description.trim() || null,
      status: 'offen', created_by: userName, position: nextPosition,
    })
    // Update suggestion library
    try { await supabase.rpc('upsert_suggestion', { p_title: title.trim() }) } catch {}
    await supabase.from('activity_log').insert({
      project_id: projectId, actor: userName,
      action: 'Aufgabe erstellt', detail: title.trim(),
    })
    setLoading(false)
    onCreated()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>Neue Aufgabe</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', minHeight: 'auto' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Titel *
          </label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Aufgabe beschreiben ..."
            autoFocus
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCreate()}
          />
          {/* Autocomplete suggestions */}
          {filtered.length > 0 && title.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', marginTop: '4px', overflow: 'hidden' }}>
              {filtered.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setTitle(s)}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'var(--bg-hover)', border: 'none', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer', minHeight: 'auto' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Beschreibung
          </label>
          <textarea
            className="input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional ..."
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading || !title.trim()} style={{ flex: 2 }}>
            {loading ? 'Erstelle ...' : 'Aufgabe erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}
