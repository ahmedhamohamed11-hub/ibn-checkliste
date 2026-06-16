'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useTheme } from '@/hooks/useTheme'
import { Thermometer, Zap, Wind, Sun, Moon } from 'lucide-react'

export default function LoginPage() {
  const { userName, setUserName, isLoading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && userName) router.push('/dashboard')
  }, [userName, isLoading, router])

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

  // Während geprüft wird, ob bereits ein Name gespeichert ist, nichts anzeigen
  // (verhindert kurzes Aufblitzen des Login-Formulars beim App-Start)
  if (isLoading || userName) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      />
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Theme Toggle oben rechts */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          zIndex: 100,
          transition: 'all 0.2s',
        }}
        aria-label="Theme wechseln"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full" style={{ maxWidth: '400px' }}>
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ background: 'var(--accent)', borderRadius: '14px', padding: '12px' }}>
              <Thermometer size={28} color="white" />
            </div>
          </div>
          <h1 style={{
            color: 'var(--text-primary)',
            fontSize: 'clamp(22px, 6vw, 28px)',
            fontWeight: 800,
            letterSpacing: '-0.5px'
          }}>
            IBN-Checkliste
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Kälte · Klima · Wärmepumpe
          </p>
        </div>

        {/* Login card */}
        <div className="card" style={{ padding: '28px' }}>
          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: '18px',
            fontWeight: 700,
            marginBottom: '20px'
          }}>
            Wer bist du?
          </h2>

          <div style={{ marginBottom: '8px' }}>
            <label style={{
              display: 'block',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Dein Name
            </label>
            <input
              className="input"
              type="text"
              placeholder="Name eingeben"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={handleKey}
              autoFocus
              autoCapitalize="words"
              autoComplete="off"   // ✅ verhindert Browser-Vorschläge
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

          <p style={{
            color: 'var(--text-muted)',
            fontSize: '12px',
            textAlign: 'center',
            marginTop: '12px'
          }}>
            Kein Passwort erforderlich
          </p>
        </div>

        {/* Feature chips */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '20px',
          flexWrap: 'wrap'
        }}>
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