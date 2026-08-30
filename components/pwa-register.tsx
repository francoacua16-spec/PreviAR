'use client'

import { useEffect } from 'react'

/** Registra el service worker solo en producción (en dev rompe el HMR). */
export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // El SW es progresivo: no bloqueamos nada si falla
      })
    }
  }, [])

  return null
}
