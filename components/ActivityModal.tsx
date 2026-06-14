'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ActivityLog } from '@/types'
import { X, History } from 'lucide-react'

interface Props {
  projectId: string
  onClose: () => void
}

export default function ActivityModal({ projectId, onClose }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setLogs(data)
    setLoading(false)
  }

  const getActionIcon = (action: string) => {
    if (action.includes('erstellt')) return '📝'
    if (action.includes('bearbeitet')) return '✏️'
    if (action.includes('erledigt')) return '✅'
    if (action.includes('Kommentar')) return '💬'
    if (action.includes('importiert')) return '📋'
    if (action.includes('Offen')) return '⬜'
    if (action.includes('Bearbeitung')) return '🔶'
    return '📌'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} /> Aktivitätsverlauf
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', minHeight: 'auto', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Laden ...</div>
        ) : logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>Noch keine Aktivitäten</p>
        ) : (
          <div style={{ maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {logs.map(log => (
              <div key={log.id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-hover)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{getActionIcon(log.action)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                    <strong style={{ color: 'var(--accent-light)' }}>{log.actor}</strong> hat {log.action.toLowerCase()}
                    {log.detail && (
                      <span style={{ color: 'var(--text-secondary)' }}> — „{log.detail}"</span>
                    )}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                    {new Date(log.created_at).toLocaleDateString('de-AT')} um {new Date(log.created_at).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })} Uhr
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
