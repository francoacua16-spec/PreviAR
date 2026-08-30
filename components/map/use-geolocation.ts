'use client'

import { useEffect, useState } from 'react'

export interface GeoPos {
  lat: number
  lng: number
}

/** Ubicación del navegador con timeout, sin estado de error ruidoso. */
export function useGeolocation(): { pos: GeoPos | null; denied: boolean } {
  const [pos, setPos] = useState<GeoPos | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDenied(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setDenied(true),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    )
  }, [])

  return { pos, denied }
}
