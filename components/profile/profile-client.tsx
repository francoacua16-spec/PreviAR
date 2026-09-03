'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Camera, ChevronRight, Loader2, LogOut, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/components/providers'
import { friendlyError, startVerification, updateProfile, uploadAvatar } from '@/lib/api'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

export function ProfileClient() {
  const router = useRouter()
  const { user, profile, isAdmin, supabase, refreshProfile } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(
    profile?.display_name ?? user?.user_metadata?.full_name ?? ''
  )
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const initial = displayName?.[0] ?? user?.email?.[0] ?? '?'

  function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Elegí una imagen (jpg, png, etc).')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('La foto no puede pesar más de 5MB.')
      return
    }
    setPendingFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!user) return
    if (!displayName.trim()) {
      toast.error('Poné tu nombre.')
      return
    }
    // Foto obligatoria: o ya tenés una, o subís una ahora.
    if (!pendingFile && !profile?.avatar_url) {
      toast.error('Subí una foto de tu cara para completar el perfil 📸')
      return
    }

    setSaving(true)
    try {
      let avatar_url = profile?.avatar_url ?? undefined
      if (pendingFile) {
        avatar_url = await uploadAvatar(supabase, user.id, pendingFile)
      }
      await updateProfile(supabase, user.id, { display_name: displayName.trim(), avatar_url })
      await refreshProfile()
      setPendingFile(null)
      toast.success('Perfil actualizado ✅')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify() {
    setVerifying(true)
    try {
      const url = await startVerification()
      window.location.href = url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo iniciar la verificación.')
      setVerifying(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    toast('Chau 👋 Nos vemos el finde.')
    router.replace('/')
  }

  return (
    <div className="pb-tabbar min-h-dvh bg-background px-4 py-6">
      <h1 className="mb-1 font-display text-xl font-bold brand-gradient-text">Cuenta</h1>
      <p className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        {user?.email}
        {profile?.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon-lilac" />}
        <span aria-hidden>·</span>
        <span>Reputación {'⭐'.repeat(Math.min(profile?.reputation ?? 5, 5))}</span>
      </p>

      <div className="glass mb-4 flex flex-col items-center gap-4 rounded-3xl p-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-neon-violet to-neon-lilac"
          aria-label="Cambiar foto de perfil"
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="Tu foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-3xl font-bold text-black">{initial.toUpperCase()}</span>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handlePickPhoto}
        />
        <p className="text-center text-xs text-muted-foreground">
          Tocá la foto para {profile?.avatar_url ? 'cambiarla' : 'agregar tu cara'} 📸
        </p>

        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Tu nombre"
          maxLength={40}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-foreground outline-none focus:border-neon-violet"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
      </div>

      <div className="glass rounded-3xl p-6">
        <h2 className="mb-1 text-sm font-semibold">Verificación de identidad</h2>
        {profile?.verified ? (
          <div className="flex items-center gap-2 text-sm text-neon-lilac">
            <BadgeCheck className="h-5 w-5" /> Perfil verificado
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Verificá tu identidad para generar más confianza en las previas. Es gratis y rápido.
            </p>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 text-sm font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
              Verificar identidad
            </button>
          </>
        )}
      </div>

      {/* Lo que antes colgaba del avatar en el mapa. Un destino, un lugar. */}
      <div className="glass mt-4 overflow-hidden rounded-3xl">
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className="press flex w-full items-center gap-3 px-5 py-4 text-sm font-semibold text-neon-lilac transition-colors hover:bg-white/5"
          >
            <Shield className="h-4 w-4 shrink-0" /> Panel de control
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </button>
        )}
        <button
          onClick={handleSignOut}
          className={`press flex w-full items-center gap-3 px-5 py-4 text-sm font-semibold text-zone-red transition-colors hover:bg-white/5 ${
            isAdmin ? 'border-t border-white/5' : ''
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
