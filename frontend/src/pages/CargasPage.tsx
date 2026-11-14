import { AlertTriangle, CheckCircle2, Clock, PackageCheck, Plus, Search, ShieldAlert, Truck, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { FiltroCarga, ResumoCargas, SentidoCarga } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { FormCarga } from '@/components/logistica/FormCarga'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Paginacao } from '@/components/ui/paginacao'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCargas, useCargasResumo } from '@/hooks/queries'
import { formatBRL, formatData, formatPercentual } from '@/lib/format'
import { rotuloOcorrencia, SITUACAO_CARGA } from '@/lib/rotulos'
import { useDebounce } from '@/lib/useDebounce'

const FILTROS: { valor: FiltroCarga; rotulo: string }[] = [
  { valor: 'ATIVAS', rotulo: 'Em andamento' },
  { valor: 'ATRASADAS', rotulo: 'Atrasadas' },
  { valor: 'COM_OCORRENCIA', rotulo: 'Com ocorrência' },
  { valor: 'ENTREGUES', rotulo: 'Entregues' },
  { valor: 'TODAS', rotulo: 'Todas' },
]

type FiltroSentido = SentidoCarga | 'TODOS'

export function CargasPage() {
  const { temPerfil } = useAuth()
  const gestao = temPerfil('GESTOR', 'ADMIN')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const transportadoraId = params.get('transportadoraId') ? Number(params.get('transportadoraId')) : undefined
  const clienteId = params.get('clienteId') ? Number(params.get('clienteId')) : undefined
  const [sentido, setSentido] = useState<FiltroSentido>(gestao ? 'TODOS' : 'SAIDA')
  const [situacao, setSituacao] = useState<FiltroCarga>(params.get('transportadoraId') || params.get('clienteId') ? 'TODAS' : 'ATIVAS')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(0)
  const [tamanho, setTamanho] = useState(10)
  const [nova, setNova] = useState(false)
  const termo = useDebounce(busca)
  const sentidoApi = sentido === 'TODOS' ? undefined : sentido

  const resumo = useCargasResumo(sentidoApi)
  const lista = useCargas({ sentido: sentidoApi, situacao, busca: termo, clienteId, transportadoraId, pagina, tamanho })

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Cargas e entregas</h2>
          <p className="text-sm text-muted-foreground">
            {gestao
              ? 'Acompanhe compras que chegam (entrada) e pedidos que saem (saída), com atrasos e ocorrências.'
              : 'Acompanhe as entregas dos clientes da sua carteira.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {gestao && (
            <SegmentedControl
              ariaLabel="Sentido da carga"
              opcoes={[
                { valor: 'TODOS', rotulo: 'Todas' },
                { valor: 'SAIDA', rotulo: 'Saída' },
                { valor: 'ENTRADA', rotulo: 'Entrada' },
              ]}
              valor={sentido}
              onChange={(v) => {
                setSentido(v)
                setPagina(0)
              }}
            />
          )}
          {gestao && !nova && (
            <Button onClick={() => setNova(true)}>
              <Plus /> Nova carga
            </Button>
          )}
        </div>
      </div>

      {nova && (
        <FormCarga
          sentidoInicial={sentido === 'ENTRADA' ? 'ENTRADA' : 'SAIDA'}
          onFechar={() => setNova(false)}
          onSalvo={(id) => navigate(`/logistica/cargas/${id}`)}
        />
      )}

      <Indicadores resumo={resumo.data} carregando={resumo.isLoading} gestao={gestao} />
      {resumo.isError && <p className="text-sm text-red-700">Erro ao carregar indicadores: {mensagemDeErro(resumo.error)}</p>}

      {resumo.data && (resumo.data.ranking.length > 0 || resumo.data.ocorrencias.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {resumo.data.ranking.length > 0 && <RankingCard resumo={resumo.data} />}
          {resumo.data.ocorrencias.length > 0 && <OcorrenciasCard resumo={resumo.data} />}
        </div>
      )}

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Cargas</CardTitle>
            <CardDescription>{lista.data ? `${lista.data.totalElementos} carga(s)` : 'Carregando...'}
              {transportadoraId !== undefined && ' · filtrado por transportadora'}
              {clienteId !== undefined && ' · filtrado por cliente'}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SegmentedControl ariaLabel="Situação da carga" opcoes={FILTROS} valor={situacao} onChange={(v) => { setSituacao(v); setPagina(0) }} />
            {(transportadoraId !== undefined || clienteId !== undefined) && (
              <Button variant="ghost" size="sm" onClick={() => { setParams({}); setPagina(0) }}>
                <X /> Limpar filtro
              </Button>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar carga" className="w-full pl-8 sm:w-64" placeholder="Código, nota, rastreio ou nome…" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(0) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lista.isError && <p className="p-4 text-sm text-red-700">Erro ao carregar cargas: {mensagemDeErro(lista.error)}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carga</TableHead>
                <TableHead>{sentido === 'ENTRADA' ? 'Fornecedor' : sentido === 'SAIDA' ? 'Cliente' : 'Cliente / fornecedor'}</TableHead>
                <TableHead>Transportadora</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Mercadoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {lista.data?.conteudo.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma carga neste filtro.
                  </TableCell>
                </TableRow>
              )}
              {lista.data?.conteudo.map((c) => {
                const sit = SITUACAO_CARGA[c.situacao]
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to={`/logistica/cargas/${c.id}`} className="font-semibold text-primary hover:underline">
                        {c.codigo}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.sentido === 'SAIDA' ? 'Saída' : 'Entrada'}
                        {c.numeroDocumento && ` · NF ${c.numeroDocumento}`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{c.parceiroNome}</span>
                      {c.destino && c.sentido === 'SAIDA' && <p className="text-xs text-muted-foreground">{c.destino}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{c.transportadoraNome ?? <span className="text-muted-foreground">A definir</span>}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatData(c.status === 'ENTREGUE' && c.dataEntrega ? c.dataEntrega : c.previsaoEntrega)}
                      <p className="text-xs text-muted-foreground">{c.status === 'ENTREGUE' ? 'entregue' : 'previsão'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={sit.variant}>{sit.rotulo}</Badge>
                        {c.ocorrenciasAbertas > 0 && (
                          <Badge variant="atencao">
                            <ShieldAlert aria-hidden /> {c.ocorrenciasAbertas}
                          </Badge>
                        )}
                      </div>
                      {c.situacao === 'ATRASADA' && <p className="mt-0.5 text-xs text-red-700">{c.diasAtraso} dia(s) de atraso</p>}
                      {c.status === 'ENTREGUE' && c.noPrazo === false && <p className="mt-0.5 text-xs text-red-700">Entregue com {c.diasAtraso} dia(s) de atraso</p>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.valorMercadoria != null ? formatBRL(c.valorMercadoria) : '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        {lista.data && (
          <Paginacao pagina={lista.data.pagina} tamanho={tamanho} total={lista.data.totalElementos} onPagina={setPagina} onTamanho={(t) => { setTamanho(t); setPagina(0) }} rotulo="cargas" />
        )}
      </Card>
    </div>
  )
}

function Indicadores({ resumo, carregando, gestao }: { resumo?: ResumoCargas; carregando: boolean; gestao: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard titulo="Em trânsito" valor={resumo ? resumo.emTransito : '—'} detalhe={resumo && `${resumo.aguardando} aguardando coleta`} Icone={Truck} carregando={carregando} />
      <KpiCard titulo="Atrasadas" valor={resumo ? resumo.atrasadas : '—'} detalhe="Previsão vencida e ainda não entregues" Icone={AlertTriangle} destaque={resumo && resumo.atrasadas > 0 ? 'negativo' : 'neutro'} carregando={carregando} />
      <KpiCard titulo="Com ocorrência" valor={resumo ? resumo.comOcorrencia : '—'} detalhe="Ocorrências abertas em cargas ativas" Icone={ShieldAlert} destaque={resumo && resumo.comOcorrencia > 0 ? 'risco' : 'neutro'} carregando={carregando} />
      <KpiCard
        titulo="Pontualidade (90 dias)"
        valor={resumo?.pontualidadePct90d != null ? formatPercentual(resumo.pontualidadePct90d) : '—'}
        detalhe={resumo && `${resumo.entreguesNoMes} entregue(s) no mês`}
        Icone={CheckCircle2}
        destaque="positivo"
        carregando={carregando}
      />
      <KpiCard
        titulo={gestao ? 'Frete no mês' : 'Prazo médio'}
        valor={resumo ? (gestao ? (resumo.freteNoMes != null ? formatBRL(resumo.freteNoMes) : '—') : resumo.prazoMedioDias != null ? `${resumo.prazoMedioDias.toLocaleString('pt-BR')} dias` : '—') : '—'}
        detalhe={
          resumo &&
          (gestao
            ? `${resumo.fretePctMercadoria != null ? `${formatPercentual(resumo.fretePctMercadoria)} da mercadoria · ` : ''}prazo médio ${resumo.prazoMedioDias != null ? `${resumo.prazoMedioDias.toLocaleString('pt-BR')} dias` : '—'}`
            : 'Do embarque à entrega')
        }
        Icone={gestao ? PackageCheck : Clock}
        carregando={carregando}
      />
    </div>
  )
}

function RankingCard({ resumo }: { resumo: ResumoCargas }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho das transportadoras</CardTitle>
        <CardDescription>Entregas dos últimos 90 dias</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transportadora</TableHead>
              <TableHead className="text-right">Entregas</TableHead>
              <TableHead className="text-right">No prazo</TableHead>
              <TableHead className="text-right">Ocorrências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumo.ranking.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-right tabular-nums">{r.entregues}</TableCell>
                <TableCell className={`text-right tabular-nums ${r.pontualidadePct != null && r.pontualidadePct < 85 ? 'font-semibold text-red-700' : ''}`}>
                  {r.pontualidadePct != null ? formatPercentual(r.pontualidadePct) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.ocorrencias}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function OcorrenciasCard({ resumo }: { resumo: ResumoCargas }) {
  const maior = Math.max(...resumo.ocorrencias.map((o) => o.total), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocorrências por tipo</CardTitle>
        <CardDescription>Últimos 90 dias · em destaque, as ainda abertas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resumo.ocorrencias.map((o) => (
          <div key={o.categoria} className="grid grid-cols-[10rem_1fr_6rem] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground">{rotuloOcorrencia(o.categoria)}</span>
            <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
              <div className="h-full bg-orange-500" style={{ width: `${(o.total / maior) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums">
              {o.total} {o.abertas > 0 && <span className="text-xs font-semibold text-red-700">({o.abertas} aberta{o.abertas > 1 ? 's' : ''})</span>}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
