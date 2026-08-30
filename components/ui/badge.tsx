import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-neon-pink',
        accent: 'border-transparent bg-accent/10 text-neon-cyan',
        outline: 'border-white/15 text-muted-foreground',
        success: 'border-transparent bg-zone-green/10 text-zone-green',
        warning: 'border-transparent bg-zone-yellow/10 text-zone-yellow',
        destructive: 'border-transparent bg-zone-red/10 text-zone-red',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
