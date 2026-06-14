'use client'

import { useState } from 'react'
import { ProjectParticipant } from '@/types'
import { supabase } from '@/lib/supabase'
import { X, UserPlus, Trash2 } from 'lucide-react'

interface Props {
  projectId: string
  participants: ProjectParticipant[]
  isCreator: boolean
  currentUser: string
  onClose: () => void
  onUpdated: () => void
}

export default function ManageParticipantsModal({ projectId, participants, isCreator, currentUser, onClose, onUpdated }: Props) {
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name || participants.some(p => p.user_name === name)) return
    setLoading(true)
    await supabase.from('project_participants').insert({ project_id: projectId, user_name: name })
    setNewName('')
    setLoading(false)
    onUpdated()
  }

  const handleRemove = async (participant: ProjectParticipant) => {
    if (participant.user_name === currentUser) return
    await supabase.from('project_participants').delete().eq('id', participant.id)
    onUpdated()
  }

  const handleRename = async (participant: ProjectParticipant) => {
    const name = renameValue.trim()
    if (!name || name === participant.user_name) { setRenaming(null); return }
    await supabase.from('project_participants').update({ user_name: name }).eq('id', participant.id)
    setRenaming(null)
    onUpdated()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>Teilnehmer</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', minHeight: 'auto' }}>
            <X size={20} />
          </button>
        </div>

        {/* Participant list */}
        <div style={{ marginBottom: '16px' }}>
          {participants.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>
                {p.user_name.charAt(0).toUpperCase()}
              </div>
              {renaming === p.id ? (
                <input
                  className="input"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(p); if (e.key === 'Escape') setRenaming(null) }}
                  autoFocus
                  style={{ flex: 1 }}
                />
              ) : (
                <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
                  {p.user_name}
                  {p.user_name === currentUser && <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '6px' }}>(du)</span>}
                </span>
              )}
              {isCreator && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {renaming === p.id ? (
                    <>
                      <button onClick={() => handleRename(p)} className="btn btn-primary" style={{ padding: '6px 10px', minHeight: 'auto', fontSize: '12px' }}>OK</button>
                      <button onClick={() => setRenaming(null)} className="btn btn-ghost" style={{ padding: '6px 10px', minHeight: 'auto', fontSize: '12px' }}>Abb.</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setRenaming(p.id); setRenameValue(p.user_name) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', minHeight: 'auto', padding: '4px' }}
                      >
                        ✏️
                      </button>
                      {p.user_name !== currentUser && (
                        <button
                          onClick={() => handleRemove(p)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', minHeight: 'auto', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add participant */}
        {isCreator && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Namen eingeben ..."
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleAdd} disabled={loading || !newName.trim()} style={{ minHeight: 'auto', padding: '10px 14px' }}>
              <UserPlus size={16} />
            </button>
          </div>
        )}

        <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%', marginTop: '12px' }}>
          Schließen
        </button>
      </div>
    </div>
  )
}
