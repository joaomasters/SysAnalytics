import { AlertTriangle, CalendarClock, CircleDollarSign, Plus, Search, Wallet, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { CategoriaDespesa, FiltroTitulo, ResumoPagar } from '@/api/types'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Paginacao } from '@/components/ui/paginacao'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCriarConta, useFornecedores, usePagar, usePagarResumo } from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'
import { CATEGORIAS_DESPESA, CLASSE_CAMPO, dataISO, rotuloCategoria, SITUACAO_TITULO } from '@/lib/rotulos'
import { useDebounce } from '@/lib/useDebounce'

const FILTROS: { valor: FiltroTitulo; rotulo: string }[] = [
  { valor: 'EM_ABERTO', rotulo: 'Em aberto' },
  { valor: 'A_VENCER', rotulo: 'A vencer' },
  { valor: 'VENCIDO', rotulo: 'Vencidas' },
  { valor: 'PAGO', rotulo: 'Pagas' },
  { valor: 'TODOS', rotulo: 'Todas' },
]

export function PagarPage() {
  const [params, setParams] = useSearchParams()
  const fornecedorId = params.get('fornecedorId') ? Number(params.get('fornecedorId')) : undefined
  const [situacao, setSituacao] = useState<FiltroTitulo>('EM_ABERTO')
  const [categoria, setCategoria] = useState<CategoriaDespesa | ''>('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(0)
  const [tamanho, setTamanho] = useState(10)
  const [nova, setNova] = useState(false)
  const termo = useDebounce(busca)

  const resumo = usePagarResumo()
  const lista = usePagar({ situacao, busca: termo, categoria: categoria || undefined, fornecedorId, pagina, tamanho })

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Contas a pagar</h2>
          <p className="text-sm text-muted-foreground">Compras e despesas com vencimento, pagamentos parciais e histórico.</p>
        </div>
        {!nova && (
          <Button onClick={() => setNova(true)}>
            <Plus /> Nova conta
          </Button>
        )}
      </div>

      {nova && <NovaConta onFechar={() => setNova(false)} />}

      <Indicadores resumo={resumo.data} carregando={resumo.isLoading} />
      {resumo.isError && <p className="text-sm text-red-700">Erro ao carregar indicadores: {mensagemDeErro(resumo.error)}</p>}

      {resumo.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <AgingCard resumo={resumo.data} />
          <CategoriasCard resumo={resumo.data} selecionada={categoria} onSelecionar={(c) => { setCategoria(c); setPagina(0) }} />
        </div>
      )}

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Contas</CardTitle>
            <CardDescription>
              {lista.data ? `${lista.data.totalElementos} conta(s)` : 'Carregando...'}
              {fornecedorId !== undefined && ' · filtrado por fornecedor'}
              {categoria && ` · ${rotuloCategoria(categoria)}`}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SegmentedControl ariaLabel="Situação da conta" opcoes={FILTROS} valor={situacao} onChange={(v) => { setSituacao(v); setPagina(0) }} />
            {(fornecedorId !== undefined || categoria) && (
              <Button variant="ghost" size="sm" onClick={() => { setParams({}); setCategoria(''); setPagina(0) }}>
                <X /> Limpar filtros
              </Button>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar conta" className="w-full pl-8 sm:w-60" placeholder="Fornecedor ou documento…" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(0) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lista.isError && <p className="p-4 text-sm text-red-700">Erro ao carregar contas: {mensagemDeErro(lista.error)}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Situação</TableHead>
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
                    Nenhuma conta neste filtro.
                  </TableCell>
                </TableRow>
              )}
              {lista.data?.conteudo.map((c) => {
                const sit = SITUACAO_TITULO[c.situacao]
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to={`/financeiro/pagar/${c.id}`} className="font-semibold text-primary hover:underline">
                        {c.numeroDocumento}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Parcela {c.parcela}/{c.totalParcelas}
                        {c.descricao && ` · ${c.descricao}`}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium">{c.fornecedorNome}</TableCell>
                    <TableCell className="text-sm">{rotuloCategoria(c.categoria)}</TableCell>
                    <TableCell className="tabular-nums">{formatData(c.dataVencimento)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(c.valor)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatBRL(c.saldo)}</TableCell>
                    <TableCell>
                      <Badge variant={sit.variant}>{sit.rotulo}</Badge>
                      {c.diasAtraso > 0 && <p className="mt-0.5 text-xs text-red-700">{c.diasAtraso} dia(s) de atraso</p>}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
        {lista.data && (
          <Paginacao pagina={lista.data.pagina} tamanho={tamanho} total={lista.data.totalElementos} onPagina={setPagina} onTamanho={(t) => { setTamanho(t); setPagina(0) }} rotulo="contas" />
        )}
      </Card>
    </div>
  )
}

function Indicadores({ resumo, carregando }: { resumo?: ResumoPagar; carregando: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard titulo="Total em aberto" valor={resumo ? formatBRL(resumo.totalAberto) : '—'} detalhe={resumo && `${resumo.contasAbertas} conta(s)`} Icone={Wallet} carregando={carregando} />
      <KpiCard titulo="A vencer" valor={resumo ? formatBRL(resumo.aVencer) : '—'} detalhe={resumo && `${formatBRL(resumo.vence7Dias)} nos próximos 7 dias`} Icone={CalendarClock} carregando={carregando} />
      <KpiCard titulo="Vencido" valor={resumo ? formatBRL(resumo.vencido) : '—'} detalhe={resumo && `${resumo.contasVencidas} conta(s) em atraso`} Icone={AlertTriangle} destaque="negativo" carregando={carregando} />
      <KpiCard titulo="Pago no mês" valor={resumo ? formatBRL(resumo.pagoNoMes) : '—'} Icone={CircleDollarSign} destaque="positivo" carregando={carregando} />
    </div>
  )
}

function AgingCard({ resumo }: { resumo: ResumoPagar }) {
  const maior = Math.max(...resumo.aging.map((f) => f.valor), 1)
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Vencimentos</CardTitle>
        <CardDescription>Saldo em aberto por faixa: a vencer e dias de atraso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resumo.aging.map((f, i) => (
          <div key={f.faixa} className="grid grid-cols-[8rem_1fr_9rem] items-center gap-3 text-sm">
            <span className="text-muted-foreground">{f.faixa}</span>
            <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
              <div className={`h-full ${i === 0 ? 'bg-primary' : 'bg-red-600'}`} style={{ width: `${(f.valor / maior) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums">
              {formatBRL(f.valor)} <span className="text-xs text-muted-foreground">({f.quantidade})</span>
            </span>
          </div>
        ))}
        {resumo.maioresFornecedores.length > 0 && (
          <div className="border-t pt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maiores saldos por fornecedor</p>
            <ul className="space-y-1 text-sm">
              {resumo.maioresFornecedores.map((f) => (
                <li key={f.fornecedorId} className="flex justify-between gap-3">
                  <Link to={`/financeiro/pagar?fornecedorId=${f.fornecedorId}`} className="truncate hover:underline">
                    {f.fornecedorNome}
                  </Link>
                  <span className="tabular-nums">
                    {formatBRL(f.aberto)}
                    {f.vencido > 0 && <span className="ml-2 text-xs text-red-700">({formatBRL(f.vencido)} vencido)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CategoriasCard({ resumo, selecionada, onSelecionar }: { resumo: ResumoPagar; selecionada: CategoriaDespesa | ''; onSelecionar: (c: CategoriaDespesa | '') => void }) {
  const total = resumo.abertoPorCategoria.reduce((a, c) => a + c.valor, 0) || 1
  return (
    <Card>
      <CardHeader>
        <CardTitle>Em aberto por categoria</CardTitle>
        <CardDescription>Clique para filtrar a lista</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {resumo.abertoPorCategoria.map((c) => (
            <li key={c.categoria}>
              <button
                type="button"
                onClick={() => onSelecionar(selecionada === c.categoria ? '' : c.categoria)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent/60 ${selecionada === c.categoria ? 'bg-accent' : ''}`}
              >
                <span>{rotuloCategoria(c.categoria)}</span>
                <span className="tabular-nums">
                  {formatBRL(c.valor)} <span className="text-xs text-muted-foreground">{Math.round((c.valor / total) * 100)}%</span>
                </span>
              </button>
            </li>
          ))}
          {resumo.abertoPorCategoria.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">Nada em aberto.</li>}
        </ul>
      </CardContent>
    </Card>
  )
}

function NovaConta({ onFechar }: { onFechar: () => void }) {
  const criar = useCriarConta()
  const { data: fornecedores } = useFornecedores('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [documento, setDocumento] = useState('')
  const [categoria, setCategoria] = useState<CategoriaDespesa>('MERCADORIA')
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
        fornecedorId: Number(fornecedorId),
        numeroDocumento: documento.trim(),
        descricao: descricao.trim() || undefined,
        categoria,
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
          <CardTitle>Nova conta a pagar</CardTitle>
          <CardDescription>Com mais de uma parcela, o sistema gera os vencimentos e divide o valor</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Cancelar">
          <X />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Campo id="c-forn" rotulo="Fornecedor *" className="md:col-span-2">
              <select id="c-forn" required className={CLASSE_CAMPO} value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
                <option value="">Selecione…</option>
                {fornecedores?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
              {fornecedores?.length === 0 && <p className="text-xs text-muted-foreground">Cadastre o fornecedor em Financeiro › Fornecedores.</p>}
            </Campo>
            <Campo id="c-doc" rotulo="Documento *">
              <InputMascarado id="c-doc" mascara="codigo" tamanho={40} required placeholder="NF-12345" value={documento} onValueChange={setDocumento} />
            </Campo>
            <Campo id="c-cat" rotulo="Categoria *">
              <select id="c-cat" className={CLASSE_CAMPO} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDespesa)}>
                {CATEGORIAS_DESPESA.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="c-valor" rotulo="Valor total *">
              <InputMascarado id="c-valor" mascara="moeda" required placeholder="0,00" value={valor} onValueChange={setValor} />
            </Campo>
            <Campo id="c-emissao" rotulo="Emissão *">
              <Input id="c-emissao" type="date" required value={emissao} onChange={(e) => setEmissao(e.target.value)} />
            </Campo>
            <Campo id="c-venc" rotulo="1º vencimento *">
              <Input id="c-venc" type="date" required min={emissao} value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </Campo>
            <Campo id="c-parc" rotulo="Parcelas">
              <InputMascarado id="c-parc" mascara="inteiro" max={60} value={parcelas} onValueChange={setParcelas} />
            </Campo>
            <Campo id="c-int" rotulo="Intervalo (dias)">
              <InputMascarado id="c-int" mascara="inteiro" max={365} value={intervalo} onValueChange={setIntervalo} />
            </Campo>
            <Campo id="c-desc" rotulo="Descrição" className="md:col-span-3">
              <InputMascarado id="c-desc" mascara="texto" tamanho={200} value={descricao} onValueChange={setDescricao} />
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
            <Button type="submit" disabled={criar.isPending || !fornecedorId || !documento || !valorN}>
              {criar.isPending ? 'Salvando…' : 'Lançar conta'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
