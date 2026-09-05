'use client'

import { Clock, Navigation } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { formatDistanceMeters, haversineMeters } from '@/lib/distance'
import { isOpenNow } from '@/lib/opening-hours'
import { SHOP_EMOJI, SHOP_LABEL } from '@/lib/constants'
import type { ShopRow } from '@/lib/types'
import type { GeoPos } from './use-geolocation'

interface ShopSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shop: ShopRow | null
  pos: GeoPos | null
}

export function ShopSheet({ open, onOpenChange, shop, pos }: ShopSheetProps) {
  const state = shop ? isOpenNow(shop.opening_hours) : null
  const meters = shop && pos ? haversineMeters(pos, shop) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="pb-[max(env(safe-area-inset-bottom),1.25rem)]"
      >
        {shop && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span aria-hidden="true">{SHOP_EMOJI[shop.kind] ?? '🏪'}</span>
                {shop.name}
              </SheetTitle>
              <SheetDescription>
                {SHOP_LABEL[shop.kind] ?? 'Local'}
                {meters !== null && ` · a ${formatDistanceMeters(meters)}`}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                {/* Tres estados distintos, y el tercero importa: "no sabemos".
                    Decir "abierto" sin dato mandaría a alguien a un local
                    cerrado a las 3 de la mañana. */}
                {state ? (
                  <div className="space-y-1">
                    <Badge variant={state.open ? 'success' : 'outline'}>
                      {state.open ? 'Abierto ahora' : 'Cerrado ahora'}
                    </Badge>
                    {state.until && (
                      <p className="type-caption text-muted-foreground">
                        {state.open ? `Cierra ${state.until}` : `Abre ${state.until}`}
                      </p>
                    )}
                  </div>
                ) : shop.opening_hours ? (
                  <p className="text-sm text-muted-foreground">{shop.opening_hours}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Horario no cargado. Conviene chequear antes de salir.
                  </p>
                )}
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="press flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground"
              >
                <Navigation className="h-4 w-4" />
                Cómo llegar
              </a>

              <p className="type-caption text-[10px] text-muted-foreground">
                Datos de OpenStreetMap.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
