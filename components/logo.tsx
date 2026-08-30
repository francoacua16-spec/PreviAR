import { cn } from '@/lib/utils'

/** Logo de PreviAR: la "P" en forma de pin. */
export function PinLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="previar-pin-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF2D92" />
          <stop offset="100%" stopColor="#00F5FF" />
        </linearGradient>
      </defs>
      <circle cx="256" cy="208" r="118" fill="url(#previar-pin-g)" />
      <path d="M178 300 L334 300 L256 448 C244 424 236 412 232 404 C210 372 190 334 178 300 Z" fill="url(#previar-pin-g)" />
      <g fill="#0A0A0A">
        <rect x="210" y="140" width="32" height="160" rx="9" />
        <rect x="242" y="172" width="34" height="104" />
        <path d="M276 172 a52 52 0 0 1 0 104 z" />
      </g>
      <circle cx="252" cy="224" r="28" fill="url(#previar-pin-g)" />
    </svg>
  )
}

/** Wordmark: pin + nombre. */
export function Wordmark({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <PinLogo className={cn('h-9 w-9 drop-shadow-[0_0_10px_rgba(255,45,146,0.5)]', iconClassName)} />
      <span className="font-display text-lg font-bold tracking-tight brand-gradient-text">PreviAR</span>
    </div>
  )
}
