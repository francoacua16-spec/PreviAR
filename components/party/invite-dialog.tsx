'use client'

import { useEffect, useState } from 'react'
import { Copy, Loader2, MessageCircle, Printer, QrCode, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title: string
  /** Zona + ciudad, para que el cartel impreso diga dónde es sin dar la dirección. */
  place: string
  when: string
}

/**
 * Invitar: QR para imprimir o mostrar en pantalla, más el link.
 * El QR apunta a la misma URL pública de la previa — no expone la dirección:
 * quien lo escanea cae en la ficha y, si es privada, igual tiene que pedir entrar.
 */
export function InviteDialog({ open, onOpenChange, url, title, place, when }: InviteDialogProps) {
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !url) return
    let active = true
    QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      // Sobre papel el contraste manda: negro sobre blanco, no el tema oscuro.
      color: { dark: '#0A0A0A', light: '#FFFFFF' },
    })
      .then((out) => {
        if (active) setSvg(out)
      })
      .catch(() => {
        if (active) setSvg(null)
      })
    return () => {
      active = false
    }
  }, [open, url])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado 📋')
    } catch {
      toast.error('No pudimos copiar el link')
    }
  }

  async function shareNative() {
    const data = { title, text: `${title} — ${place}`, url }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        // El usuario canceló el share nativo: no es un error.
      }
      return
    }
    void copyLink()
  }

  function shareWhatsApp() {
    const text = `🍻 ${title}\n📍 ${place}\n🕐 ${when}\nEntrá acá 👇 ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  /**
   * Imprime en una ventana aparte en vez de `window.print()` sobre la app:
   * el diálogo vive en un portal y la página es oscura a pantalla completa,
   * así que imprimirla directo saldría negro y cortado.
   */
  function print() {
    if (!svg) return
    const w = window.open('', '_blank', 'width=720,height=900')
    if (!w) {
      toast.error('El navegador bloqueó la ventana de impresión.')
      return
    }
    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(title)} — PreviAR</title>
<style>
  @page { margin: 14mm; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #0A0A0A; text-align: center;
         display: flex; flex-direction: column; align-items: center; justify-content: center;
         min-height: 90vh; margin: 0; }
  h1 { font-size: 30px; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 6px; }
  p  { margin: 2px 0; font-size: 15px; color: #444; }
  .qr { width: 340px; max-width: 78vw; margin: 22px auto 10px; }
  .qr svg { width: 100%; height: auto; display: block; }
  .url { font-size: 12px; color: #666; word-break: break-all; margin-top: 4px; }
  .cta { margin-top: 14px; font-size: 17px; font-weight: 700; }
  .brand { margin-top: 26px; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #888; }
</style></head><body>
<h1>${esc(title)}</h1>
<p>${esc(place)}</p>
<p>${esc(when)}</p>
<div class="qr">${svg}</div>
<div class="cta">Escaneá y pedí entrar</div>
<p class="url">${esc(url)}</p>
<div class="brand">PreviAR</div>
</body></html>`)
    w.document.close()
    w.focus()
    // El QR ya está inline (no hay imágenes que esperar), pero damos un tick
    // para que Safari termine el layout antes de abrir el diálogo de impresión.
    setTimeout(() => w.print(), 250)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-neon-violet" /> Invitar
          </DialogTitle>
          <DialogDescription>
            Mostrá el QR o imprimilo. Quien lo escanea cae en la previa — la dirección igual
            queda protegida.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto w-full max-w-[240px] rounded-2xl bg-white p-3.5">
          {svg ? (
            <div
              className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
              // Generado local por `qrcode`, sin input externo: no hay superficie de XSS.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex aspect-square items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-black/40" />
            </div>
          )}
        </div>

        <p className="break-all text-center text-[11px] text-muted-foreground/70">{url}</p>

        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" className="press w-full" onClick={() => void copyLink()}>
            <Copy className="h-4 w-4 text-neon-lilac" /> Copiar link
          </Button>
          <Button variant="outline" className="press w-full" onClick={shareWhatsApp}>
            <MessageCircle className="h-4 w-4 text-zone-green" /> WhatsApp
          </Button>
          <Button variant="outline" className="press w-full" onClick={() => void shareNative()}>
            <Share2 className="h-4 w-4" /> Compartir
          </Button>
          <Button variant="outline" className="press w-full" onClick={print} disabled={!svg}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
