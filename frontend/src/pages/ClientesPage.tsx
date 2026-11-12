import { Loader2, PlayCircle, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { ExecucaoJob, NivelRisco } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { NIVEIS_RISCO, RiscoBadge } from '@/components/RiscoBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useClientes, useExecutarAnaliseInatividade } from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'
import { cn } from '@/lib/utils'

const NIVEIS_VALIDOS = new Set<string>(NIVEIS_RISCO.map((n) => n.valor))

function useDebounce<T>(valor: T, ms = 300) {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return v
}

export function ClientesPage() {
  const [params, setParams] = useSearchParams()
  const niveis = useMemo(
    () => params.getAll('nivel').filter((n): n is NivelRisco => NIVEIS_VALIDOS.has(n)),
    [params],
  )
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca)

  const { data: clientes, isLoading, isError, error, isFetching } = useClientes(niveis, buscaDebounced)
  const analise = useExecutarAnaliseInatividade()
  const { temPerfil } = useAuth()
  const podeAnalisar = temPerfil('GESTOR', 'ADMIN') // a API de jobs é restrita à gestão

  const alternarNivel = (nivel: NivelRisco) => {
    const proximo = niveis.includes(nivel) ? niveis.filter((n) => n !== nivel) : [...niveis, nivel]
    const novos = new URLSearchParams()
    proximo.forEach((n) => novos.append('nivel', n))
    setParams(novos, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clientes & régua de churn</h2>
          <p className="text-sm text-muted-foreground">
            Dias corridos desde a última compra: <strong>Alerta</strong> 30–59 · <strong>Atenção</strong> 60–89 ·{' '}
            <strong>Crítico</strong> 90+
          </p>
        </div>
        {podeAnalisar && (
          <Button size="lg" onClick={() => analise.mutate()} disabled={analise.isPending}>
            {analise.isPending ? <Loader2 className="animate-spin" /> : <PlayCircle />}
            {analise.isPending ? 'Analisando carteira...' : 'Executar Análise de Inatividade'}
          </Button>
        )}
      </div>

      {analise.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">
            Falha ao executar a análise: {mensagemDeErro(analise.error)}
          </CardContent>
        </Card>
      )}
      {analise.data && <ResultadoAnalise resultado={analise.data} onFechar={() => analise.reset()} />}

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Carteira de clientes</CardTitle>
            <CardDescription>
              {clientes ? `${clientes.length} cliente(s)` : 'Carregando...'}
              {isFetching && !isLoading && ' · atualizando...'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por nível de risco">
              {NIVEIS_RISCO.map((n) => {
                const ativo = niveis.includes(n.valor)
                return (
                  <button
                    key={n.valor}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => alternarNivel(n.valor)}
                    title={n.faixa}
                    className={cn(
                      'rounded-full border-2 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      ativo ? 'border-foreground/60' : 'border-transparent opacity-60 hover:opacity-100',
                    )}
                  >
                    <RiscoBadge nivel={n.valor} />
                  </button>
                )
              })}
              {niveis.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
                  <X /> Limpar
                </Button>
              )}
            </div>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
                aria-label="Buscar cliente"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <p className="p-6 text-sm text-red-700">Erro ao carregar clientes: {mensagemDeErro(error)}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Última compra</TableHead>
                  <TableHead className="text-right">Dias sem faturar</TableHead>
                  <TableHead className="text-right">Ticket médio</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {clientes?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Nenhum cliente encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                )}
                {clientes?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        to={`/clientes/${c.id}`}
                        className="font-semibold hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {c.nomeFantasia}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.cnpj} · {c.cidade}/{c.uf} · {c.segmento}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatData(c.ultimaCompra)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {c.diasInatividade ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(c.ticketMedio)}
                      <p className="text-xs text-muted-foreground">{c.totalNotas} notas</p>
                    </TableCell>
                    <TableCell>
                      <p className="whitespace-nowrap">{c.vendedorNome}</p>
                      <p className="text-xs text-muted-foreground">{c.carteira}</p>
                    </TableCell>
                    <TableCell>
                      <RiscoBadge nivel={c.nivelRisco} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ResultadoAnalise({ resultado, onFechar }: { resultado: ExecucaoJob; onFechar: () => void }) {
  const sucesso = resultado.status === 'COMPLETED'
  return (
    <Card className={sucesso ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
      <CardContent className="flex items-start justify-between gap-4 p-4 text-sm">
        <div className="space-y-2">
          <p className="font-semibold">
            {sucesso
              ? `Análise concluída em ${resultado.duracaoMs} ms · ${resultado.eventosPublicados} eventos publicados no RabbitMQ`
              : `Análise terminou com status ${resultado.status}${resultado.erro ? `: ${resultado.erro}` : ''}`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {(['ALERTA', 'ATENCAO', 'CRITICO'] as const).map((n) => (
              <span key={n} className="flex items-center gap-1.5">
                <RiscoBadge nivel={n} /> {resultado.eventosPorNivel[n] ?? 0}
              </span>
            ))}
            <span className="text-muted-foreground">
              Os alertas chegam ao feed assim que os consumidores processam as mensagens.
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Fechar resultado">
          <X />
        </Button>
      </CardContent>
    </Card>
  )
}
