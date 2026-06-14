'use client'

import { useState } from 'react'
import { Project } from '@/types'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'

interface Props {
  project: Project
  onClose: () => void
  onUpdated: () => void
}

export default function EditProjectModal({ project, onClose, onUpdated }: Props) {
  const [name, setName] = useState(project.name)
  const [date, setDate] = useState(project.commissioning_date?.split('T')[0] || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    await supabase.from('projects').update({
      name: name.trim(),
      commissioning_date: date || null,
    }).eq('id', project.id)
    setLoading(false)
    onUpdated()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800 }}>Projekt bearbeiten</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', minHeight: 'auto' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Projektname
          </label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Inbetriebnahmedatum
          </label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || !name.trim()} style={{ flex: 2 }}>
            {loading ? 'Speichern ...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
