'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useUser } from '@/components/providers'
import { formatTime } from '@/lib/format'
import type { ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatProps {
  partyId: string
  currentUserId: string
}

/**
 * Chat efímero: solo miembros aprobados (o el host). Los mensajes se borran
 * en cascada cuando la previa expira. Realtime vía Supabase.
 */
export function Chat({ partyId, currentUserId }: ChatProps) {
  const { supabase } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Carga inicial + suscripción Realtime
  useEffect(() => {
    let active = true
    setMessages([])

    supabase
      .from('party_messages')
      .select('*')
      .eq('party_id', partyId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (active) setMessages((data as ChatMessage[] | null) ?? [])
      })

    const channel = supabase
      .channel(`chat-${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'party_messages',
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage])
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [supabase, partyId])

  // Auto-scroll al final
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = content.trim()
    if (!text || sending) return
    setSending(true)
    const { error } = await supabase.from('party_messages').insert({
      party_id: partyId,
      user_id: currentUserId,
      content: text.slice(0, 500),
    })
    if (error) {
      setSending(false)
      return
    }
    setContent('')
    setSending(false)
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <Sparkles className="h-4 w-4 text-neon-cyan" />
        <span className="text-xs font-bold uppercase tracking-wider">Chat efímero</span>
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          Se borra cuando expira la previa
        </span>
      </div>

      <div className="max-h-64 min-h-40 space-y-2.5 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nadie dijo nada todavía. Rompé el hielo 👇
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === currentUserId
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3.5 py-2',
                  mine
                    ? 'rounded-br-sm bg-primary/90 text-primary-foreground'
                    : 'rounded-bl-sm bg-white/[0.07] text-foreground'
                )}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10px] font-bold text-neon-cyan">
                    {m.sender_name ?? 'Alguien'}
                  </p>
                )}
                <p className="break-words text-sm leading-snug">{m.content}</p>
                <p className={cn('mt-1 text-right text-[9px]', mine ? 'text-black/60' : 'text-muted-foreground')}>
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        className="flex items-center gap-2 border-t border-white/5 p-2.5"
      >
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Mensaje al grupo…"
          maxLength={500}
          className="h-10 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-black shadow-neon-cyan transition-all active:scale-90 disabled:opacity-40"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
