export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function formatCountdown(expiresAtIso: string): string {
  const ms = new Date(expiresAtIso).getTime() - Date.now()
  if (ms <= 0) return 'Expiró'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h >= 1) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m} min`
}

/** Vibe de la joda según ocupación */
export function vibeOf(attendees: number, max: number): { emoji: string; label: string; tone: 'green' | 'yellow' | 'red' } {
  if (max <= 0) return { emoji: '🟢', label: 'Tranqui', tone: 'green' }
  const ratio = attendees / max
  if (attendees >= max) return { emoji: '🔴', label: 'Llena', tone: 'red' }
  if (ratio >= 0.66) return { emoji: '🔴', label: 'Explotó', tone: 'red' }
  if (ratio >= 0.34) return { emoji: '🟡', label: 'Se picó', tone: 'yellow' }
  return { emoji: '🟢', label: 'Tranqui', tone: 'green' }
}

export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
