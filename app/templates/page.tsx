'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { PROJECT_TEMPLATES } from '@/lib/constants'
import Navbar from '@/components/ui/Navbar'
import { BookTemplate, ChevronRight } from 'lucide-react'

export default function TemplatesPage() {
  const { userName } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!userName) router.push('/')
  }, [userName])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <BookTemplate size={22} style={{ color: 'var(--accent-light)' }} />
          <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 800 }}>Projektvorlagen</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Wähle beim Erstellen eines Projekts eine Vorlage — Aufgaben werden automatisch übernommen.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(PROJECT_TEMPLATES).map(([name, tasks]) => (
            <div key={name} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: 700 }}>{name}</h2>
                <span style={{ color: 'var(--accent-light)', fontSize: '13px', fontWeight: 700 }}>
                  {tasks.length} Aufgaben
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {tasks.slice(0, 5).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t}</span>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', marginLeft: '13px' }}>
                    + {tasks.length - 5} weitere ...
                  </p>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => router.push('/dashboard')}
                style={{ marginTop: '14px', width: '100%', padding: '10px' }}
              >
                Neues Projekt mit dieser Vorlage <ChevronRight size={15} />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
