// app/templates/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import { PROJECT_TEMPLATES } from '@/lib/constants'
import Navbar from '@/components/ui/Navbar'
import { BookTemplate, ChevronRight, Edit, Trash2, Plus, X, ArrowUp, ArrowDown, Lock, Star, Check } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  created_by: string
}

interface TemplateTask {
  id: string
  title: string
  description: string | null
  position: number
}

interface Favorite {
  id: string
  title: string
  position: number
}

export default function TemplatesPage() {
  const { userName } = useUser()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [tasksByTemplate, setTasksByTemplate] = useState<Record<string, TemplateTask[]>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskTitle, setEditingTaskTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [creatingProject, setCreatingProject] = useState<string | null>(null)

  // Favoriten-Auswahl-State
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [selectedFavIds, setSelectedFavIds] = useState<Set<string>>(new Set())
  const [showFavPicker, setShowFavPicker] = useState(false)
  // Beim Erstellen: nach Speichern sofort Favoriten auswählen
  const [createStep, setCreateStep] = useState<'name' | 'tasks'>('name')

  useEffect(() => {
    if (!userName) {
      router.push('/')
      return
    }
    loadTemplates()
    loadFavorites()
  }, [userName])

  const loadFavorites = async () => {
    if (!userName) return
    const { data } = await supabase
      .from('favorites')
      .select('id, title, position')
      .eq('user_name', userName)
      .order('position', { ascending: true })
    setFavorites(data || [])
  }

  const loadTemplates = async () => {
    if (!userName) return
    setLoading(true)
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('created_by', userName)
      .order('created_at', { ascending: false })
    if (!error && data) {
      setTemplates(data)
      const tasksMap: Record<string, TemplateTask[]> = {}
      for (const t of data) {
        const { data: tasks } = await supabase
          .from('template_tasks')
          .select('*')
          .eq('template_id', t.id)
          .order('position', { ascending: true })
        tasksMap[t.id] = tasks || []
      }
      setTasksByTemplate(tasksMap)
    }
    setLoading(false)
  }

  const loadTemplateTasks = useCallback(async (templateId: string) => {
    const { data, error } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', templateId)
      .order('position', { ascending: true })
    if (!error && data) setTemplateTasks(data)
    else setTemplateTasks([])
  }, [])

  const openEdit = async (template: Template) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateDescription(template.description || '')
    setCreateStep('tasks')
    setShowFavPicker(false)
    setSelectedFavIds(new Set())
    await loadTemplateTasks(template.id)
  }

  const openCreate = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateDescription('')
    setTemplateTasks([])
    setCreateStep('name')
    setShowFavPicker(false)
    setSelectedFavIds(new Set())
    setShowCreateModal(true)
  }

  const closeModal = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateDescription('')
    setTemplateTasks([])
    setNewTaskTitle('')
    setEditingTaskId(null)
    setEditingTaskTitle('')
    setShowCreateModal(false)
    setShowFavPicker(false)
    setSelectedFavIds(new Set())
    setCreateStep('name')
  }

  // Schritt 1: Name speichern und zu Aufgaben wechseln
  const saveNameAndNext = async () => {
    if (!userName || !templateName.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('templates')
      .insert({ name: templateName.trim(), description: templateDescription.trim() || null, created_by: userName })
      .select()
      .single()
    if (data) {
      setEditingTemplate(data)
      setTemplateTasks([])
      setCreateStep('tasks')
    }
    setSaving(false)
  }

  // Name der Vorlage aktualisieren (beim Bearbeiten)
  const updateTemplateName = async () => {
    if (!editingTemplate || !templateName.trim()) return
    await supabase
      .from('templates')
      .update({ name: templateName.trim(), description: templateDescription.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', editingTemplate.id)
    await loadTemplates()
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen? Alle Aufgaben der Vorlage werden entfernt.')) return
    await supabase.from('templates').delete().eq('id', id)
    await loadTemplates()
    if (editingTemplate?.id === id) closeModal()
  }

  // Einzelne Aufgabe manuell hinzufügen
  const addTask = async () => {
    if (!newTaskTitle.trim() || !editingTemplate) return
    const maxPos = templateTasks.length > 0 ? Math.max(...templateTasks.map(t => t.position)) + 1 : 0
    const { data } = await supabase
      .from('template_tasks')
      .insert({ template_id: editingTemplate.id, title: newTaskTitle.trim(), position: maxPos })
      .select()
      .single()
    if (data) setTemplateTasks(prev => [...prev, data])
    setNewTaskTitle('')
  }

  // Mehrere Favoriten auf einmal hinzufügen
  const addSelectedFavorites = async () => {
    if (!editingTemplate || selectedFavIds.size === 0) return
    setSaving(true)
    const toAdd = favorites.filter(f => selectedFavIds.has(f.id))
    const existingTitles = new Set(templateTasks.map(t => t.title.toLowerCase()))
    const newOnes = toAdd.filter(f => !existingTitles.has(f.title.toLowerCase()))
    const maxPos = templateTasks.length > 0 ? Math.max(...templateTasks.map(t => t.position)) + 1 : 0
    if (newOnes.length > 0) {
      const { data } = await supabase
        .from('template_tasks')
        .insert(newOnes.map((f, i) => ({ template_id: editingTemplate.id, title: f.title, position: maxPos + i })))
        .select()
      if (data) setTemplateTasks(prev => [...prev, ...data].sort((a, b) => a.position - b.position))
    }
    setSelectedFavIds(new Set())
    setShowFavPicker(false)
    setSaving(false)
  }

  const updateTask = async (taskId: string, newTitle: string) => {
    if (!newTitle.trim()) return
    await supabase.from('template_tasks').update({ title: newTitle.trim() }).eq('id', taskId)
    setTemplateTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: newTitle.trim() } : t))
    setEditingTaskId(null)
    setEditingTaskTitle('')
  }

  const deleteTask = async (taskId: string) => {
    await supabase.from('template_tasks').delete().eq('id', taskId)
    setTemplateTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const moveTask = async (taskId: string, direction: 'up' | 'down') => {
    const index = templateTasks.findIndex(t => t.id === taskId)
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === templateTasks.length - 1) return
    const newTasks = [...templateTasks]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const tempPos = newTasks[index].position
    newTasks[index].position = newTasks[swapIndex].position
    newTasks[swapIndex].position = tempPos
    await supabase.from('template_tasks').update({ position: newTasks[index].position }).eq('id', newTasks[index].id)
    await supabase.from('template_tasks').update({ position: newTasks[swapIndex].position }).eq('id', newTasks[swapIndex].id)
    setTemplateTasks(newTasks.sort((a, b) => a.position - b.position))
  }

  const toggleFav = (id: string) => {
    setSelectedFavIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAllFavs = () => {
    const existingTitles = new Set(templateTasks.map(t => t.title.toLowerCase()))
    const available = favorites.filter(f => !existingTitles.has(f.title.toLowerCase()))
    setSelectedFavIds(new Set(available.map(f => f.id)))
  }

  const copySystemTemplate = async (tplName: string, tasks: string[]) => {
    if (!userName) return
    setSaving(true)
    const { data: newTpl } = await supabase
      .from('templates')
      .insert({ name: tplName, description: null, created_by: userName })
      .select().single()
    if (newTpl && tasks.length > 0) {
      await supabase.from('template_tasks').insert(
        tasks.map((title, i) => ({ template_id: newTpl.id, title, position: i }))
      )
    }
    await loadTemplates()
    setSaving(false)
    // Direkt in Bearbeitungsmodus öffnen
    if (newTpl) {
      setEditingTemplate(newTpl)
      setTemplateName(newTpl.name)
      setTemplateDescription('')
      setCreateStep('tasks')
      await loadTemplateTasks(newTpl.id)
    }
  }

  const createProjectFromSystemTemplate = async (tplName: string, tasks: string[]) => {
    if (!userName) return
    setCreatingProject(tplName)
    try {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({ name: tplName, commissioning_date: null, creator_name: userName, archived: false })
        .select().single()
      if (projectError || !newProject) throw new Error('Fehler')
      await supabase.from('project_participants').insert({ project_id: newProject.id, user_name: userName })
      if (tasks.length > 0) {
        await supabase.from('tasks').insert(tasks.map((title, i) => ({
          project_id: newProject.id, title, status: 'offen', created_by: userName, position: i,
        })))
      }
      await supabase.from('activity_log').insert({
        project_id: newProject.id, actor: userName, action: 'Projekt aus Standardvorlage erstellt', detail: tplName,
      })
      router.push(`/project/${newProject.id}`)
    } catch { alert('Fehler beim Erstellen des Projekts') }
    finally { setCreatingProject(null) }
  }

  const createProjectFromTemplate = async (template: Template) => {
    if (!userName) return
    setCreatingProject(template.id)
    try {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({ name: template.name, commissioning_date: null, creator_name: userName, archived: false })
        .select().single()
      if (projectError || !newProject) throw new Error('Fehler')
      await supabase.from('project_participants').insert({ project_id: newProject.id, user_name: userName })
      const { data: tasks } = await supabase
        .from('template_tasks').select('title, description, position')
        .eq('template_id', template.id).order('position')
      if (tasks && tasks.length > 0) {
        await supabase.from('tasks').insert(tasks.map(t => ({
          project_id: newProject.id, title: t.title, description: t.description,
          status: 'offen', created_by: userName, position: t.position,
        })))
      }
      router.push(`/project/${newProject.id}`)
    } catch { alert('Fehler beim Erstellen des Projekts') }
    finally { setCreatingProject(null) }
  }

  const isModalOpen = showCreateModal || editingTemplate !== null
  const existingTitles = new Set(templateTasks.map(t => t.title.toLowerCase()))

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px' }}>Laden...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px 80px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookTemplate size={22} style={{ color: 'var(--accent-light)' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Projektvorlagen</h1>
          </div>
          <button className="btn btn-primary" onClick={openCreate} style={{ padding: '6px 12px' }}>
            <Plus size={16} /> Neue Vorlage
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Wähle beim Erstellen eines Projekts eine Vorlage — Aufgaben werden automatisch übernommen.
        </p>

        {/* Standardvorlagen */}
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
          <Lock size={14} /> Standardvorlagen
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
          {Object.entries(PROJECT_TEMPLATES).map(([name, tasks]) => (
            <div key={name} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ marginBottom: '10px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{name}</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{tasks.length} Aufgaben</p>
              </div>
              <div style={{ marginBottom: '12px' }}>
                {tasks.slice(0, 4).map((task, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{task}</span>
                  </div>
                ))}
                {tasks.length > 4 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '13px' }}>
                    + {tasks.length - 4} weitere ...
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => copySystemTemplate(name, tasks)}
                  disabled={saving}
                  style={{ flex: 1, padding: '9px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  title="Als eigene Vorlage kopieren und bearbeiten"
                >
                  <Edit size={13} /> Kopieren & bearbeiten
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => createProjectFromSystemTemplate(name, tasks)}
                  disabled={creatingProject === name}
                  style={{ flex: 2, padding: '9px' }}
                >
                  {creatingProject === name ? 'Wird erstellt...' : 'Neues Projekt'}
                  <ChevronRight size={14} style={{ marginLeft: '4px' }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Eigene Vorlagen */}
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)' }}>
          Eigene Vorlagen
        </h2>
        {templates.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BookTemplate size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p>Keine eigenen Vorlagen vorhanden</p>
            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: '16px' }}>
              <Plus size={14} /> Erste Vorlage erstellen
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {templates.map(template => {
              const tasks = tasksByTemplate[template.id] || []
              return (
                <div key={template.id} className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '17px', fontWeight: 700 }}>{template.name}</h2>
                      {template.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{template.description}</p>
                      )}
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{tasks.length} Aufgaben</p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost" onClick={() => openEdit(template)} style={{ padding: '4px 10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit size={13} /> Bearbeiten
                      </button>
                      <button className="btn btn-ghost" onClick={() => deleteTemplate(template.id)} style={{ padding: '4px 8px', color: 'var(--danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    {tasks.slice(0, 5).map(task => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{task.title}</span>
                      </div>
                    ))}
                    {tasks.length > 5 && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '13px' }}>
                        + {tasks.length - 5} weitere ...
                      </p>
                    )}
                    {tasks.length === 0 && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Keine Aufgaben</p>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => createProjectFromTemplate(template)}
                    disabled={creatingProject === template.id}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    {creatingProject === template.id ? 'Wird erstellt...' : 'Neues Projekt mit dieser Vorlage'}
                    <ChevronRight size={15} style={{ marginLeft: '6px' }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════
          MODAL: Neue Vorlage / Bearbeiten
      ═══════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            {/* Modal-Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                {editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* ── SCHRITT 1: Name eingeben (nur beim Erstellen) ── */}
            {createStep === 'name' && !editingTemplate && (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Gib zuerst einen Namen für die Vorlage ein.
                </p>
                <input
                  className="input"
                  placeholder="z. B. Hofer Filiale Wien, Wärmepumpe Vaillant ..."
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveNameAndNext()}
                  autoFocus
                  style={{ marginBottom: '10px' }}
                />
                <textarea
                  className="input"
                  placeholder="Beschreibung (optional)"
                  value={templateDescription}
                  onChange={e => setTemplateDescription(e.target.value)}
                  rows={2}
                  style={{ marginBottom: '16px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost" onClick={closeModal}>Abbrechen</button>
                  <button
                    className="btn btn-primary"
                    onClick={saveNameAndNext}
                    disabled={!templateName.trim() || saving}
                  >
                    {saving ? 'Speichern...' : 'Weiter → Aufgaben wählen'}
                  </button>
                </div>
              </>
            )}

            {/* ── SCHRITT 2: Aufgaben verwalten (Erstellen + Bearbeiten) ── */}
            {(createStep === 'tasks' || editingTemplate) && (
              <>
                {/* Name bearbeiten */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vorlagenname</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="input"
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {editingTemplate && (
                      <button className="btn btn-ghost" onClick={updateTemplateName} style={{ padding: '0 12px', whiteSpace: 'nowrap', fontSize: '13px' }}>
                        Umbenennen
                      </button>
                    )}
                  </div>
                </div>

                {/* Aufgabenliste */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Aufgaben ({templateTasks.length})
                    </label>
                  </div>

                  {/* Aufgabenliste scrollbar */}
                  <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '8px' }}>
                    {templateTasks.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                        Noch keine Aufgaben — füge Favoriten oder eigene Aufgaben hinzu.
                      </p>
                    ) : (
                      templateTasks.map((task, idx) => (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 10px', borderBottom: idx < templateTasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          {editingTaskId === task.id ? (
                            <input
                              autoFocus
                              className="input"
                              value={editingTaskTitle}
                              onChange={e => setEditingTaskTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') updateTask(task.id, editingTaskTitle)
                                if (e.key === 'Escape') { setEditingTaskId(null); setEditingTaskTitle('') }
                              }}
                              style={{ flex: 1, padding: '4px 8px', fontSize: '13px' }}
                            />
                          ) : (
                            <span style={{ flex: 1, fontSize: '13px' }}>{task.title}</span>
                          )}
                          {editingTaskId === task.id ? (
                            <>
                              <button className="btn btn-ghost" onClick={() => updateTask(task.id, editingTaskTitle)} style={{ padding: '3px 5px', color: 'var(--accent)' }}><Check size={13} /></button>
                              <button className="btn btn-ghost" onClick={() => { setEditingTaskId(null); setEditingTaskTitle('') }} style={{ padding: '3px 5px' }}><X size={13} /></button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-ghost" onClick={() => { setEditingTaskId(task.id); setEditingTaskTitle(task.title) }} style={{ padding: '3px 5px' }} title="Bearbeiten"><Edit size={12} /></button>
                              <button className="btn btn-ghost" onClick={() => moveTask(task.id, 'up')} disabled={idx === 0} style={{ padding: '3px 5px' }} title="Nach oben"><ArrowUp size={12} /></button>
                              <button className="btn btn-ghost" onClick={() => moveTask(task.id, 'down')} disabled={idx === templateTasks.length - 1} style={{ padding: '3px 5px' }} title="Nach unten"><ArrowDown size={12} /></button>
                              <button className="btn btn-ghost" onClick={() => deleteTask(task.id)} style={{ padding: '3px 5px', color: 'var(--danger)' }} title="Entfernen"><X size={13} /></button>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Manuell hinzufügen */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      className="input"
                      placeholder="Aufgabe manuell eingeben …"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTask()}
                      style={{ flex: 1, fontSize: '13px' }}
                    />
                    <button className="btn btn-ghost" onClick={addTask} disabled={!newTaskTitle.trim()} style={{ padding: '0 12px', whiteSpace: 'nowrap', fontSize: '13px' }}>
                      <Plus size={13} /> Hinzufügen
                    </button>
                  </div>

                  {/* Aus Favoriten hinzufügen – Button */}
                  <button
                    className="btn btn-ghost"
                    onClick={() => { setShowFavPicker(v => !v); setSelectedFavIds(new Set()) }}
                    style={{ width: '100%', padding: '9px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px dashed var(--border)' }}
                  >
                    <Star size={14} style={{ color: '#f59e0b' }} />
                    {showFavPicker ? 'Auswahl schließen' : 'Aus Favoriten hinzufügen'}
                    {favorites.length > 0 && !showFavPicker && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({favorites.length} verfügbar)</span>
                    )}
                  </button>
                </div>

                {/* ── FAVORITEN-PICKER ── */}
                {showFavPicker && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' }}>
                    {/* Picker-Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        {selectedFavIds.size > 0 ? `${selectedFavIds.size} ausgewählt` : 'Favoriten auswählen'}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="btn btn-ghost" onClick={selectAllFavs} style={{ padding: '3px 8px', fontSize: '12px' }}>
                          Alle wählen
                        </button>
                        <button className="btn btn-ghost" onClick={() => setSelectedFavIds(new Set())} style={{ padding: '3px 8px', fontSize: '12px' }}>
                          Keine
                        </button>
                      </div>
                    </div>

                    {/* Favoritenliste */}
                    {favorites.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                        Keine Favoriten gespeichert. Geh zur Favoriten-Seite und füge welche hinzu.
                      </p>
                    ) : (
                      <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {favorites.map(fav => {
                          const alreadyIn = existingTitles.has(fav.title.toLowerCase())
                          const checked = selectedFavIds.has(fav.id)
                          return (
                            <label
                              key={fav.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '9px 14px', cursor: alreadyIn ? 'default' : 'pointer',
                                borderBottom: '1px solid var(--border)',
                                opacity: alreadyIn ? 0.45 : 1,
                                background: checked ? 'rgba(var(--accent-rgb, 59,130,246), 0.08)' : 'transparent',
                                transition: 'background 0.1s',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={alreadyIn}
                                onChange={() => !alreadyIn && toggleFav(fav.id)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: alreadyIn ? 'default' : 'pointer' }}
                              />
                              <span style={{ fontSize: '14px', flex: 1 }}>{fav.title}</span>
                              {alreadyIn && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>bereits drin</span>}
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {/* Picker-Footer */}
                    {selectedFavIds.size > 0 && (
                      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: 'var(--bg-secondary)' }}>
                        <button className="btn btn-ghost" onClick={() => { setShowFavPicker(false); setSelectedFavIds(new Set()) }} style={{ fontSize: '13px' }}>
                          Abbrechen
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={addSelectedFavorites}
                          disabled={saving}
                          style={{ fontSize: '13px' }}
                        >
                          {saving ? 'Hinzufügen...' : `${selectedFavIds.size} Aufgabe${selectedFavIds.size > 1 ? 'n' : ''} übernehmen`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Modal-Footer */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button className="btn btn-ghost" onClick={closeModal}>Schließen</button>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      await loadTemplates()
                      closeModal()
                    }}
                  >
                    Fertig
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 16px;
        }
        .modal {
          background: var(--bg-primary);
          border-radius: 16px; padding: 20px;
          width: 100%; max-width: 620px;
          max-height: 92vh; overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        }
        @media (max-width: 640px) {
          .modal { padding: 16px; border-radius: 12px; }
          .modal-overlay { align-items: flex-end; padding: 0; }
          .modal { border-bottom-left-radius: 0; border-bottom-right-radius: 0; max-height: 95vh; }
        }
      `}</style>
    </div>
  )
}
