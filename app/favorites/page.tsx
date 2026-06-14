// app/favorites/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'
import { Star, Trash2, GripVertical } from 'lucide-react'

interface Favorite {
  id: string
  title: string
  position: number
}

export default function FavoritesPage() {
  const { userName } = useUser()
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userName) {
      router.push('/')
      return
    }
    loadFavorites()
  }, [userName])

  const loadFavorites = async () => {
    if (!userName) return
    setLoading(true)
    const { data, error } = await supabase
      .from('favorites')
      .select('id, title, position')
      .eq('user_name', userName)
      .order('position', { ascending: true })
    if (error) {
      console.error('Fehler beim Laden der Favoriten:', error)
    } else {
      setFavorites(data || [])
    }
    setLoading(false)
  }

  const addFavorite = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    const maxPos = favorites.length > 0 ? Math.max(...favorites.map(f => f.position)) + 1 : 0
    const { error } = await supabase.from('favorites').insert({
      user_name: userName,
      title: newTitle.trim(),
      position: maxPos,
    })
    if (error) {
      console.error('Fehler beim Hinzufügen:', error)
    } else {
      setNewTitle('')
      loadFavorites()
    }
    setSaving(false)
  }

  const deleteFavorite = async (id: string) => {
    const { error } = await supabase.from('favorites').delete().eq('id', id)
    if (error) {
      console.error('Fehler beim Löschen:', error)
    } else {
      loadFavorites()
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px 80px 16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={24} style={{ color: '#f59e0b' }} /> Meine Favoriten
        </h1>

        {/* Liste der Favoriten */}
        {favorites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Star size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>Keine Favoriten gespeichert.</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Erstelle beim Anlegen einer Aufgabe einen Favoriten.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {favorites.map((fav) => (
              <div key={fav.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <GripVertical size={16} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 500 }}>{fav.title}</span>
                </div>
                <button
                  onClick={() => deleteFavorite(fav.id)}
                  className="btn btn-ghost"
                  style={{ padding: '6px', minHeight: 'auto', color: 'var(--danger)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Neuen Favoriten hinzufügen */}
        <div className="card" style={{ padding: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Neuen Favoriten hinzufügen</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="z. B. Messprotokolle erstellen"
              style={{ flex: 2 }}
            />
            <button className="btn btn-primary" onClick={addFavorite} disabled={saving || !newTitle.trim()}>
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); }}
      `}</style>
    </div>
  )
}
