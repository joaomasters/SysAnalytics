import { AlertOctagon, AlertTriangle, CircleCheck, Clock } from 'lucide-react'
import type { NivelRisco } from '@/api/types'
import { Badge } from '@/components/ui/badge'

export const NIVEIS_RISCO: { valor: NivelRisco; rotulo: string; faixa: string }[] = [
  { valor: 'ALERTA', rotulo: 'Alerta', faixa: '30–59 dias' },
  { valor: 'ATENCAO', rotulo: 'Atenção', faixa: '60–89 dias' },
  { valor: 'CRITICO', rotulo: 'Crítico', faixa: '90+ dias' },
  { valor: 'SEM_RISCO', rotulo: 'Ativo', faixa: '< 30 dias' },
]

const CONFIG = {
  SEM_RISCO: { variant: 'ok', rotulo: 'Ativo', Icone: CircleCheck },
  ALERTA: { variant: 'alerta', rotulo: 'Alerta', Icone: Clock },
  ATENCAO: { variant: 'atencao', rotulo: 'Atenção', Icone: AlertTriangle },
  CRITICO: { variant: 'critico', rotulo: 'Crítico', Icone: AlertOctagon },
} as const

/** Badge de risco: cor + ícone + texto (nunca apenas cor). */
export function RiscoBadge({ nivel }: { nivel: NivelRisco }) {
  const { variant, rotulo, Icone } = CONFIG[nivel]
  return (
    <Badge variant={variant}>
      <Icone aria-hidden />
      {rotulo}
    </Badge>
  )
}
