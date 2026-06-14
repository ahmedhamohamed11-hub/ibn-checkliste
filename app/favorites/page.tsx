'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import { DEFAULT_FAVORITES } from '@/lib/constants'
import { Favorite } from '@/types'
import Navbar from '@/components/ui/Navbar'
import { Plus, Star, Trash2, Pencil, Check, X, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'

export default function FavoritesPage() {
  const { userName } = useUser()
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    if (!userName) { router.push('/'); return }
    loadFavorites()
  }, [userName])

  const loadFavorites = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_name', userName)
      .order('position')

    if (data && data.length > 0) {
      setFavorites(data)
    } else {
      // Seed default favorites for new user
      const defaults = DEFAULT_FAVORITES.map((title, i) => ({
        user_name: userName!, title, position: i,
      }))
      const { data: inserted } = await supabase.from('favorites').insert(defaults).select()
      if (inserted) setFavorites(inserted)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    const title = newTitle.trim()
    if (!title) return
    const maxPos = favorites.length > 0 ? Math.max(...favorites.map(f => f.position)) + 1 : 0
    const { data } = await supabase
      .from('favorites')
      .insert({ user_name: userName!, title, position: maxPos })
      .select().single()
    if (data) setFavorites(prev => [...prev, data])
    setNewTitle('')
  }

  const handleDelete = async (id: string) => {
    await supabase.from('favorites').delete().eq('id', id)
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  const handleRename = async (id: string) => {
    if (!editValue.trim()) return
    await supabase.from('favorites').update({ title: editValue.trim() }).eq('id', id)
    setFavorites(prev => prev.map(f => f.id === id ? { ...f, title: editValue.trim() } : f))
    setEditingId(null)
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = favorites.findIndex(f => f.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === favorites.length - 1) return

    const newFavs = [...favorites]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newFavs[idx], newFavs[swapIdx]] = [newFavs[swapIdx], newFavs[idx]]

    // Update positions
    const updated = newFavs.map((f, i) => ({ ...f, position: i }))
    setFavorites(updated)

    // Persist
    await Promise.all(updated.map(f =>
      supabase.from('favorites').update({ position: f.position }).eq('id', f.id)
    ))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main className="main-content" style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Star size={22} style={{ color: '#f59e0b' }} />
          <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 800 }}>Favoriten</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>({favorites.length})</span>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Diese Aufgaben werden beim Erstellen eines neuen Projekts automatisch vorgeschlagen.
        </p>

        {/* Add new */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input
            className="input"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Neuer Favorit ..."
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleAdd} disabled={!newTitle.trim()} style={{ minHeight: 'auto', padding: '10px 16px' }}>
            <Plus size={16} /> Hinzufügen
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Laden ...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {favorites.map((fav, idx) => (
              <div
                key={fav.id}
                className="card"
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                {/* Position buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleMove(fav.id, 'up')}
                    style={{ background: 'none', border: 'none', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: idx === 0 ? 'default' : 'pointer', minHeight: 'auto', padding: '2px', opacity: idx === 0 ? 0.3 : 1 }}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => handleMove(fav.id, 'down')}
                    style={{ background: 'none', border: 'none', color: idx === favorites.length - 1 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: idx === favorites.length - 1 ? 'default' : 'pointer', minHeight: 'auto', padding: '2px', opacity: idx === favorites.length - 1 ? 0.3 : 1 }}
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>

                <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '24px', textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>

                {editingId === fav.id ? (
                  <input
                    className="input"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(fav.id); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                ) : (
                  <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '14px' }}>{fav.title}</span>
                )}

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {editingId === fav.id ? (
                    <>
                      <button onClick={() => handleRename(fav.id)} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', minHeight: 'auto', padding: '4px' }}>
                        <Check size={15} />
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', minHeight: 'auto', padding: '4px' }}>
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(fav.id); setEditValue(fav.title) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', minHeight: 'auto', padding: '4px' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(fav.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', minHeight: 'auto', padding: '4px' }}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
