import { AlertTriangle, DollarSign, Receipt, TrendingDown, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Granularidade, NivelRisco } from '@/api/types'
import { mensagemDeErro } from '@/api/client'
import { FaturamentoCustosChart } from '@/components/dashboard/FaturamentoCustosChart'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { SerieTabela } from '@/components/dashboard/SerieTabela'
import { TicketVendedorCard } from '@/components/dashboard/TicketVendedorCard'
import { NIVEIS_RISCO, RiscoBadge } from '@/components/RiscoBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { useKpis } from '@/hooks/queries'
import { formatBRL, formatData, formatPercentual } from '@/lib/format'

const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: 'DIARIO', rotulo: 'Diário' },
  { valor: 'SEMANAL', rotulo: 'Semanal' },
  { valor: 'MENSAL', rotulo: 'Mensal' },
  { valor: 'SEMESTRAL', rotulo: 'Semestral' },
]

// Ativos primeiro, depois as faixas em ordem crescente de gravidade
const RISCO_ORDEM = [NIVEIS_RISCO[3], ...NIVEIS_RISCO.slice(0, 3)]

export function DashboardPage() {
  const [granularidade, setGranularidade] = useState<Granularidade>('MENSAL')
  const [visao, setVisao] = useState<'grafico' | 'tabela'>('grafico')
  const { data, isLoading, isError, error, isFetching } = useKpis(granularidade)
  const r = data?.resumo

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visão executiva</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `Período de ${formatData(data.inicio)} a ${formatData(data.fim)}` : 'Carregando período...'}
            {isFetching && !isLoading && ' · atualizando...'}
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Granularidade temporal"
          opcoes={GRANULARIDADES}
          valor={granularidade}
          onChange={setGranularidade}
        />
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">
            Não foi possível carregar os KPIs: {mensagemDeErro(error)}. Verifique se o backend está em execução.
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <KpiCard
          titulo="Faturamento acumulado"
          Icone={DollarSign}
          carregando={isLoading}
          valor={r && formatBRL(r.faturamentoTotal)}
          detalhe={r && `${r.totalNotas} notas · ticket médio ${formatBRL(r.ticketMedioGeral)}`}
        />
        <KpiCard
          titulo="Custo total"
          Icone={TrendingDown}
          carregando={isLoading}
          valor={r && formatBRL(r.custoTotal)}
          detalhe={r && `Fixos ${formatBRL(r.custoFixo)} · Variáveis ${formatBRL(r.custoVariavel)}`}
        />
        <KpiCard
          titulo="Saldo operacional"
          Icone={Wallet}
          destaque={r && r.saldoOperacional < 0 ? 'negativo' : 'positivo'}
          carregando={isLoading}
          valor={r && formatBRL(r.saldoOperacional)}
          detalhe={r && `Margem operacional de ${formatPercentual(r.margemPercentual)}`}
        />
        <KpiCard
          titulo="Clientes em risco de churn"
          Icone={AlertTriangle}
          destaque="risco"
          carregando={isLoading}
          valor={r && `${r.clientesEmRisco} de ${r.totalClientes}`}
          detalhe={
            r && (
              <Link to="/clientes" className="text-primary hover:underline">
                {r.clientesPorNivel.CRITICO} críticos · ver régua de churn →
              </Link>
            )
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Faturamento vs. Custos</CardTitle>
              <CardDescription>Fluxo de caixa operacional por período, com saldo (faturamento − custos)</CardDescription>
            </div>
            <SegmentedControl
              ariaLabel="Modo de visualização"
              opcoes={[
                { valor: 'grafico', rotulo: 'Gráfico' },
                { valor: 'tabela', rotulo: 'Tabela' },
              ]}
              valor={visao}
              onChange={setVisao}
            />
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-[340px] w-full" />
            ) : visao === 'grafico' ? (
              <FaturamentoCustosChart dados={data.serie} />
            ) : (
              <SerieTabela dados={data.serie} />
            )}
          </CardContent>
        </Card>

        {data ? (
          <TicketVendedorCard dados={data.ticketMedioPorVendedor} ticketGeral={data.resumo.ticketMedioGeral} />
        ) : (
          <Skeleton className="h-[420px] w-full" />
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" /> Régua de inatividade da carteira
            </CardTitle>
            <CardDescription>Distribuição atual dos clientes por dias sem faturar</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RISCO_ORDEM.map(({ valor, faixa }) => (
              <FaixaRisco key={valor} nivel={valor} faixa={faixa} quantidade={r?.clientesPorNivel[valor]} />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function FaixaRisco({ nivel, faixa, quantidade }: { nivel: NivelRisco; faixa: string; quantidade?: number }) {
  return (
    <Link
      to={`/clientes?nivel=${nivel}`}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="space-y-1.5">
        <RiscoBadge nivel={nivel} />
        <p className="text-xs text-muted-foreground">{faixa}</p>
      </div>
      <span className="text-3xl font-bold tabular-nums">{quantidade ?? '–'}</span>
    </Link>
  )
}
