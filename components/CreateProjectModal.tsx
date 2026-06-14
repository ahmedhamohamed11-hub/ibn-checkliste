'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_FAVORITES, PROJECT_TEMPLATES } from '@/lib/constants'
import { X, ChevronDown, ChevronUp, CheckSquare, Square, ClipboardList } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreated: (id: string) => void
  userName: string
}

export default function CreateProjectModal({ onClose, onCreated, userName }: Props) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [taskList, setTaskList] = useState<string[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [userFavorites, setUserFavorites] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [listInput, setListInput] = useState('')
  const [showListImport, setShowListImport] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState<string[]>([userName])

  useEffect(() => {
    loadFavoritesAndSuggestions()
  }, [])

  useEffect(() => {
    buildTaskList()
  }, [selectedTemplate, userFavorites, suggestions])

  const loadFavoritesAndSuggestions = async () => {
    const [{ data: favs }, { data: suggs }] = await Promise.all([
      supabase.from('favorites').select('title').eq('user_name', userName).order('position'),
      supabase.from('suggestion_library').select('title').order('usage_count', { ascending: false }).limit(20),
    ])
    const favTitles = favs?.map(f => f.title) || DEFAULT_FAVORITES
    setUserFavorites(favTitles)
    const suggTitles = suggs?.map(s => s.title).filter(t => !favTitles.includes(t)) || []
    setSuggestions(suggTitles)
  }

  const buildTaskList = () => {
    if (selectedTemplate && PROJECT_TEMPLATES[selectedTemplate]) {
      const tmpl = PROJECT_TEMPLATES[selectedTemplate]
      setTaskList(tmpl)
      setSelectedTasks(new Set(tmpl))
    } else {
      const combined = [...userFavorites, ...suggestions.filter(s => !userFavorites.includes(s))]
      setTaskList(combined)
      setSelectedTasks(new Set(combined))
    }
  }

  const toggleTask = (title: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }

  const selectAll = () => setSelectedTasks(new Set(taskList))
  const selectNone = () => setSelectedTasks(new Set())

  const handleListImport = () => {
    const lines = listInput.split('\n').map(l => l.trim()).filter(Boolean)
    const newTasks = lines.filter(l => !taskList.includes(l))
    setTaskList(prev => [...prev, ...newTasks])
    setSelectedTasks(prev => {
      const next = new Set(prev)
      lines.forEach(l => next.add(l))
      return next
    })
    setListInput('')
    setShowListImport(false)
  }

  const addParticipant = () => {
    const p = participantInput.trim()
    if (p && !participants.includes(p)) {
      setParticipants(prev => [...prev, p])
      setParticipantInput('')
    }
  }

  const removeParticipant = (name: string) => {
    if (name === userName) return
    setParticipants(prev => prev.filter(p => p !== name))
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const { data: project } = await supabase
        .from('projects')
        .insert({ name: name.trim(), commissioning_date: date || null, creator_name: userName, archived: false })
        .select().single()
      if (!project) throw new Error('Projekt konnte nicht erstellt werden')

      // Add participants
      if (participants.length > 0) {
        await supabase.from('project_participants').insert(
          participants.map(p => ({ project_id: project.id, user_name: p }))
        )
      }

      // Create tasks in order
      const tasks = Array.from(selectedTasks)
        .filter(t => taskList.includes(t))
        .sort((a, b) => taskList.indexOf(a) - taskList.indexOf(b))

      if (tasks.length > 0) {
        await supabase.from('tasks').insert(
          tasks.map((title, i) => ({
            project_id: project.id, title, status: 'offen',
            created_by: userName, position: i,
          }))
        )
        // Update suggestion library
        for (const title of tasks) {
          try { await supabase.rpc('upsert_suggestion', { p_title: title }) } catch {}
        }
      }

      await supabase.from('activity_log').insert({
        project_id: project.id, actor: userName,
        action: 'Projekt erstellt', detail: project.name,
      })

      onCreated(project.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 800 }}>
            {step === 1 ? 'Neues Projekt' : 'Aufgaben auswählen'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', minHeight: 'auto', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Project name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Projektname *
              </label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Supermarkt Meidling" autoFocus />
            </div>

            {/* Date */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Inbetriebnahmedatum
              </label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {/* Template */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Vorlage (optional)
              </label>
              <select
                className="input"
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">— Favoriten verwenden —</option>
                {Object.keys(PROJECT_TEMPLATES).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Participants */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Teilnehmer
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  className="input"
                  value={participantInput}
                  onChange={e => setParticipantInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipant()}
                  placeholder="Name eingeben + Enter"
                />
                <button className="btn btn-primary" onClick={addParticipant} style={{ whiteSpace: 'nowrap', minHeight: 'auto' }}>
                  Hinzufügen
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {participants.map(p => (
                  <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--accent-glow)', color: 'var(--accent-light)', border: '1px solid rgba(30,111,186,0.25)', borderRadius: '99px', padding: '4px 10px', fontSize: '13px', fontWeight: 600 }}>
                    {p}
                    {p !== userName && (
                      <button onClick={() => removeParticipant(p)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', minHeight: 'auto', padding: '0', lineHeight: 1 }}>
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Abbrechen</button>
              <button className="btn btn-primary" onClick={() => { if (name.trim()) setStep(2) }} style={{ flex: 2 }} disabled={!name.trim()}>
                Weiter: Aufgaben →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Template badge */}
            {selectedTemplate && (
              <div className="chip" style={{ marginBottom: '12px' }}>
                <ClipboardList size={12} /> Vorlage: {selectedTemplate}
              </div>
            )}

            {/* Select all / none + import */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={selectAll} style={{ fontSize: '13px', padding: '8px 12px', minHeight: 'auto' }}>
                <CheckSquare size={14} /> Alle
              </button>
              <button className="btn btn-ghost" onClick={selectNone} style={{ fontSize: '13px', padding: '8px 12px', minHeight: 'auto' }}>
                <Square size={14} /> Keine
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                {selectedTasks.size} ausgewählt
              </span>
            </div>

            {/* Task list */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '12px' }}>
              {taskList.map((title, i) => {
                const isSelected = selectedTasks.has(title)
                const isSuggestion = !userFavorites.includes(title) && !selectedTemplate
                return (
                  <div
                    key={i}
                    onClick={() => toggleTask(title)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px', cursor: 'pointer',
                      borderBottom: i < taskList.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isSelected ? 'var(--accent-glow)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border-light)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {isSelected && <span style={{ color: 'white', fontSize: '12px', fontWeight: 800 }}>✓</span>}
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontSize: '14px', flex: 1 }}>{title}</span>
                    {isSuggestion && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-hover)', borderRadius: '4px', padding: '2px 6px' }}>
                        Vorschlag
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* List import */}
            <div style={{ marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
              <button
                onClick={() => setShowListImport(!showListImport)}
                style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-hover)', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minHeight: 'auto' }}
              >
                + Liste einfügen (eine Zeile = eine Aufgabe)
                {showListImport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showListImport && (
                <div style={{ padding: '12px' }}>
                  <textarea
                    className="input"
                    value={listInput}
                    onChange={e => setListInput(e.target.value)}
                    placeholder={'Messprotokolle\nIP-Adresse einstellen\nAlarmweiterleitung testen'}
                    rows={4}
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '13px' }}
                  />
                  <button className="btn btn-primary" onClick={handleListImport} style={{ marginTop: '8px', width: '100%', padding: '10px' }}>
                    Importieren
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>← Zurück</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={loading}
                style={{ flex: 2 }}
              >
                {loading ? 'Erstelle ...' : `✓ Projekt erstellen (${selectedTasks.size} Aufgaben)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
