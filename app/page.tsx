'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { Thermometer, Zap, Wind } from 'lucide-react'

export default function LoginPage() {
  const { userName, setUserName } = useUser()
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (userName) router.push('/dashboard')
  }, [userName, router])

  const handleLogin = () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Bitte Namen eingeben'); return }
    if (trimmed.length < 2) { setError('Name muss mindestens 2 Zeichen haben'); return }
    setUserName(trimmed)
    router.push('/dashboard')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ background: 'var(--accent)', borderRadius: '14px', padding: '12px' }}>
              <Thermometer size={28} color="white" />
            </div>
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            IBN-Checkliste
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Kälte · Klima · Wärmepumpe
          </p>
        </div>

        {/* Login card */}
        <div className="card" style={{ padding: '28px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
            Wer bist du?
          </h2>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dein Name
            </label>
            <input
              className="input"
              type="text"
              placeholder="z.B. Ahmed, Ali, Mustafa ..."
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={handleKey}
              autoFocus
              autoCapitalize="words"
              style={{ fontSize: '16px' }}
            />
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '6px' }}>{error}</p>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleLogin}
            style={{ width: '100%', marginTop: '16px', padding: '14px', fontSize: '16px' }}
          >
            Weiter →
          </button>

          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>
            Kein Passwort erforderlich
          </p>
        </div>

        {/* Feature chips */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          {[
            { icon: <Zap size={12} />, label: 'Echtzeit-Sync' },
            { icon: <Wind size={12} />, label: 'Offline-fähig' },
            { icon: <Thermometer size={12} />, label: 'Teamarbeit' },
          ].map(item => (
            <span key={item.label} className="chip">
              {item.icon} {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
