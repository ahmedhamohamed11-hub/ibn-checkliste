'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import { Project, Task, ProjectParticipant, Comment, ActivityLog, TaskStatus } from '@/types'
import Navbar from '@/components/ui/Navbar'
import ProgressBar from '@/components/ui/ProgressBar'
import TaskCard from '@/components/TaskCard'
import ActivityModal from '@/components/ActivityModal'
import EditProjectModal from '@/components/EditProjectModal'
import AddTaskModal from '@/components/AddTaskModal'
import ManageParticipantsModal from '@/components/ManageParticipantsModal'
import {
  ArrowLeft, Plus, History, Settings, Users, ListPlus, Filter, Star, Trash2
} from 'lucide-react'

type FilterStatus = 'alle' | TaskStatus

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

  // ==================== FAVORITEN (localStorage) ====================
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedFavorite, setSelectedFavorite] = useState<string>('')
  const [newFavoriteName, setNewFavoriteName] = useState('')

  // Favoriten laden (pro Benutzer + Projekt)
  const loadFavorites = useCallback(() => {
    if (!userName || !id) return
    const key = `favorites_${userName}_${id}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const favs = JSON.parse(stored)
        setFavorites(favs)
        if (favs.length > 0 && !selectedFavorite) setSelectedFavorite(favs[0])
      } catch {
        setFavorites([])
      }
    } else {
      setFavorites([])
    }
  }, [userName, id, selectedFavorite])

  // Favoriten speichern
  const saveFavorites = (newFavs: string[]) => {
    if (!userName || !id) return
    const key = `favorites_${userName}_${id}`
    localStorage.setItem(key, JSON.stringify(newFavs))
    setFavorites(newFavs)
    if (newFavs.length > 0 && !selectedFavorite) setSelectedFavorite(newFavs[0])
    if (newFavs.length === 0) setSelectedFavorite('')
  }

  // Neuen Favoriten hinzufügen
  const addFavorite = () => {
    const trimmed = newFavoriteName.trim()
    if (!trimmed) return
    if (favorites.includes(trimmed)) {
      alert('Dieser Favorit existiert bereits')
      return
    }
    saveFavorites([...favorites, trimmed])
    setNewFavoriteName('')
    setSelectedFavorite(trimmed)
  }

  // Favorit löschen
  const removeFavorite = () => {
    if (!selectedFavorite) return
    const newFavs = favorites.filter(f => f !== selectedFavorite)
    saveFavorites(newFavs)
    if (newFavs.length > 0) setSelectedFavorite(newFavs[0])
    else setSelectedFavorite('')
  }

  // Aufgabe aus ausgewähltem Favoriten erstellen
  const addTaskFromSelectedFavorite = async () => {
    if (!selectedFavorite) return
    if (!id || !userName) return
    const maxPos = tasks.length > 0 ? Math.max(...tasks.map(t => t.position)) + 1 : 0
    const { error } = await supabase.from('tasks').insert({
      project_id: id,
      title: selectedFavorite,
      status: 'offen',
      created_by: userName,
      position: maxPos,
    })
    if (!error) {
      await supabase.from('activity_log').insert({
        project_id: id,
        actor: userName,
        action: 'Aufgabe aus Favorit hinzugefügt',
        detail: selectedFavorite,
      })
      loadTasks()
    }
  }

  // Favoriten bei Seitenladung laden
  useEffect(() => {
    if (userName && id) {
      loadFavorites()
    }
  }, [userName, id, loadFavorites])
  // ==================== ENDE FAVORITEN ====================

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
      action: `Aufgabe ${actionMap[newStatus]}`, detail: task.title,
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
      action: `${lines.length} Aufgaben importiert`, detail: lines.join(', '),
    })
    setListInput('')
    setShowListImport(false)
    loadTasks()
  }

  const isParticipant = participants.some(p => p.user_name === userName)
  const isCreator = project?.creator_name === userName

  // Sortierung: in_arbeit > offen > erledigt
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

  const statusFilters: { value: FilterStatus; label: string; count: number; color: string }[] = [
    { value: 'alle', label: 'Alle', count: tasks.length, color: 'var(--text-secondary)' },
    { value: 'offen', label: 'Offen', count: openCount, color: '#94a3b8' },
    { value: 'in_arbeit', label: 'In Arbeit', count: inWorkCount, color: '#f59e0b' },
    { value: 'erledigt', label: 'Erledigt', count: doneCount, color: '#10b981' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          Laden ...
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  )

  if (!project || !isParticipant) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Kein Zugriff</p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Du bist kein Teilnehmer dieses Projekts.</p>
        <button className="btn btn-ghost" onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px 40px 16px' }}>
        {/* Zurück + Titel */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', minHeight: 'auto', padding: '4px 0', marginBottom: '12px' }}
          >
            <ArrowLeft size={16} /> Dashboard
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 800 }}>
                {project.name}
              </h1>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                {project.commissioning_date && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    📅 {new Date(project.commissioning_date).toLocaleDateString('de-AT')}
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  👤 {project.creator_name}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => setShowActivity(true)} style={{ padding: '9px 12px', fontSize: '13px', minHeight: 'auto' }}>
                <History size={15} /> Verlauf
              </button>
              <button className="btn btn-ghost" onClick={() => setShowParticipants(true)} style={{ padding: '9px 12px', fontSize: '13px', minHeight: 'auto' }}>
                <Users size={15} /> Teilnehmer ({participants.length})
              </button>
              {isCreator && (
                <button className="btn btn-ghost" onClick={() => setShowEditProject(true)} style={{ padding: '9px 12px', fontSize: '13px', minHeight: 'auto' }}>
                  <Settings size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fortschrittsbalken */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
          <ProgressBar done={doneCount} total={tasks.length} />
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>⬜ {openCount} offen</span>
            <span style={{ fontSize: '12px', color: '#f59e0b' }}>🔶 {inWorkCount} in Arbeit</span>
            <span style={{ fontSize: '12px', color: '#10b981' }}>✅ {doneCount} erledigt</span>
          </div>
        </div>

        {/* ==================== NEUER FAVORITEN-BEREICH ==================== */}
        <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Star size={18} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Aufgabe aus Favorit</h3>
          </div>

          {favorites.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Noch keine Favoriten gespeichert. Erstelle unten einen neuen Favoriten.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
              <select
                className="input"
                value={selectedFavorite}
                onChange={(e) => setSelectedFavorite(e.target.value)}
                style={{ flex: '2', minWidth: '160px' }}
              >
                {favorites.map((fav, idx) => (
                  <option key={idx} value={fav}>{fav}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={addTaskFromSelectedFavorite} style={{ whiteSpace: 'nowrap' }}>
                <Plus size={14} style={{ marginRight: '4px' }} /> Aufgabe aus Favorit
              </button>
              <button className="btn btn-ghost" onClick={removeFavorite} style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                <Trash2 size={14} style={{ marginRight: '4px' }} /> Löschen
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
            <input
              className="input"
              placeholder="Neuen Favoriten speichern (z. B. Dokumentation prüfen)"
              value={newFavoriteName}
              onChange={(e) => setNewFavoriteName(e.target.value)}
              style={{ flex: 2, minWidth: '180px' }}
            />
            <button className="btn btn-secondary" onClick={addFavorite} style={{ whiteSpace: 'nowrap' }}>
              <Star size={14} style={{ marginRight: '4px' }} /> Als Favorit speichern
            </button>
          </div>
        </div>
        {/* ==================== ENDE FAVORITEN ==================== */}

        {/* Filter + Suche + Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, minHeight: 'auto',
                  background: filter === f.value ? 'var(--accent)' : 'transparent',
                  color: filter === f.value ? 'white' : f.color,
                  transition: 'all 0.15s',
                }}
              >
                {f.label} {f.count > 0 && <span style={{ opacity: 0.8 }}>({f.count})</span>}
              </button>
            ))}
          </div>

          <input
            className="input"
            placeholder="Aufgabe suchen ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '150px' }}
          />

          <button className="btn btn-primary" onClick={() => setShowAddTask(true)} style={{ padding: '10px 14px', minHeight: 'auto', whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Aufgabe
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => setShowListImport(!showListImport)}
            style={{ padding: '10px 12px', minHeight: 'auto' }}
            title="Liste einfügen"
          >
            <ListPlus size={16} />
          </button>
        </div>

        {/* Listen-Import-Box */}
        {showListImport && (
          <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
              Liste einfügen — eine Zeile = eine Aufgabe
            </p>
            <textarea
              className="input"
              value={listInput}
              onChange={e => setListInput(e.target.value)}
              placeholder={'Messprotokolle\nIP-Adresse einstellen\nAlarmweiterleitung testen'}
              rows={4}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '13px', marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleListImport} style={{ flex: 1, padding: '10px' }}>Importieren</button>
              <button className="btn btn-ghost" onClick={() => setShowListImport(false)} style={{ padding: '10px 14px' }}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Aufgabenliste mit Sortierung */}
        {filteredAndSortedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '15px', marginBottom: '8px' }}>
              {search ? 'Keine Aufgaben gefunden' : filter !== 'alle' ? `Keine ${filter === 'offen' ? 'offenen' : filter === 'in_arbeit' ? 'laufenden' : 'erledigten'} Aufgaben` : 'Noch keine Aufgaben'}
            </p>
            {filter === 'alle' && !search && (
              <button className="btn btn-primary" onClick={() => setShowAddTask(true)} style={{ marginTop: '8px' }}>
                <Plus size={15} /> Erste Aufgabe
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px' }}>
            {filteredAndSortedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                projectId={id}
                userName={userName!}
                onStatusChange={(status) => handleStatusChange(task, status)}
                onUpdated={loadTasks}
              />
            ))}
          </div>
        )}
      </main>

      {showActivity && <ActivityModal projectId={id} onClose={() => setShowActivity(false)} />}
      {showEditProject && project && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onUpdated={loadProject}
        />
      )}
      {showAddTask && (
        <AddTaskModal
          projectId={id}
          userName={userName!}
          nextPosition={tasks.length}
          onClose={() => setShowAddTask(false)}
          onCreated={loadTasks}
        />
      )}
      {showParticipants && (
        <ManageParticipantsModal
          projectId={id}
          participants={participants}
          isCreator={isCreator}
          currentUser={userName!}
          onClose={() => setShowParticipants(false)}
          onUpdated={loadParticipants}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  )
}