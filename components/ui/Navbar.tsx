'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useTheme } from '@/hooks/useTheme'
import { Thermometer, LayoutDashboard, Star, BookTemplate, Moon, Sun, LogOut, ChevronDown } from 'lucide-react'
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
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/favorites', label: 'Favoriten', icon: <Star size={18} /> },
    { href: '/templates', label: 'Vorlagen', icon: <BookTemplate size={18} /> },
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
      {/* Desktop top bar */}
      <header style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', height: '56px', gap: '8px' }}>
          {/* Logo */}
          <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', minHeight: 'auto', padding: '4px 8px', borderRadius: '8px' }}>
            <div style={{ background: 'var(--accent)', borderRadius: '8px', padding: '6px', display: 'flex' }}>
              <Thermometer size={18} color="white" />
            </div>
            <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '16px', display: 'none' }} className="sm-show">
              IBN-Check
            </span>
          </button>

          {/* Nav links */}
          <nav style={{ display: 'flex', gap: '4px', marginLeft: '8px', flex: 1 }}>
            {nav.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: active ? 'var(--accent-glow)' : 'transparent',
                    color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 500, fontSize: '14px',
                    minHeight: 'auto', transition: 'all 0.15s',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', minHeight: 'auto', display: 'flex', alignItems: 'center' }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, minHeight: 'auto' }}
              >
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 800 }}>
                  {userName?.charAt(0).toUpperCase()}
                </div>
                {userName}
                <ChevronDown size={14} />
              </button>

              {showUserMenu && (
                <div style={{ position: 'absolute', right: 0, top: '42px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '8px', minWidth: '200px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100 }}>
                  {editingName ? (
                    <div style={{ padding: '8px' }}>
                      <input
                        className="input"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Neuer Name"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        style={{ marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary" onClick={handleRename} style={{ flex: 1, padding: '8px' }}>Speichern</button>
                        <button className="btn btn-ghost" onClick={() => setEditingName(false)} style={{ flex: 1, padding: '8px' }}>Abbrechen</button>
                      </div>
                    </div>
                  ) : (
                    <>
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
        </div>
      </header>

      {/* Click-outside to close */}
      {showUserMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setShowUserMenu(false)} />
      )}
    </>
  )
}
