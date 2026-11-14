import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        outline: 'text-foreground',
        neutro: 'border-slate-200 bg-slate-100 text-slate-700',
        ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        alerta: 'border-yellow-300 bg-yellow-100 text-yellow-900',
        atencao: 'border-orange-300 bg-orange-100 text-orange-900',
        critico: 'border-red-300 bg-red-100 text-red-800',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
