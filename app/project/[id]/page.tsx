'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import { Project, Task, ProjectParticipant, TaskStatus } from '@/types'
import Navbar from '@/components/ui/Navbar'
import ProgressBar from '@/components/ui/ProgressBar'
import TaskCard from '@/components/TaskCard'
import ActivityModal from '@/components/ActivityModal'
import EditProjectModal from '@/components/EditProjectModal'
import ManageParticipantsModal from '@/components/ManageParticipantsModal'
import {
  ArrowLeft, Plus, History, Settings, Users, ListPlus, Star
} from 'lucide-react'

type FilterStatus = 'alle' | TaskStatus

// ==================== ADD TASK MODAL (kompakte Größe) ====================
interface AddTaskModalProps {
  projectId: string
  userName: string
  nextPosition: number
  onClose: () => void
  onCreated: () => void
}

function AddTaskModal({ projectId, userName, nextPosition, onClose, onCreated }: AddTaskModalProps) {
  const [mode, setMode] = useState<'manual' | 'favorite'>('manual')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saveAsFavorite, setSaveAsFavorite] = useState(false)
  const [favorites, setFavorites] = useState<{ id: string; title: string }[]>([])
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingFavorites, setLoadingFavorites] = useState(true)

  const loadFavorites = useCallback(async () => {
    if (!userName) return
    setLoadingFavorites(true)
    const { data, error } = await supabase
      .from('favorites')
      .select('id, title')
      .eq('user_name', userName)
      .order('position', { ascending: true })
    if (!error && data) {
      setFavorites(data)
      if (data.length > 0 && !selectedFavoriteId) setSelectedFavoriteId(data[0].id)
    } else {
      setFavorites([])
    }
    setLoadingFavorites(false)
  }, [userName, selectedFavoriteId])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)

    const { error: taskError } = await supabase.from('tasks').insert({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || null,
      status: 'offen',
      created_by: userName,
      position: nextPosition,
    })

    if (taskError) {
      console.error('Fehler beim Erstellen der Aufgabe:', taskError)
      setLoading(false)
      return
    }

    await supabase.from('activity_log').insert({
      project_id: projectId,
      actor: userName,
      action: 'Aufgabe hinzugefügt',
      detail: title.trim(),
    })

    if (saveAsFavorite) {
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_name', userName)
        .ilike('title', title.trim())
        .maybeSingle()

      if (!existing) {
        const { data: maxPosData } = await supabase
          .from('favorites')
          .select('position')
          .eq('user_name', userName)
          .order('position', { ascending: false })
          .limit(1)
        const nextPos = maxPosData && maxPosData.length > 0 ? maxPosData[0].position + 1 : 0
        await supabase.from('favorites').insert({
          user_name: userName,
          title: title.trim(),
          position: nextPos,
        })
      }
    }

    onCreated()
    onClose()
    setLoading(false)
  }

  const handleCreateFromFavorite = async () => {
    if (!selectedFavoriteId) return
    const selected = favorites.find(f => f.id === selectedFavoriteId)
    if (!selected) return

    setLoading(true)
    const { error } = await supabase.from('tasks').insert({
      project_id: projectId,
      title: selected.title,
      description: null,
      status: 'offen',
      created_by: userName,
      position: nextPosition,
    })

    if (error) {
      console.error('Fehler beim Erstellen aus Favorit:', error)
      setLoading(false)
      return
    }

    await supabase.from('activity_log').insert({
      project_id: projectId,
      actor: userName,
      action: 'Aufgabe aus Favorit hinzugefügt',
      detail: selected.title,
    })

    onCreated()
    onClose()
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Neue Aufgabe</h3>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <input type="radio" name="taskMode" checked={mode === 'manual'} onChange={() => setMode('manual')} />
            <span>Manuell</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <input type="radio" name="taskMode" checked={mode === 'favorite'} onChange={() => setMode('favorite')} />
            <span>Aus Favoriten</span>
          </label>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleCreateManual}>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel *"
              autoFocus
              style={{ marginBottom: '12px', fontSize: '14px', padding: '8px 10px' }}
            />
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung (optional)"
              rows={2}
              style={{ marginBottom: '12px', fontSize: '13px', resize: 'vertical', padding: '8px 10px' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontSize: '13px' }}>
              <input type="checkbox" checked={saveAsFavorite} onChange={(e) => setSaveAsFavorite(e.target.checked)} />
              <span>Als Favorit speichern</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 12px', fontSize: '13px' }}>Abbrechen</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !title.trim()} style={{ padding: '6px 12px', fontSize: '13px' }}>
                {loading ? '…' : 'Erstellen'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {loadingFavorites ? (
              <p style={{ fontSize: '13px' }}>Lade Favoriten…</p>
            ) : favorites.length === 0 ? (
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>Keine Favoriten vorhanden.</p>
            ) : (
              <>
                <select
                  className="input"
                  value={selectedFavoriteId}
                  onChange={(e) => setSelectedFavoriteId(e.target.value)}
                  style={{ width: '100%', fontSize: '14px', padding: '8px 10px', marginBottom: '16px' }}
                >
                  {favorites.map((fav) => (
                    <option key={fav.id} value={fav.id}>{fav.title}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 12px', fontSize: '13px' }}>Abbrechen</button>
                  <button className="btn btn-primary" onClick={handleCreateFromFavorite} disabled={loading} style={{ padding: '6px 12px', fontSize: '13px' }}>
                    {loading ? '…' : 'Übernehmen'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
// ==================== ENDE ADD TASK MODAL ====================

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const { userName } = useUser()
  const router = useRouter()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [participants, setParticipants] = useState<ProjectParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('alle')
  const [search, setSearch] = useState('')

  const [showActivity, setShowActivity] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [listInput, setListInput] = useState('')
  const [showListImport, setShowListImport] = useState(false)
  const [importingFavorites, setImportingFavorites] = useState(false)

  useEffect(() => {
    if (!userName) { router.push('/'); return }
    loadAll()
  }, [id, userName])

  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`project-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${id}` }, () => loadTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${id}` }, () => loadProject())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_participants', filter: `project_id=eq.${id}` }, () => loadParticipants())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadProject(), loadTasks(), loadParticipants()])
    setLoading(false)
  }

  const loadProject = async () => {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single()
    if (data) setProject(data)
  }

  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('project_id', id).order('position')
    if (data) setTasks(data)
  }

  const loadParticipants = async () => {
    const { data } = await supabase.from('project_participants').select('*').eq('project_id', id)
    if (data) setParticipants(data)
  }

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    const updates: Partial<Task> = {
      status: newStatus,
      modified_by: userName,
    }
    if (newStatus === 'erledigt') updates.completed_by = userName!
    else if (task.status === 'erledigt') updates.completed_by = null

    await supabase.from('tasks').update(updates).eq('id', task.id)

    const actionMap = { offen: 'auf Offen gesetzt', in_arbeit: 'in Bearbeitung', erledigt: 'erledigt' }
    await supabase.from('activity_log').insert({
      project_id: id, task_id: task.id, actor: userName,
      action: `Aufgabe ${actionMap[newStatus]}`,
      detail: task.title,
    })
    loadTasks()
  }

  const handleListImport = async () => {
    const lines = listInput.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    const maxPos = tasks.length > 0 ? Math.max(...tasks.map(t => t.position)) + 1 : 0
    await supabase.from('tasks').insert(
      lines.map((title, i) => ({
        project_id: id, title, status: 'offen',
        created_by: userName, position: maxPos + i,
      }))
    )
    await supabase.from('activity_log').insert({
      project_id: id, actor: userName,
      action: `${lines.length} Aufgaben importiert`,
      detail: lines.join(', '),
    })
    setListInput('')
    setShowListImport(false)
    loadTasks()
  }

  // NEU: Alle Favoriten des Benutzers auf einmal importieren
  const handleImportAllFavorites = async () => {
    if (!userName) return
    setImportingFavorites(true)
    try {
      // Alle Favoriten des Benutzers laden
      const { data: favorites, error } = await supabase
        .from('favorites')
        .select('title')
        .eq('user_name', userName)
        .order('position', { ascending: true })
      if (error) throw error
      if (!favorites || favorites.length === 0) {
        alert('Keine Favoriten vorhanden. Erstelle zuerst Favoriten über das Aufgaben-Modal.')
        return
      }

      const maxPos = tasks.length > 0 ? Math.max(...tasks.map(t => t.position)) + 1 : 0
      const newTasks = favorites.map((fav, idx) => ({
        project_id: id,
        title: fav.title,
        status: 'offen',
        created_by: userName,
        position: maxPos + idx,
      }))
      const { error: insertError } = await supabase.from('tasks').insert(newTasks)
      if (insertError) throw insertError

      await supabase.from('activity_log').insert({
        project_id: id,
        actor: userName,
        action: `${favorites.length} Favoriten als Aufgaben importiert`,
        detail: favorites.map(f => f.title).join(', '),
      })
      loadTasks()
      alert(`${favorites.length} Aufgaben aus Favoriten erstellt.`)
    } catch (err) {
      console.error(err)
      alert('Fehler beim Importieren der Favoriten.')
    } finally {
      setImportingFavorites(false)
    }
  }

  const isParticipant = participants.some(p => p.user_name === userName)
  const isCreator = project?.creator_name === userName

  const statusOrder = { in_arbeit: 0, offen: 1, erledigt: 2 }
  const filteredAndSortedTasks = tasks
    .filter(t => {
      const matchFilter = filter === 'alle' || t.status === filter
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
      return matchFilter && matchSearch
    })
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  const doneCount = tasks.filter(t => t.status === 'erledigt').length
  const inWorkCount = tasks.filter(t => t.status === 'in_arbeit').length
  const openCount = tasks.filter(t => t.status === 'offen').length

  const statusFilters = [
    { value: 'alle', label: 'Alle', count: tasks.length, color: 'var(--text-secondary)' },
    { value: 'offen', label: 'Offen', count: openCount, color: '#94a3b8' },
    { value: 'in_arbeit', label: 'In Arbeit', count: inWorkCount, color: '#f59e0b' },
    { value: 'erledigt', label: 'Erledigt', count: doneCount, color: '#10b981' },
  ] as const

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div>Laden...</div>
      </div>
    </div>
  )

  if (!project || !isParticipant) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p>Kein Zugriff</p>
        <button className="btn btn-ghost" onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px 40px' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginBottom: '12px' }}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{project.name}</h1>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                {project.commissioning_date && <span style={{ fontSize: '13px' }}>📅 {new Date(project.commissioning_date).toLocaleDateString('de-AT')}</span>}
                <span style={{ fontSize: '13px' }}>👤 {project.creator_name}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={() => setShowActivity(true)} style={{ padding: '6px 10px', fontSize: '12px' }}><History size={14} /> Verlauf</button>
              <button className="btn btn-ghost" onClick={() => setShowParticipants(true)} style={{ padding: '6px 10px', fontSize: '12px' }}><Users size={14} /> Teilnehmer</button>
              {isCreator && <button className="btn btn-ghost" onClick={() => setShowEditProject(true)} style={{ padding: '6px 10px' }}><Settings size={14} /></button>}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="card" style={{ padding: '12px 16px', marginBottom: '16px' }}>
          <ProgressBar done={doneCount} total={tasks.length} />
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px' }}>
            <span>⬜ {openCount} offen</span>
            <span>🔶 {inWorkCount} in Arbeit</span>
            <span>✅ {doneCount} erledigt</span>
          </div>
        </div>

        {/* Filter & Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px' }}>
            {statusFilters.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)} style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                background: filter === f.value ? 'var(--accent)' : 'transparent',
                color: filter === f.value ? 'white' : f.color,
              }}>{f.label} ({f.count})</button>
            ))}
          </div>
          <input className="input" placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: '140px', fontSize: '13px', padding: '6px 10px' }} />
          <button className="btn btn-primary" onClick={() => setShowAddTask(true)} style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}><Plus size={14} /> Aufgabe</button>
          <button className="btn btn-secondary" onClick={handleImportAllFavorites} disabled={importingFavorites} style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}>
            <Star size={14} /> {importingFavorites ? '…' : 'Alle Favoriten'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowListImport(!showListImport)} style={{ padding: '6px 12px' }} title="Liste importieren"><ListPlus size={16} /></button>
        </div>

        {showListImport && (
          <div className="card" style={{ padding: '12px', marginBottom: '16px' }}>
            <textarea className="input" value={listInput} onChange={e => setListInput(e.target.value)} placeholder="Eine Aufgabe pro Zeile" rows={3} style={{ marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleListImport}>Importieren</button>
              <button className="btn btn-ghost" onClick={() => setShowListImport(false)}>Abbrechen</button>
            </div>
          </div>
        )}

        {filteredAndSortedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <p>Keine Aufgaben</p>
            {filter === 'alle' && !search && <button className="btn btn-primary" onClick={() => setShowAddTask(true)}>Erste Aufgabe</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px' }}>
            {filteredAndSortedTasks.map(task => (
              <TaskCard key={task.id} task={task} projectId={id} userName={userName!} onStatusChange={(status) => handleStatusChange(task, status)} onUpdated={loadTasks} />
            ))}
          </div>
        )}
      </main>

      {showActivity && <ActivityModal projectId={id} onClose={() => setShowActivity(false)} />}
      {showEditProject && project && <EditProjectModal project={project} onClose={() => setShowEditProject(false)} onUpdated={loadProject} />}
      {showAddTask && <AddTaskModal projectId={id} userName={userName!} nextPosition={tasks.length} onClose={() => setShowAddTask(false)} onCreated={loadTasks} />}
      {showParticipants && <ManageParticipantsModal projectId={id} participants={participants} isCreator={isCreator} currentUser={userName!} onClose={() => setShowParticipants(false)} onUpdated={loadParticipants} />}

      <style>{`
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: var(--bg-primary); border-radius: 16px; padding: 20px; width: 90%; max-width: 480px; box-shadow: 0 20px 35px rgba(0,0,0,0.2); }
      `}</style>
    </div>
  )
}
