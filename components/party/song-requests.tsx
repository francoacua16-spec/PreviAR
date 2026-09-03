'use client'

import { useCallback, useEffect, useState } from 'react'
import { Disc3, Loader2, Music, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUser } from '@/components/providers'
import { addSongRequest, deleteSongRequest, friendlyError, listSongRequests } from '@/lib/api'
import { MAX_SONGS_PER_PERSON, genreEmoji, genreLabel } from '@/lib/constants'
import type { SongRequestRow } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SongRequestsProps {
  partyId: string
  /** Géneros de la previa. Un tema solo entra si cae en uno de estos. */
  genres: string[]
  isHost: boolean
}

/**
 * Cola de temas para el DJ. Cada uno suma hasta {@link MAX_SONGS_PER_PERSON},
 * siempre etiquetados con un género de la previa — el RPC rechaza el resto con
 * BAD_SONG_GENRE. Es opcional: la previa funciona igual sin nadie pidiendo nada.
 */
export function SongRequests({ partyId, genres, isHost }: SongRequestsProps) {
  const { supabase } = useUser()

  const [songs, setSongs] = useState<SongRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [genre, setGenre] = useState(genres[0] ?? '')

  const mine = songs.filter((s) => s.is_mine).length
  const full = mine >= MAX_SONGS_PER_PERSON

  const load = useCallback(() => {
    listSongRequests(supabase, partyId)
      .then(setSongs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [supabase, partyId])

  useEffect(() => {
    load()
  }, [load])

  // Si el anfitrión saca un género, el RPC borra los temas huérfanos: hay que
  // recargar para no dejar en pantalla algo que ya no existe en la base.
  useEffect(() => {
    if (!genres.includes(genre)) setGenre(genres[0] ?? '')
  }, [genres, genre])

  // Realtime: la lista se llena mientras la previa arranca.
  useEffect(() => {
    const channel = supabase
      .channel(`songs-${partyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'party_song_requests', filter: `party_id=eq.${partyId}` },
        () => load()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, partyId, load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (adding) return
    if (title.trim().length < 2) {
      toast.error('Poné el nombre del tema.')
      return
    }
    if (!genre) {
      toast.error('Elegí a qué género de la previa entra.')
      return
    }
    setAdding(true)
    try {
      await addSongRequest(supabase, partyId, {
        title: title.trim(),
        artist: artist.trim() ? artist.trim() : null,
        genre,
      })
      setTitle('')
      setArtist('')
      setOpen(false)
      load()
      toast.success('Tema anotado 🎧')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSongRequest(supabase, id)
      setSongs((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <header className="flex items-center justify-between gap-2">
        <h3 className="type-title flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider">
          <Disc3 className="h-4 w-4 text-neon-lilac" /> Temas para el DJ
        </h3>
        <span className="text-[11px] text-muted-foreground/70">
          {songs.length} pedido{songs.length === 1 ? '' : 's'}
        </span>
      </header>

      <p className="type-caption mt-1 text-[11px] text-muted-foreground/75">
        Opcional. Hasta {MAX_SONGS_PER_PERSON} por persona, siempre dentro de los géneros de la
        previa.
      </p>

      {loading ? (
        <div className="flex justify-center py-5">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : songs.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground/60">
          Todavía no pidió nadie. Rompé el hielo 🎶
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {songs.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5"
            >
              <span aria-hidden className="text-base">
                {genreEmoji(s.genre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">{s.title}</p>
                <p className="truncate text-[11px] text-muted-foreground/70">
                  {s.artist ? `${s.artist} · ` : ''}
                  {genreLabel(s.genre)} · {s.is_mine ? 'vos' : s.user_name}
                </p>
              </div>
              {(s.is_mine || isHost) && (
                <button
                  type="button"
                  onClick={() => void handleDelete(s.id)}
                  aria-label={`Borrar ${s.title}`}
                  className="press shrink-0 rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-white/10 hover:text-zone-red"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form onSubmit={handleAdd} className="mt-3 space-y-2.5 rounded-xl bg-white/[0.03] p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="song-title">Tema</Label>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="press rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input
            id="song-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre del tema"
            maxLength={120}
            autoFocus
          />
          <Input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artista (opcional)"
            maxLength={120}
          />

          <div className="flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g)}
                aria-pressed={genre === g}
                className={cn(
                  'press rounded-full border px-3 py-1.5 text-[12px] font-semibold',
                  'transition-[background-color,border-color,color] duration-150',
                  genre === g
                    ? 'border-neon-lilac/70 bg-accent/15 text-neon-lilac'
                    : 'border-white/10 text-muted-foreground'
                )}
              >
                {genreEmoji(g)} {genreLabel(g)}
              </button>
            ))}
          </div>

          <Button type="submit" size="sm" className="press w-full" disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
            Pedir tema
          </Button>
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="press mt-3 w-full"
          onClick={() => setOpen(true)}
          disabled={full || genres.length === 0}
        >
          <Plus className="h-4 w-4" />
          {genres.length === 0
            ? 'La previa no definió géneros'
            : full
              ? `Ya pediste tus ${MAX_SONGS_PER_PERSON} temas`
              : `Pedir un tema (${mine}/${MAX_SONGS_PER_PERSON})`}
        </Button>
      )}
    </section>
  )
}
