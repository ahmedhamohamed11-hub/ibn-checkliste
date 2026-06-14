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
  ArrowLeft, Plus, History, Settings, Users, ListPlus, Filter
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
  const [showFavorites, setShowFavorites] = useState(false)

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
 {const addFavoritesToProject = async () => {
  const { data } = await supabase
    .from('favorites')
    .select('*')

  if (!data?.length) return

  const maxPos =
    tasks.length > 0
      ? Math.max(...tasks.map(t => t.position)) + 1
      : 0

  await supabase.from('tasks').insert(
    data.map((fav, index) => ({
      project_id: id,
      title: fav.title,
      status: 'offen',
      created_by: userName,
      position: maxPos + index,
    }))
  )

  loadTasks()
  setShowFavorites(false)
}
  const handleListImport = async ()
  
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

  const filteredTasks = tasks.filter(t => {
    const matchFilter = filter === 'alle' || t.status === filter
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

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
     {showFavorites && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
    }}
  >
    <div
      className="card"
      style={{
        width: '90%',
        maxWidth: '400px',
        padding: '20px',
      }}
    >
      <h3>Favoriten hinzufügen</h3>

      <p style={{ marginTop: '10px', marginBottom: '20px' }}>
        Alle Favoriten als Aufgaben übernehmen.
      </p>

      <button
        className="btn btn-primary"
        onClick={addFavoritesToProject}
        style={{ width: '100%', marginBottom: '10px' }}
      >
        Hinzufügen
      </button>

      <button
        className="btn btn-ghost"
        onClick={() => setShowFavorites(false)}
        style={{ width: '100%' }}
      >
        Abbrechen
      </button>
    </div>
  </div>
)}
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
<button
  className="btn btn-ghost"
  onClick={() => setShowFavorites(true)}
  style={{ padding: '10px 14px', minHeight: 'auto' }}
>
  ⭐ Favoriten
</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Back + title */}
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

        {/* Progress */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
          <ProgressBar done={doneCount} total={tasks.length} />
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>⬜ {openCount} offen</span>
            <span style={{ fontSize: '12px', color: '#f59e0b' }}>🔶 {inWorkCount} in Arbeit</span>
            <span style={{ fontSize: '12px', color: '#10b981' }}>✅ {doneCount} erledigt</span>
          </div>
        </div>

        {/* Filters + search + add */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status filter tabs */}
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
            <button
  className="btn btn-ghost"
  onClick={addFavoritesToProject}
>
  ⭐ Favoriten
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

        {/* List import box */}
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

       {/* Task list */}
{filteredTasks.length === 0 ? (
  <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
    <p style={{ fontSize: '15px', marginBottom: '8px' }}>
      Keine Aufgaben gefunden
    </p>
  </div>
) : (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

    {/* IN ARBEIT */}
    {filteredTasks.some(t => t.status === 'in_arbeit') && (
      <>
        <div
          style={{
            background: 'rgba(245,158,11,0.15)',
            color: '#f59e0b',
            padding: '10px 14px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '16px',
          }}
        >
          🔶 In Arbeit
        </div>

        {filteredTasks
          .filter(t => t.status === 'in_arbeit')
          .map(task => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={id}
              userName={userName!}
              onStatusChange={(status) => handleStatusChange(task, status)}
              onUpdated={loadTasks}
            />
          ))}
      </>
    )}

    {/* OFFEN */}
    {filteredTasks.some(t => t.status === 'offen') && (
      <>
        <div
          style={{
            background: 'rgba(148,163,184,0.15)',
            color: '#94a3b8',
            padding: '10px 14px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '16px',
            marginTop: '8px',
          }}
        >
          ⬜ Offen
        </div>

        {filteredTasks
          .filter(t => t.status === 'offen')
          .map(task => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={id}
              userName={userName!}
              onStatusChange={(status) => handleStatusChange(task, status)}
              onUpdated={loadTasks}
            />
          ))}
      </>
    )}

    {/* ERLEDIGT */}
    {filteredTasks.some(t => t.status === 'erledigt') && (
      <>
        <div
          style={{
            background: 'rgba(16,185,129,0.15)',
            color: '#10b981',
            padding: '10px 14px',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '16px',
            marginTop: '8px',
          }}
        >
          ✅ Erledigt
        </div>

        {filteredTasks
          .filter(t => t.status === 'erledigt')
          .map(task => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={id}
              userName={userName!}
              onStatusChange={(status) => handleStatusChange(task, status)}
              onUpdated={loadTasks}
            />
          ))}
      </>
    )}

  </div>
)}
}
