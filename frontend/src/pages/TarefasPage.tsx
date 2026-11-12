import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { StatusTarefa } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { TarefaItem } from '@/components/tarefas/TarefaItem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { useTarefas } from '@/hooks/queries'

export function TarefasPage() {
  const { temPerfil } = useAuth()
  const gestao = temPerfil('GESTOR', 'ADMIN')
  const [status, setStatus] = useState<StatusTarefa>('ABERTA')
  const [escopo, setEscopo] = useState<'minhas' | 'todas'>(gestao ? 'todas' : 'minhas')
  const { data, isLoading, isError, error } = useTarefas(status, escopo === 'minhas')

  const atrasadas = data?.filter((t) => t.atrasada).length ?? 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{gestao ? 'Tarefas do time' : 'Minhas tarefas'}</h2>
          <p className="text-sm text-muted-foreground">
            Próximos passos com os clientes. Crie tarefas a partir de um alerta ou na página do cliente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {gestao && (
            <SegmentedControl
              ariaLabel="Escopo das tarefas"
              opcoes={[
                { valor: 'todas', rotulo: 'Todo o time' },
                { valor: 'minhas', rotulo: 'Minhas' },
              ]}
              valor={escopo}
              onChange={setEscopo}
            />
          )}
          <SegmentedControl
            ariaLabel="Status das tarefas"
            opcoes={[
              { valor: 'ABERTA', rotulo: 'Abertas' },
              { valor: 'CONCLUIDA', rotulo: 'Concluídas' },
              { valor: 'CANCELADA', rotulo: 'Canceladas' },
            ]}
            valor={status}
            onChange={setStatus}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{status === 'ABERTA' ? 'Para fazer' : status === 'CONCLUIDA' ? 'Concluídas' : 'Canceladas'}</CardTitle>
          <CardDescription>
            {data ? `${data.length} tarefa(s)` : 'Carregando...'}
            {status === 'ABERTA' && atrasadas > 0 && ` · ${atrasadas} atrasada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isError && <p className="p-6 text-sm text-red-700">Erro ao carregar tarefas: {mensagemDeErro(error)}</p>}
          {isLoading && (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {data?.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-muted-foreground">
              <ClipboardCheck className="size-8" />
              <p className="font-medium text-foreground">Nada por aqui</p>
              <p className="text-sm">
                {status === 'ABERTA'
                  ? 'Nenhuma tarefa aberta. Use "Criar tarefa" em um alerta para começar.'
                  : 'Nenhuma tarefa neste status.'}
              </p>
            </div>
          )}
          <ol className="divide-y">{data?.map((t) => <TarefaItem key={t.id} tarefa={t} />)}</ol>
        </CardContent>
      </Card>
    </div>
  )
}
