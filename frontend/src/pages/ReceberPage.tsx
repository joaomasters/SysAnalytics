import { AlertTriangle, CalendarClock, CircleDollarSign, HandCoins, Plus, Search, Wallet, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { FiltroTitulo, ResumoReceber } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Paginacao } from '@/components/ui/paginacao'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useClientes, useCriarTitulo, useReceber, useReceberResumo } from '@/hooks/queries'
import { formatBRL, formatData, formatDataHoraRelativa, formatPercentual } from '@/lib/format'
import { CLASSE_CAMPO, dataISO, SITUACAO_TITULO } from '@/lib/rotulos'
import { useDebounce } from '@/lib/useDebounce'

const FILTROS: { valor: FiltroTitulo; rotulo: string }[] = [
  { valor: 'EM_ABERTO', rotulo: 'Em aberto' },
  { valor: 'A_VENCER', rotulo: 'A vencer' },
  { valor: 'VENCIDO', rotulo: 'Vencidos' },
  { valor: 'PAGO', rotulo: 'Pagos' },
  { valor: 'TODOS', rotulo: 'Todos' },
]

export function ReceberPage() {
  const { temPerfil } = useAuth()
  const gestao = temPerfil('GESTOR', 'ADMIN')
  const [situacao, setSituacao] = useState<FiltroTitulo>('EM_ABERTO')
  const [busca, setBusca] = useState('')
  const [clienteId, setClienteId] = useState<number | undefined>()
  const [pagina, setPagina] = useState(0)
  const [tamanho, setTamanho] = useState(10)
  const [novo, setNovo] = useState(false)
  const buscaDebounced = useDebounce(busca)

  const resumo = useReceberResumo()
  const lista = useReceber({ situacao, busca: buscaDebounced, clienteId, pagina, tamanho })

  function mudarFiltro(f: FiltroTitulo) {
    setSituacao(f)
    setPagina(0)
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Contas a receber</h2>
          <p className="text-sm text-muted-foreground">
            Títulos, baixas e cobrança.{' '}
            {gestao ? 'Lance títulos e registre pagamentos.' : 'Você vê e cobra apenas os títulos da sua carteira.'}
          </p>
        </div>
        {gestao && !novo && (
          <Button onClick={() => setNovo(true)}>
            <Plus /> Novo título
          </Button>
        )}
      </div>

      {novo && <NovoTitulo onFechar={() => setNovo(false)} />}

      <Indicadores resumo={resumo.data} carregando={resumo.isLoading} />
      {resumo.isError && <p className="text-sm text-red-700">Erro ao carregar indicadores: {mensagemDeErro(resumo.error)}</p>}

      {resumo.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <AgingCard resumo={resumo.data} />
          <DevedoresCard
            resumo={resumo.data}
            clienteSelecionado={clienteId}
            onSelecionar={(id) => {
              setClienteId(id)
              setSituacao('VENCIDO')
              setPagina(0)
            }}
          />
        </div>
      )}

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Títulos</CardTitle>
            <CardDescription>
              {lista.data ? `${lista.data.totalElementos} título(s)` : 'Carregando...'}
              {clienteId !== undefined && ' · filtrado por cliente'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SegmentedControl ariaLabel="Situação do título" opcoes={FILTROS} valor={situacao} onChange={mudarFiltro} />
            {clienteId !== undefined && (
              <Button variant="ghost" size="sm" onClick={() => setClienteId(undefined)}>
                <X /> Limpar cliente
              </Button>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar título"
                className="w-full pl-8 sm:w-60"
                placeholder="Cliente ou documento…"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  setPagina(0)
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lista.isError && <p className="p-4 text-sm text-red-700">Erro ao carregar títulos: {mensagemDeErro(lista.error)}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Cobrança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.isLoading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {lista.data?.conteudo.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum título neste filtro.
                  </TableCell>
                </TableRow>
              )}
              {lista.data?.conteudo.map((t) => {
                const sit = SITUACAO_TITULO[t.situacao]
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link to={`/financeiro/receber/${t.id}`} className="font-semibold text-primary hover:underline">
                        {t.numeroDocumento}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Parcela {t.parcela}/{t.totalParcelas}
                        {t.descricao && ` · ${t.descricao}`}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Link to={`/clientes/${t.clienteId}`} className="font-medium hover:underline">
                        {t.clienteNome}
                      </Link>
                      <p className="text-xs text-muted-foreground">{t.vendedorNome}</p>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatData(t.dataVencimento)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(t.valor)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatBRL(t.saldo)}</TableCell>
                    <TableCell>
                      <Badge variant={sit.variant}>{sit.rotulo}</Badge>
                      {t.diasAtraso > 0 && <p className="mt-0.5 text-xs text-red-700">{t.diasAtraso} dia(s) de atraso</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.promessaData && (
                        <p className="font-medium text-foreground">Promessa para {formatData(t.promessaData)}</p>
                      )}
                      {t.ultimaCobrancaEm ? `Último contato ${formatDataHoraRelativa(t.ultimaCobrancaEm)}` : t.situacao === 'VENCIDO' ? 'Sem contato' : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        {lista.data && (
          <Paginacao
            pagina={lista.data.pagina}
            tamanho={tamanho}
            total={lista.data.totalElementos}
            onPagina={setPagina}
            onTamanho={(t) => {
              setTamanho(t)
              setPagina(0)
            }}
            rotulo="títulos"
          />
        )}
      </Card>
    </div>
  )
}

function Indicadores({ resumo, carregando }: { resumo?: ResumoReceber; carregando: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        titulo="Carteira em aberto"
        valor={resumo ? formatBRL(resumo.totalAberto) : '—'}
        detalhe={resumo && `${resumo.titulosAbertos} título(s)`}
        Icone={Wallet}
        carregando={carregando}
      />
      <KpiCard
        titulo="A vencer"
        valor={resumo ? formatBRL(resumo.aVencer) : '—'}
        detalhe={resumo && `${formatBRL(resumo.vence7Dias)} nos próximos 7 dias`}
        Icone={CalendarClock}
        carregando={carregando}
      />
      <KpiCard
        titulo="Vencido"
        valor={resumo ? formatBRL(resumo.vencido) : '—'}
        detalhe={
          resumo &&
          `${resumo.titulosVencidos} título(s)${resumo.inadimplenciaPercentual !== null ? ` · inadimplência ${formatPercentual(resumo.inadimplenciaPercentual)}` : ''}`
        }
        Icone={AlertTriangle}
        destaque="negativo"
        carregando={carregando}
      />
      <KpiCard
        titulo="Recebido no mês"
        valor={resumo ? formatBRL(resumo.recebidoNoMes) : '—'}
        detalhe={resumo && (resumo.prazoMedioRecebimentoDias !== null ? `Prazo médio de recebimento: ${resumo.prazoMedioRecebimentoDias.toLocaleString('pt-BR')} dias` : 'Sem pagamentos recentes')}
        Icone={CircleDollarSign}
        destaque="positivo"
        carregando={carregando}
      />
    </div>
  )
}

function AgingCard({ resumo }: { resumo: ResumoReceber }) {
  const maior = Math.max(...resumo.aging.map((f) => f.valor), 1)
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Aging da inadimplência</CardTitle>
        <CardDescription>Valor vencido por faixa de atraso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resumo.aging.map((f) => (
          <div key={f.faixa} className="grid grid-cols-[8rem_1fr_9rem] items-center gap-3 text-sm">
            <span className="text-muted-foreground">{f.faixa}</span>
            <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
              <div className="h-full bg-red-600" style={{ width: `${(f.valor / maior) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums">
              {formatBRL(f.valor)} <span className="text-xs text-muted-foreground">({f.quantidade})</span>
            </span>
          </div>
        ))}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <HandCoins className="size-3.5" aria-hidden /> Promessas pendentes: <strong className="text-foreground">{resumo.promessasPendentes}</strong>
          </span>
          <span>
            Promessas não cumpridas: <strong className="text-red-700">{resumo.promessasQuebradas}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function DevedoresCard({
  resumo,
  clienteSelecionado,
  onSelecionar,
}: {
  resumo: ResumoReceber
  clienteSelecionado?: number
  onSelecionar: (id: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maiores devedores</CardTitle>
        <CardDescription>Clique para filtrar os títulos vencidos do cliente</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {resumo.maioresDevedores.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">Nenhum título vencido 🎉</p>
        )}
        <ul className="divide-y">
          {resumo.maioresDevedores.map((d) => (
            <li key={d.clienteId}>
              <button
                type="button"
                onClick={() => onSelecionar(d.clienteId)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent/60 ${clienteSelecionado === d.clienteId ? 'bg-accent' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.clienteNome}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.titulos} título(s) · até {d.maiorAtraso} dia(s)
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-red-700">{formatBRL(d.vencido)}</span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function NovoTitulo({ onFechar }: { onFechar: () => void }) {
  const criar = useCriarTitulo()
  const { data: clientes } = useClientes([], '')
  const [clienteId, setClienteId] = useState('')
  const [documento, setDocumento] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [emissao, setEmissao] = useState(dataISO(0))
  const [vencimento, setVencimento] = useState(dataISO(30))
  const [parcelas, setParcelas] = useState('1')
  const [intervalo, setIntervalo] = useState('30')

  function enviar(e: FormEvent) {
    e.preventDefault()
    criar.mutate(
      {
        clienteId: Number(clienteId),
        numeroDocumento: documento.trim(),
        descricao: descricao.trim() || undefined,
        dataEmissao: emissao,
        primeiroVencimento: vencimento,
        valorTotal: Number(valor),
        parcelas: Number(parcelas) || 1,
        intervaloDias: Number(intervalo) || 30,
      },
      { onSuccess: onFechar },
    )
  }

  const parcelasN = Number(parcelas) || 1
  const valorN = Number(valor)
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Novo título</CardTitle>
          <CardDescription>Com mais de uma parcela, o sistema gera os vencimentos e divide o valor</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Cancelar">
          <X />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Campo id="t-cliente" rotulo="Cliente *" className="md:col-span-2">
              <select id="t-cliente" required className={CLASSE_CAMPO} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Selecione…</option>
                {clientes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeFantasia}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="t-doc" rotulo="Documento *">
              <InputMascarado id="t-doc" mascara="codigo" tamanho={40} required placeholder="NF-12345" value={documento} onValueChange={setDocumento} />
            </Campo>
            <Campo id="t-valor" rotulo="Valor total *">
              <InputMascarado id="t-valor" mascara="moeda" required placeholder="0,00" value={valor} onValueChange={setValor} />
            </Campo>
            <Campo id="t-emissao" rotulo="Emissão *">
              <Input id="t-emissao" type="date" required value={emissao} onChange={(e) => setEmissao(e.target.value)} />
            </Campo>
            <Campo id="t-venc" rotulo="1º vencimento *">
              <Input id="t-venc" type="date" required min={emissao} value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </Campo>
            <Campo id="t-parc" rotulo="Parcelas">
              <InputMascarado id="t-parc" mascara="inteiro" max={60} value={parcelas} onValueChange={setParcelas} />
            </Campo>
            <Campo id="t-int" rotulo="Intervalo (dias)">
              <InputMascarado id="t-int" mascara="inteiro" max={365} value={intervalo} onValueChange={setIntervalo} />
            </Campo>
            <Campo id="t-desc" rotulo="Descrição" className="md:col-span-4">
              <InputMascarado id="t-desc" mascara="texto" tamanho={200} value={descricao} onValueChange={setDescricao} />
            </Campo>
          </div>
          {parcelasN > 1 && valorN > 0 && (
            <p className="text-xs text-muted-foreground">
              {parcelasN} parcelas de aproximadamente {formatBRL(valorN / parcelasN)}.
            </p>
          )}
          {criar.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensagemDeErro(criar.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending || !clienteId || !documento || !valorN}>
              {criar.isPending ? 'Salvando…' : 'Lançar título'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Campo({ id, rotulo, className, children }: { id: string; rotulo: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      {children}
    </div>
  )
}
