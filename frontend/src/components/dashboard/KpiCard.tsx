import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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

const ICONE_COR = {
  neutro: 'bg-blue-50 text-blue-700',
  positivo: 'bg-emerald-50 text-emerald-700',
  negativo: 'bg-red-50 text-red-700',
  risco: 'bg-orange-50 text-orange-700',
}

export function KpiCard({ titulo, valor, detalhe, Icone, destaque = 'neutro', carregando }: Props) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
          {carregando ? (
            <Skeleton className="h-8 w-36" />
          ) : (
            <p className="text-xl font-bold tabular-nums tracking-tight 2xl:text-2xl">{valor}</p>
          )}
          {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', ICONE_COR[destaque])}>
          <Icone className="size-5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}
