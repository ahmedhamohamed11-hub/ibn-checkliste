'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'
import { BookTemplate, ChevronRight, Plus, Edit, Trash2, Save, X, ArrowLeft, GripVertical } from 'lucide-react'

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
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('created_by', userName)
      .order('created_at', { ascending: false })
    if (!error && data) setTemplates(data)
    setLoading(false)
  }

  const loadTemplateTasks = async (templateId: string) => {
    const { data, error } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', templateId)
      .order('position', { ascending: true })
    if (!error && data) setTemplateTasks(data)
    else setTemplateTasks([])
  }

  const openCreate = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateDescription('')
    setTemplateTasks([])
    setNewTaskTitle('')
    setEditingTaskId(null)
    setShowCreateModal(true)
  }

  const openEdit = (template: Template) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateDescription(template.description || '')
    loadTemplateTasks(template.id)
    setNewTaskTitle('')
    setEditingTaskId(null)
    setShowCreateModal(true)
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingTemplate(null)
    setTemplateTasks([])
  }

  const saveTemplate = async () => {
    if (!userName) return
    if (!templateName.trim()) {
      alert('Bitte einen Namen eingeben')
      return
    }
    setSaving(true)

    if (editingTemplate) {
      // Update existing template
      await supabase
        .from('templates')
        .update({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTemplate.id)
    } else {
      // Create new template
      const { data: newTemplate, error } = await supabase
        .from('templates')
        .insert({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          created_by: userName
        })
        .select()
        .single()
      if (error) {
        console.error(error)
        setSaving(false)
        return
      }
      setEditingTemplate(newTemplate)
    }
    await loadTemplates()
    if (!editingTemplate) {
      // After creation, we are now in edit mode for the new template
      // Reload tasks (empty) and keep modal open
      if (editingTemplate) {
        await loadTemplateTasks(editingTemplate.id)
      }
    }
    setSaving(false)
    if (!editingTemplate) {
      // For new template, we stay in modal to add tasks
      // But we need to reload the template list and set editingTemplate to the new one
      const { data: newT } = await supabase
        .from('templates')
        .select('*')
        .eq('created_by', userName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (newT) {
        setEditingTemplate(newT)
        setTemplateName(newT.name)
        setTemplateDescription(newT.description || '')
      }
    }
  }

  const addTask = async () => {
    if (!newTaskTitle.trim() || !editingTemplate) return
    const maxPos = templateTasks.length > 0 ? Math.max(...templateTasks.map(t => t.position)) + 1 : 0
    const { data, error } = await supabase
      .from('template_tasks')
      .insert({
        template_id: editingTemplate.id,
        title: newTaskTitle.trim(),
        position: maxPos,
      })
      .select()
      .single()
    if (!error && data) {
      setTemplateTasks([...templateTasks, data])
    }
    setNewTaskTitle('')
  }

  const updateTaskTitle = async (taskId: string, newTitle: string) => {
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
    const newList = [...templateTasks]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const tempPos = newList[index].position
    newList[index].position = newList[swapIndex].position
    newList[swapIndex].position = tempPos
    await Promise.all([
      supabase.from('template_tasks').update({ position: newList[index].position }).eq('id', newList[index].id),
      supabase.from('template_tasks').update({ position: newList[swapIndex].position }).eq('id', newList[swapIndex].id)
    ])
    setTemplateTasks(newList.sort((a, b) => a.position - b.position))
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen? Alle enthaltenen Aufgaben werden ebenfalls gelöscht.')) return
    await supabase.from('templates').delete().eq('id', id)
    await loadTemplates()
    if (editingTemplate?.id === id) closeModal()
  }

  const createProjectFromTemplate = async (templateId: string, templateName: string) => {
    if (!userName) return
    setCreatingProject(templateId)
    try {
      // 1. Projekt erstellen
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: `${templateName} (${new Date().toLocaleDateString()})`,
          creator_name: userName,
          archived: false,
        })
        .select()
        .single()
      if (projectError || !newProject) throw new Error('Projekt konnte nicht erstellt werden')

      // 2. Teilnehmer hinzufügen
      await supabase.from('project_participants').insert({
        project_id: newProject.id,
        user_name: userName,
      })

      // 3. Aufgaben aus Vorlage kopieren
      const { data: templateTasks } = await supabase
        .from('template_tasks')
        .select('title, description, position')
        .eq('template_id', templateId)
        .order('position')
      if (templateTasks && templateTasks.length > 0) {
        await supabase.from('tasks').insert(
          templateTasks.map(t => ({
            project_id: newProject.id,
            title: t.title,
            description: t.description,
            status: 'offen',
            created_by: userName,
            position: t.position,
          }))
        )
      }
      // Zur Projektseite navigieren
      router.push(`/project/${newProject.id}`)
    } catch (err) {
      console.error(err)
      alert('Fehler beim Erstellen des Projekts')
    } finally {
      setCreatingProject(null)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Laden...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookTemplate size={22} style={{ color: 'var(--accent-light)' }} />
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Projektvorlagen</h1>
          </div>
          <button className="btn btn-primary" onClick={openCreate} style={{ padding: '6px 12px' }}>
            <Plus size={14} /> Neue Vorlage
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Erstelle wiederverwendbare Aufgabenlisten. Beim Erstellen eines Projekts kannst du eine Vorlage auswählen.
        </p>

        {templates.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Keine Vorlagen vorhanden</p>
            <button className="btn btn-secondary" onClick={openCreate} style={{ marginTop: '12px' }}>Erste Vorlage erstellen</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {templates.map(template => (
              <div key={template.id} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 700 }}>{template.name}</h2>
                    {template.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{template.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-ghost" onClick={() => openEdit(template)} style={{ padding: '4px 8px' }} title="Bearbeiten">
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-ghost" onClick={() => deleteTemplate(template.id)} style={{ padding: '4px 8px', color: 'var(--danger)' }} title="Löschen">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  {/* Aufgabenliste (max 5) */}
                  {templateTasks.length === 0 && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Keine Aufgaben in dieser Vorlage.</p>
                  )}
                  {/* Hier müssten wir die Aufgaben für dieses Template laden – vereinfacht: Zeige nur Anzahl */}
                  {/* Wir laden nicht alle Tasks für jede Vorlage, daher nur Anzahl anzeigen */}
                  <span style={{ fontSize: '13px', color: 'var(--accent-light)' }}>
                    {template.id === editingTemplate?.id ? templateTasks.length : '...'} Aufgaben
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => createProjectFromTemplate(template.id, template.name)}
                  disabled={creatingProject === template.id}
                  style={{ width: '100%', padding: '10px' }}
                >
                  {creatingProject === template.id ? 'Wird erstellt...' : 'Neues Projekt mit dieser Vorlage'} <ChevronRight size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal zum Erstellen/Bearbeiten einer Vorlage */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
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
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                  {templateTasks.map((task, idx) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <GripVertical size={14} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                      {editingTaskId === task.id ? (
                        <input
                          autoFocus
                          defaultValue={task.title}
                          onBlur={e => updateTaskTitle(task.id, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && updateTaskTitle(task.id, (e.target as HTMLInputElement).value)}
                          style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                        />
                      ) : (
                        <span style={{ flex: 1 }}>{task.title}</span>
                      )}
                      <button className="btn btn-ghost" onClick={() => setEditingTaskId(task.id)} style={{ padding: '2px 6px' }}><Edit size={12} /></button>
                      <button className="btn btn-ghost" onClick={() => moveTask(task.id, 'up')} disabled={idx === 0} style={{ padding: '2px 6px' }}>↑</button>
                      <button className="btn btn-ghost" onClick={() => moveTask(task.id, 'down')} disabled={idx === templateTasks.length - 1} style={{ padding: '2px 6px' }}>↓</button>
                      <button className="btn btn-ghost" onClick={() => deleteTask(task.id)} style={{ padding: '2px 6px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
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

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn btn-ghost" onClick={closeModal}>Abbrechen</button>
              <button className="btn btn-primary" onClick={saveTemplate} disabled={!templateName.trim() || saving}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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
          max-width: 550px;
          box-shadow: 0 20px 35px rgba(0,0,0,0.2);
        }
        @media (max-width: 480px) {
          .modal {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}
