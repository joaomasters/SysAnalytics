import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Props {
  titulo: string
  valor: ReactNode
  detalhe?: ReactNode
  Icone: LucideIcon
  destaque?: 'neutro' | 'positivo' | 'negativo' | 'risco'
  carregando?: boolean
}

/** Indicador no formato "tile": filete de cor à esquerda, rótulo pequeno e número grande. */
const FILETE = {
  neutro: 'border-l-primary',
  positivo: 'border-l-emerald-600',
  negativo: 'border-l-red-600',
  risco: 'border-l-orange-600',
}
const ICONE = {
  neutro: 'text-primary',
  positivo: 'text-emerald-700',
  negativo: 'text-red-700',
  risco: 'text-orange-700',
}

export function KpiCard({ titulo, valor, detalhe, Icone, destaque = 'neutro', carregando }: Props) {
  return (
    <Card className={cn('border-l-4', FILETE[destaque])}>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">{titulo}</p>
          {carregando ? (
            <Skeleton className="h-8 w-36" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{valor}</p>
          )}
          {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
        </div>
        <Icone className={cn('mt-0.5 size-5 shrink-0', ICONE[destaque])} aria-hidden />
      </div>
    </Card>
  )
}
