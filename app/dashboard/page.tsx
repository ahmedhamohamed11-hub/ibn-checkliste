'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import { Project, ProjectParticipant } from '@/types'
import Navbar from '@/components/ui/Navbar'
import ProgressBar from '@/components/ui/ProgressBar'
import CreateProjectModal from '@/components/CreateProjectModal'
import { Plus, Search, Archive, Copy, Trash2, FolderOpen, ArchiveRestore, X } from 'lucide-react'

interface ProjectWithStats extends Project {
  participants: ProjectParticipant[]
  task_count: number
  done_count: number
}

export default function DashboardPage() {
  const { userName } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  useEffect(() => {
    if (!userName) {
      router.push('/')
      return
    }
    loadProjects()
  }, [userName])

  useEffect(() => {
    if (!userName) return
    const channel = supabase
      .channel('dashboard-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_participants' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadProjects())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userName])

  const loadProjects = async () => {
    if (!userName) return
    setLoading(true)

    try {
      const { data: participantData } = await supabase
        .from('project_participants')
        .select('project_id')
        .eq('user_name', userName)

      const projectIds = participantData?.map(p => p.project_id) || []

      if (projectIds.length === 0) {
        setProjects([])
        return
      }

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false })

      if (!projectsData) {
        setProjects([])
        return
      }

      const [{ data: allParticipants }, { data: allTasks }] = await Promise.all([
        supabase.from('project_participants').select('*').in('project_id', projectIds),
        supabase.from('tasks').select('id, project_id, status').in('project_id', projectIds),
      ])

      const enriched: ProjectWithStats[] = projectsData.map(p => ({
        ...p,
        participants: allParticipants?.filter(pp => pp.project_id === p.id) || [],
        task_count: allTasks?.filter(t => t.project_id === p.id).length || 0,
        done_count: allTasks?.filter(t => t.project_id === p.id && t.status === 'erledigt').length || 0,
      }))

      setProjects(enriched)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async (id: string, archived: boolean) => {
    await supabase.from('projects').update({ archived: !archived }).eq('id', id)
    loadProjects()
  }

  const handleDuplicate = async (project: ProjectWithStats) => {
    const { data: newProject } = await supabase
      .from('projects')
      .insert({
        name: `${project.name} (Kopie)`,
        commissioning_date: project.commissioning_date,
        creator_name: userName,
        archived: false,
      })
      .select()
      .single()

    if (!newProject) return

    const { data: origParticipants } = await supabase
      .from('project_participants')
      .select('user_name')
      .eq('project_id', project.id)

    if (origParticipants && origParticipants.length > 0) {
      await supabase.from('project_participants').insert(
        origParticipants.map(p => ({
          project_id: newProject.id,
          user_name: p.user_name,
        }))
      )
    }

    const { data: origTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)
      .order('position')

    if (origTasks && origTasks.length > 0) {
      await supabase.from('tasks').insert(
        origTasks.map(t => ({
          project_id: newProject.id,
          title: t.title,
          description: t.description,
          status: 'offen',
          created_by: userName,
          position: t.position,
        }))
      )
    }

    loadProjects()
    router.push(`/project/${newProject.id}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const project = projects.find(p => p.id === deleteTarget)
    if (!project || deleteConfirmName !== project.name) return

    await supabase.from('activity_log').delete().eq('project_id', deleteTarget)
    await supabase.from('comments').delete().eq('project_id', deleteTarget)
    await supabase.from('tasks').delete().eq('project_id', deleteTarget)
    await supabase.from('project_participants').delete().eq('project_id', deleteTarget)
    await supabase.from('projects').delete().eq('id', deleteTarget)

    setDeleteTarget(null)
    setDeleteConfirmName('')
    loadProjects()
  }

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchArchived = p.archived === showArchived
    return matchSearch && matchArchived
  })

  const activeCount = projects.filter(p => !p.archived).length
  const archivedCount = projects.filter(p => p.archived).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ width: '100%', maxWidth: '100%', padding: '16px 16px 140px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 800 }}>
              Hallo, {userName} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              {activeCount} aktive{activeCount !== 1 ? 's' : ''} Projekt{activeCount !== 1 ? 'e' : ''}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '10px 14px', fontSize: '14px', borderRadius: '10px', whiteSpace: 'nowrap' }}
          >
            <Plus size={16} /> Neu
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            className="input"
            type="text"
            placeholder="Projekt suchen ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', fontSize: '15px' }}
          />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            padding: '3px',
            gap: '3px',
            marginBottom: '16px',
          }}
        >
          <button
            onClick={() => setShowArchived(false)}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              minHeight: 'auto',
              background: !showArchived ? 'var(--accent)' : 'transparent',
              color: !showArchived ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            Aktiv ({activeCount})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              minHeight: 'auto',
              background: showArchived ? 'var(--accent)' : 'transparent',
              color: showArchived ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            Archiv ({archivedCount})
          </button>
        </div>

        {/* Projects list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            Laden ...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FolderOpen size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600 }}>
              {search ? 'Keine Projekte gefunden' : showArchived ? 'Kein Archiv vorhanden' : 'Noch keine Projekte'}
            </p>
            {!showArchived && !search && (
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ marginTop: '16px' }}>
                <Plus size={16} /> Erstes Projekt erstellen
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(project => (
              <div
                key={project.id}
                className="card"
                style={{ padding: '16px', cursor: 'pointer', width: '100%' }}
                onClick={() => router.push(`/project/${project.id}`)}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '10px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px', flex: 1, paddingRight: '8px', lineHeight: 1.3 }}>
                    {project.name}
                  </h3>
                  {project.archived && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'rgba(245,158,11,0.15)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '99px',
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                      }}
                    >
                      Archiviert
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {project.commissioning_date && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      📅 {new Date(project.commissioning_date).toLocaleDateString('de-AT')}
                    </p>
                  )}
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    von {project.creator_name}
                  </p>
                </div>

                {/* Progress */}
                {project.task_count > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <ProgressBar done={project.done_count} total={project.task_count} />
                  </div>
                )}

                {/* Bottom row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border)',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Participants */}
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {project.participants.slice(0, 4).map(p => (
                      <span
                        key={p.id}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 800,
                          border: '2px solid var(--bg-card)',
                        }}
                      >
                        {p.user_name.charAt(0).toUpperCase()}
                      </span>
                    ))}
                    {project.participants.length > 4 && (
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'var(--border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        +{project.participants.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleArchive(project.id, project.archived)}
                      style={{ padding: '7px 10px', fontSize: '12px', minHeight: 'auto', gap: '4px' }}
                    >
                      {project.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                      <span style={{ display: 'none' }} className="btn-label">
                        {project.archived ? 'Wiederherstellen' : 'Archivieren'}
                      </span>
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleDuplicate(project)}
                      style={{ padding: '7px 10px', minHeight: 'auto' }}
                      title="Duplizieren"
                    >
                      <Copy size={13} />
                    </button>
                    {project.creator_name === userName && (
                      <button
                        className="btn"
                        onClick={() => {
                          setDeleteTarget(project.id)
                          setDeleteConfirmName('')
                        }}
                        style={{
                          padding: '7px 10px',
                          minHeight: 'auto',
                          background: 'rgba(239,68,68,0.1)',
                          color: 'var(--danger)',
                          border: '1px solid rgba(239,68,68,0.2)',
                        }}
                        title="Löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ margin: '0 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ color: 'var(--danger)', fontSize: '18px', fontWeight: 800 }}>
                ⚠️ Projekt löschen
              </h2>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '14px' }}>
              Dieser Vorgang kann <strong>nicht rückgängig</strong> gemacht werden.
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '6px' }}>
              Tippe den Projektnamen:
            </p>
            <p style={{ color: 'var(--accent-light)', fontWeight: 700, fontSize: '14px', marginBottom: '10px', wordBreak: 'break-word' }}>
              „{projects.find(p => p.id === deleteTarget)?.name}"
            </p>
            <input
              className="input"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder="Projektnamen eingeben ..."
              style={{ marginBottom: '14px', fontSize: '15px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} style={{ flex: 1 }}>
                Abbrechen
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleteConfirmName !== projects.find(p => p.id === deleteTarget)?.name}
                style={{ flex: 1, opacity: deleteConfirmName !== projects.find(p => p.id === deleteTarget)?.name ? 0.4 : 1 }}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false)
            router.push(`/project/${id}`)
          }}
          userName={userName!}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          main { padding: 24px 24px 140px 24px !important; max-width: 800px !important; margin: 0 auto !important; }
          .btn-label { display: inline !important; }
        }
      `}</style>
    </div>
  )
}
