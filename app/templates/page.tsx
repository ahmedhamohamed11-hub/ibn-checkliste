// app/templates/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'
import { BookTemplate, ChevronRight, Edit, Trash2, Plus, X, ArrowUp, ArrowDown } from 'lucide-react'

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
  const [saving, setSaving] = useState(false)
  const [creatingProject, setCreatingProject] = useState<string | null>(null)

  useEffect(() => {
    if (!userName) {
      router.push('/')
      return
    }
    loadTemplates()
  }, [userName])

  const loadTemplates = async () => {
    if (!userName) return
    setLoading(true)
    // Vorlagen laden
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('created_by', userName)
      .order('created_at', { ascending: false })
    if (!error && data) {
      setTemplates(data)
      // Aufgaben für jede Vorlage laden
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
    await loadTemplateTasks(template.id)
  }

  const closeEdit = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateDescription('')
    setTemplateTasks([])
    setNewTaskTitle('')
    setEditingTaskId(null)
    setShowCreateModal(false)
  }

  const saveTemplate = async () => {
    if (!userName) return
    if (!templateName.trim()) return
    setSaving(true)

    if (editingTemplate) {
      await supabase
        .from('templates')
        .update({ name: templateName, description: templateDescription, updated_at: new Date().toISOString() })
        .eq('id', editingTemplate.id)
    } else {
      const { data } = await supabase
        .from('templates')
        .insert({ name: templateName, description: templateDescription, created_by: userName })
        .select()
        .single()
      if (data) {
        setEditingTemplate(data)
        await loadTemplateTasks(data.id)
      }
    }
    await loadTemplates()
    setSaving(false)
    if (!editingTemplate) {
      setShowCreateModal(false)
      closeEdit()
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen? Alle Aufgaben werden ebenfalls gelöscht.')) return
    await supabase.from('templates').delete().eq('id', id)
    await loadTemplates()
    if (editingTemplate?.id === id) closeEdit()
  }

  const addTask = async () => {
    if (!newTaskTitle.trim() || !editingTemplate) return
    const maxPos = templateTasks.length > 0 ? Math.max(...templateTasks.map(t => t.position)) + 1 : 0
    const { data } = await supabase
      .from('template_tasks')
      .insert({
        template_id: editingTemplate.id,
        title: newTaskTitle.trim(),
        position: maxPos,
      })
      .select()
      .single()
    if (data) setTemplateTasks([...templateTasks, data])
    setNewTaskTitle('')
  }

  const updateTask = async (taskId: string, newTitle: string) => {
    await supabase.from('template_tasks').update({ title: newTitle }).eq('id', taskId)
    setTemplateTasks(templateTasks.map(t => t.id === taskId ? { ...t, title: newTitle } : t))
    setEditingTaskId(null)
  }

  const deleteTask = async (taskId: string) => {
    await supabase.from('template_tasks').delete().eq('id', taskId)
    setTemplateTasks(templateTasks.filter(t => t.id !== taskId))
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

  const createProjectFromTemplate = async (template: Template) => {
    if (!userName) return
    setCreatingProject(template.id)
    try {
      // 1. Projekt erstellen
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: template.name,
          commissioning_date: null,
          creator_name: userName,
          archived: false,
        })
        .select()
        .single()
      if (projectError || !newProject) throw new Error('Projekt konnte nicht erstellt werden')
      // 2. Teilnehmer (Ersteller) hinzufügen
      await supabase.from('project_participants').insert({
        project_id: newProject.id,
        user_name: userName,
      })
      // 3. Aufgaben der Vorlage kopieren
      const { data: tasks } = await supabase
        .from('template_tasks')
        .select('title, description, position')
        .eq('template_id', template.id)
        .order('position')
      if (tasks && tasks.length > 0) {
        await supabase.from('tasks').insert(
          tasks.map(t => ({
            project_id: newProject.id,
            title: t.title,
            description: t.description,
            status: 'offen',
            created_by: userName,
            position: t.position,
          }))
        )
      }
      router.push(`/project/${newProject.id}`)
    } catch (err) {
      console.error(err)
      alert('Fehler beim Erstellen des Projekts')
    } finally {
      setCreatingProject(null)
    }
  }

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookTemplate size={22} style={{ color: 'var(--accent-light)' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Projektvorlagen</h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ padding: '6px 12px' }}>
            <Plus size={16} /> Neue Vorlage
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Wähle beim Erstellen eines Projekts eine Vorlage — Aufgaben werden automatisch übernommen.
        </p>

        {templates.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BookTemplate size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p>Keine Vorlagen vorhanden</p>
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
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost" onClick={() => openEdit(template)} style={{ padding: '4px 8px' }}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-ghost" onClick={() => deleteTemplate(template.id)} style={{ padding: '4px 8px', color: 'var(--danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Aufgabenliste – genau wie in der alten Version */}
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
                    style={{ marginTop: '0', width: '100%', padding: '10px' }}
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

      {/* Modal zum Erstellen/Bearbeiten einer Vorlage */}
      {(showCreateModal || editingTemplate) && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h3>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <input
              className="input"
              placeholder="Name *"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              style={{ marginBottom: '12px' }}
            />
            <textarea
              className="input"
              placeholder="Beschreibung (optional)"
              value={templateDescription}
              onChange={e => setTemplateDescription(e.target.value)}
              rows={2}
              style={{ marginBottom: '16px', resize: 'vertical' }}
            />

            {editingTemplate && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Aufgaben</h4>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                  {templateTasks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>Keine Aufgaben</p>}
                  {templateTasks.map((task, idx) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      {editingTaskId === task.id ? (
                        <input
                          autoFocus
                          defaultValue={task.title}
                          onBlur={e => updateTask(task.id, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && updateTask(task.id, (e.target as HTMLInputElement).value)}
                          style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
                        />
                      ) : (
                        <span style={{ flex: 1 }}>{task.title}</span>
                      )}
                      <button className="btn btn-ghost" onClick={() => setEditingTaskId(task.id)} style={{ padding: '2px 4px' }}><Edit size={12} /></button>
                      <button className="btn btn-ghost" onClick={() => moveTask(task.id, 'up')} disabled={idx === 0} style={{ padding: '2px 4px' }}><ArrowUp size={12} /></button>
                      <button className="btn btn-ghost" onClick={() => moveTask(task.id, 'down')} disabled={idx === templateTasks.length - 1} style={{ padding: '2px 4px' }}><ArrowDown size={12} /></button>
                      <button className="btn btn-ghost" onClick={() => deleteTask(task.id)} style={{ padding: '2px 4px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="input"
                    placeholder="Neue Aufgabe"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-secondary" onClick={addTask}>Hinzufügen</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={closeEdit}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveTemplate} disabled={!templateName.trim() || saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal {
          background: var(--bg-primary);
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          max-width: 600px;
          box-shadow: 0 20px 35px rgba(0,0,0,0.2);
        }
        @media (max-width: 640px) {
          .modal {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}