'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useTheme } from '@/hooks/useTheme'
import { Thermometer, LayoutDashboard, Star, BookTemplate, Moon, Sun, LogOut, ChevronDown, X } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { userName, setUserName } = useUser()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
    { href: '/favorites', label: 'Favoriten', icon: <Star size={22} /> },
    { href: '/templates', label: 'Vorlagen', icon: <BookTemplate size={22} /> },
  ]

  const handleRename = () => {
    if (newName.trim().length >= 2) {
      setUserName(newName.trim())
      setEditingName(false)
      setShowUserMenu(false)
    }
  }

  return (
    <>
      {/* ── TOP BAR ── */}
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div style={{
          width: '100%',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          height: '52px',
          gap: '8px',
        }}>
          {/* Logo */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              minHeight: 'auto', padding: '4px 6px', borderRadius: '8px',
            }}
          >
            <div style={{ background: 'var(--accent)', borderRadius: '8px', padding: '6px', display: 'flex' }}>
              <Thermometer size={18} color="white" />
            </div>
            <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '16px' }}>
              IBN-Check
            </span>
          </button>

          <div style={{ flex: 1 }} />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-secondary)', padding: '8px',
              borderRadius: '8px', cursor: 'pointer',
              minHeight: 'auto', display: 'flex', alignItems: 'center',
            }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* User button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
                color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600,
                minHeight: 'auto',
              }}
            >
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 800,
              }}>
                {userName?.charAt(0).toUpperCase()}
              </div>
              {/* Name nur auf größeren Screens */}
              <span className="hide-mobile">{userName}</span>
              <ChevronDown size={14} />
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '44px',
                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                borderRadius: '12px', padding: '8px', minWidth: '200px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
              }}>
                {editingName ? (
                  <div style={{ padding: '8px' }}>
                    <input
                      className="input"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Neuer Name"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleRename()}
                      style={{ marginBottom: '8px', fontSize: '15px' }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-primary" onClick={handleRename} style={{ flex: 1, padding: '8px' }}>
                        Speichern
                      </button>
                      <button className="btn btn-ghost" onClick={() => setEditingName(false)} style={{ flex: 1, padding: '8px' }}>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Angemeldet als</p>
                      <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{userName}</p>
                    </div>
                    <button
                      onClick={() => { setNewName(userName || ''); setEditingName(true) }}
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minHeight: 'auto' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      ✏️ Name ändern
                    </button>
                    <button
                      onClick={() => { router.push('/'); setShowUserMenu(false) }}
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 12px', borderRadius: '8px', color: 'var(--danger)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', minHeight: 'auto' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <LogOut size={14} /> Abmelden
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BOTTOM NAV (nur Mobile) ── */}
      <nav className="bottom-nav">
        {nav.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '3px', background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--accent-light)' : 'var(--text-muted)',
                padding: '8px 4px', minHeight: 'auto', transition: 'color 0.15s',
              }}
            >
              <div style={{
                padding: '6px 16px', borderRadius: '99px',
                background: active ? 'var(--accent-glow)' : 'transparent',
                transition: 'background 0.15s',
              }}>
                {item.icon}
              </div>
              <span style={{ fontSize: '11px', fontWeight: active ? 700 : 500 }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Spacer so content isn't hidden behind bottom nav on mobile */}
      <div
  className="bottom-nav-spacer"
  style={{
    height: '140px',
  }}
/>

      {/* Click-outside to close user menu */}
      {showUserMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setShowUserMenu(false)} />
      )}

      <style>{`
        /* Bottom nav: nur auf Mobile sichtbar */
        .bottom-nav {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
          z-index: 40;
          padding-bottom: env(safe-area-inset-bottom);
        }
        .bottom-nav-spacer {
          height: calc(70px + env(safe-area-inset-bottom));
        }
        .hide-mobile {
          display: none;
        }

        /* Auf Desktop: Bottom nav verstecken, Name zeigen */
        @media (min-width: 768px) {
          .bottom-nav { display: none; }
          .bottom-nav-spacer { display: none; }
          .hide-mobile { display: inline; }
        }
      `}</style>
    </>
  )
}
