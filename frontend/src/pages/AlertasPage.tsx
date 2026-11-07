import { AlertOctagon, AlertTriangle, BellOff, CheckCheck, Clock, Mail } from 'lucide-react'
import { useState } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { NivelRisco, Notificacao } from '@/api/types'
import { RiscoBadge } from '@/components/RiscoBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useContagemNaoLidas,
  useMarcarComoLida,
  useMarcarTodasComoLidas,
  useNotificacoes,
} from '@/hooks/queries'
import { formatDataHoraRelativa } from '@/lib/format'
import { cn } from '@/lib/utils'

const ICONE: Record<NivelRisco, { Icone: typeof Clock; cor: string }> = {
  SEM_RISCO: { Icone: Clock, cor: 'bg-emerald-100 text-emerald-700' },
  ALERTA: { Icone: Clock, cor: 'bg-yellow-100 text-yellow-800' },
  ATENCAO: { Icone: AlertTriangle, cor: 'bg-orange-100 text-orange-800' },
  CRITICO: { Icone: AlertOctagon, cor: 'bg-red-100 text-red-700' },
}

export function AlertasPage() {
  const [filtro, setFiltro] = useState<'todos' | 'naoLidos'>('todos')
  const { data, isLoading, isError, error } = useNotificacoes(filtro === 'naoLidos')
  const { data: naoLidas = 0 } = useContagemNaoLidas()
  const marcarTodas = useMarcarTodasComoLidas()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Central de alertas do vendedor</h2>
          <p className="text-sm text-muted-foreground">
            Eventos recebidos da fila <code className="rounded bg-muted px-1">q.notificacao.dashboard</code> ·{' '}
            {naoLidas} não lido(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            ariaLabel="Filtrar alertas"
            opcoes={[
              { valor: 'todos', rotulo: 'Todos' },
              { valor: 'naoLidos', rotulo: 'Não lidos' },
            ]}
            valor={filtro}
            onChange={setFiltro}
          />
          <Button
            variant="outline"
            onClick={() => marcarTodas.mutate()}
            disabled={naoLidas === 0 || marcarTodas.isPending}
          >
            <CheckCheck /> Marcar todos como lidos
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feed de inatividade</CardTitle>
          <CardDescription>
            Inatividades críticas (90+ dias) também disparam aviso prioritário ao vendedor via fila{' '}
            <code className="rounded bg-muted px-1">q.notificacao.email-vendedor</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isError && <p className="p-6 text-sm text-red-700">Erro ao carregar alertas: {mensagemDeErro(error)}</p>}
          {isLoading && (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {data?.conteudo.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-muted-foreground">
              <BellOff className="size-8" />
              <p className="font-medium text-foreground">Nenhum alerta por aqui</p>
              <p className="text-sm">
                Execute a análise de inatividade na tela de Clientes para gerar alertas a partir da régua de churn.
              </p>
            </div>
          )}
          <ol className="divide-y">
            {data?.conteudo.map((n) => <ItemFeed key={n.id} notificacao={n} />)}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

function ItemFeed({ notificacao: n }: { notificacao: Notificacao }) {
  const marcarLida = useMarcarComoLida()
  const { Icone, cor } = ICONE[n.nivel]

  return (
    <li className={cn('flex gap-4 px-5 py-4', !n.lida && 'bg-primary/[0.04]')}>
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cor)}>
        <Icone className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <RiscoBadge nivel={n.nivel} />
          {n.nivel === 'CRITICO' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="size-3.5" /> aviso enviado ao vendedor
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{formatDataHoraRelativa(n.criadaEm)}</span>
        </div>
        <p className={cn('text-sm', !n.lida && 'font-semibold')}>{n.mensagem}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Responsável: {n.vendedorNome ?? '—'}</p>
          {!n.lida && (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => marcarLida.mutate(n.id)}>
              Marcar como lido
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
