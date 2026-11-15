import { AlertTriangle, Banknote, Clock, PackageCheck, Percent, Repeat, ShoppingCart, Target, Timer, TrendingUp, Truck, Users, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { LogisticaGrupo } from '@/api/types'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { CORES, Ranking, SerieMensal } from '@/components/indicadores/graficos'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useIndicadoresClientes, useIndicadoresFinanceiro, useIndicadoresLogistica, useIndicadoresVendas } from '@/hooks/queries'
import { formatBRL, formatBRLCompacto, formatPercentual } from '@/lib/format'
import { CLASSE_CAMPO } from '@/lib/rotulos'

type Aba = 'vendas' | 'clientes' | 'financeiro' | 'logistica'

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'vendas', rotulo: 'Vendas' },
  { valor: 'clientes', rotulo: 'Clientes' },
  { valor: 'financeiro', rotulo: 'Financeiro' },
  { valor: 'logistica', rotulo: 'Logística' },
]

const pct = (v: number | null | undefined) => (v == null ? '—' : formatPercentual(v))
const dias = (v: number | null | undefined) => (v == null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`)
const num = (v: number) => v.toLocaleString('pt-BR')

function Secao({ titulo, descricao, children, className }: { titulo: string; descricao?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        {descricao && <CardDescription>{descricao}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Grade({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}

export function IndicadoresPage() {
  const [aba, setAba] = useState<Aba>('vendas')
  const [meses, setMeses] = useState(12)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Indicadores</h1>
          <p className="text-sm text-muted-foreground">Visão gerencial calculada sobre vendas, clientes, financeiro e logística</p>
        </div>
        <label className="space-y-1 text-sm">
          <span className="block text-muted-foreground">Período</span>
          <select className={`${CLASSE_CAMPO} w-40`} value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            {[3, 6, 12, 18, 24].map((m) => (
              <option key={m} value={m}>
                Últimos {m} meses
              </option>
            ))}
          </select>
        </label>
      </div>
      <SegmentedControl ariaLabel="Área" opcoes={ABAS} valor={aba} onChange={setAba} />
      {aba === 'vendas' && <Vendas meses={meses} />}
      {aba === 'clientes' && <Clientes meses={meses} />}
      {aba === 'financeiro' && <Financeiro meses={meses} />}
      {aba === 'logistica' && <Logistica meses={meses} />}
    </div>
  )
}

function Erro({ erro }: { erro: unknown }) {
  return <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{mensagemDeErro(erro)}</p>
}

// ------------------------------------------------------------------ vendas

function Vendas({ meses }: { meses: number }) {
  const { data: d, isLoading, error } = useIndicadoresVendas(meses)
  if (error) return <Erro erro={error} />
  const f = d?.funil
  const pr = d?.propostas
  return (
    <div className="space-y-6">
      <Grade>
        <KpiCard titulo="Faturamento" valor={d ? formatBRL(d.faturamento) : '—'} detalhe={d?.variacaoPct != null ? `${d.variacaoPct > 0 ? '+' : ''}${pct(d.variacaoPct)} vs. período anterior` : 'Sem período anterior'} Icone={TrendingUp} destaque={d?.variacaoPct != null ? (d.variacaoPct >= 0 ? 'positivo' : 'negativo') : 'neutro'} carregando={isLoading} />
        <KpiCard titulo="Ticket médio" valor={d ? formatBRL(d.ticketMedio) : '—'} detalhe={d && `${num(d.notas)} notas · ${num(d.clientesAtendidos)} clientes`} Icone={ShoppingCart} carregando={isLoading} />
        <KpiCard titulo="Conversão do funil" valor={pct(f?.taxaConversaoPct)} detalhe={f && `${f.ganhas} ganhas · ${f.perdidas} perdidas`} Icone={Target} carregando={isLoading} />
        <KpiCard titulo="Ciclo médio de venda" valor={dias(f?.cicloMedioDias)} detalhe={f && `Previsão ponderada ${formatBRLCompacto(f.previsaoPonderada)}`} Icone={Timer} carregando={isLoading} />
      </Grade>

      <Secao titulo="Faturamento e ticket médio por mês">
        {d && <SerieMensal dados={d.serie} formatoEsq={formatBRLCompacto} formatoDir={formatBRLCompacto} series={[
          { chave: 'faturamento', nome: 'Faturamento', tipo: 'barra', cor: CORES.azul },
          { chave: 'ticketMedio', nome: 'Ticket médio', tipo: 'linha', cor: CORES.laranja, eixo: 'dir' },
        ]} />}
      </Secao>

      <div className="grid gap-4 xl:grid-cols-2">
        <Secao titulo="Desempenho por vendedor" descricao="Faturamento no período; atingimento da meta do mês corrente">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Ticket</TableHead>
                <TableHead className="text-right">Meta do mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d?.vendedores.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nome}<span className="ml-2 text-xs text-muted-foreground">{pct(v.participacaoPct)}</span></TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(v.faturamento)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(v.ticketMedio)}</TableCell>
                  <TableCell className="text-right">
                    {v.atingimentoPct == null ? <span className="text-muted-foreground">Sem meta</span> : (
                      <Badge variant={v.atingimentoPct >= 100 ? 'ok' : v.atingimentoPct >= 70 ? 'alerta' : 'critico'}>{pct(v.atingimentoPct)}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Secao>
        <Secao titulo="Perdas por motivo" descricao={f ? `${formatBRL(f.valorPerdido)} em oportunidades perdidas no período` : undefined}>
          <Ranking cor={CORES.laranja} itens={(f?.perdasPorMotivo ?? []).map((m) => ({ rotulo: m.rotulo ?? 'Não informado', valor: m.quantidade, texto: `${m.quantidade}`, detalhe: formatBRLCompacto(m.valor ?? 0) }))} vazio="Nenhuma perda no período" />
        </Secao>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Secao titulo="Propostas" descricao="Propostas enviadas no período">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Mini rotulo="Enviadas" valor={pr ? num(pr.enviadas) : '—'} />
            <Mini rotulo="Taxa de aceite" valor={pct(pr?.taxaAceitePct)} />
            <Mini rotulo="Desconto médio" valor={pct(pr?.descontoMedioPct)} />
            <Mini rotulo="Valor aceito" valor={pr ? formatBRLCompacto(pr.valorAceito) : '—'} />
          </div>
        </Secao>
        <Secao titulo="Produtos mais cotados" descricao="Valor líquido cotado em propostas">
          <Ranking itens={(pr?.topProdutos ?? []).map((p) => ({ rotulo: p.descricao, valor: p.valor, texto: formatBRLCompacto(p.valor), detalhe: `${p.propostas} prop.` }))} />
        </Secao>
      </div>
    </div>
  )
}

function Mini({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="text-xl font-semibold tabular-nums">{valor}</p>
    </div>
  )
}

// ------------------------------------------------------------------ clientes

const COR_ABC: Record<string, 'ok' | 'alerta' | 'neutro'> = { A: 'ok', B: 'alerta', C: 'neutro' }

function Clientes({ meses }: { meses: number }) {
  const { data: d, isLoading, error } = useIndicadoresClientes(meses)
  if (error) return <Erro erro={error} />
  return (
    <div className="space-y-6">
      <Grade>
        <KpiCard titulo="Base ativa (90 dias)" valor={pct(d?.taxaAtividadePct)} detalhe={d && `${num(d.ativos90d)} de ${num(d.totalClientes)} clientes`} Icone={Users} carregando={isLoading} />
        <KpiCard titulo="Recompra" valor={pct(d?.recompraPct)} detalhe={d?.frequenciaMediaDias != null ? `Compram a cada ${dias(d.frequenciaMediaDias)}` : 'Clientes com 2+ compras'} Icone={Repeat} carregando={isLoading} />
        <KpiCard titulo="Ticket por cliente" valor={d ? formatBRL(d.ticketMedioPorCliente) : '—'} detalhe={d && `${num(d.novosNoPeriodo)} novos no período`} Icone={Wallet} carregando={isLoading} />
        <KpiCard titulo="Concentração top 10" valor={pct(d?.concentracaoTop10Pct)} detalhe="Parcela do faturamento" Icone={Percent} destaque={d?.concentracaoTop10Pct != null && d.concentracaoTop10Pct > 60 ? 'risco' : 'neutro'} carregando={isLoading} />
      </Grade>

      <div className="grid gap-4 xl:grid-cols-2">
        <Secao titulo="Curva ABC" descricao="A: até 80% do faturamento · B: até 95% · C: restante">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Clientes</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Participação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d?.curvaAbc.map((c) => (
                <TableRow key={c.classe}>
                  <TableCell><Badge variant={COR_ABC[c.classe]}>Classe {c.classe}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{c.clientes} <span className="text-xs text-muted-foreground">({pct(c.clientesPct)})</span></TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(c.faturamento)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(c.participacaoPct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Secao>
        <Secao titulo="Tempo desde a última compra" descricao="Distribuição da base de clientes">
          <Ranking cor={CORES.laranja} itens={(d?.faixasInatividade ?? []).map((f) => ({ rotulo: f.rotulo, valor: f.quantidade, texto: `${f.quantidade}` }))} />
        </Secao>
      </div>

      <Secao titulo="Retenção mensal" descricao="Dos clientes que compraram no mês anterior, quantos compraram de novo">
        {d && <SerieMensal dados={d.retencao} formatoEsq={num} formatoDir={(v) => `${v}%`} series={[
          { chave: 'ativos', nome: 'Clientes ativos', tipo: 'barra', cor: CORES.azul },
          { chave: 'retencaoPct', nome: 'Retenção %', tipo: 'linha', cor: CORES.verde, eixo: 'dir' },
        ]} />}
      </Secao>

      <div className="grid gap-4 xl:grid-cols-3">
        <Secao titulo="Maiores clientes"><Ranking itens={(d?.topClientes ?? []).map((c) => ({ rotulo: c.rotulo, valor: c.valor ?? 0, texto: formatBRLCompacto(c.valor ?? 0), detalhe: `${c.quantidade} notas` }))} /></Secao>
        <Secao titulo="Por segmento"><Ranking itens={(d?.porSegmento ?? []).map((c) => ({ rotulo: c.rotulo, valor: c.valor ?? 0, texto: formatBRLCompacto(c.valor ?? 0), detalhe: `${c.quantidade} cli.` }))} /></Secao>
        <Secao titulo="Por UF"><Ranking itens={(d?.porUf ?? []).map((c) => ({ rotulo: c.rotulo, valor: c.valor ?? 0, texto: formatBRLCompacto(c.valor ?? 0), detalhe: `${c.quantidade} cli.` }))} /></Secao>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ financeiro

function Financeiro({ meses }: { meses: number }) {
  const { data: d, isLoading, error } = useIndicadoresFinanceiro(meses)
  if (error) return <Erro erro={error} />
  return (
    <div className="space-y-6">
      <Grade>
        <KpiCard titulo="Prazo médio de recebimento" valor={dias(d?.prazoMedioRecebimentoDias)} detalhe={d?.prazoMedioPagamentoDias != null ? `Pagamento: ${dias(d.prazoMedioPagamentoDias)}` : 'Últimos 90 dias'} Icone={Clock} carregando={isLoading} />
        <KpiCard titulo="Inadimplência" valor={pct(d?.inadimplenciaPct)} detalhe="Vencido sobre o a receber em aberto" Icone={AlertTriangle} destaque={d?.inadimplenciaPct != null && d.inadimplenciaPct > 10 ? 'risco' : 'neutro'} carregando={isLoading} />
        <KpiCard titulo="Pontualidade dos clientes" valor={pct(d?.pontualidadeRecebimentoPct)} detalhe={d?.atrasoMedioRecebidosDias != null ? `Atraso médio ${dias(d.atrasoMedioRecebidosDias)}` : 'Pagos em dia (90 dias)'} Icone={PackageCheck} carregando={isLoading} />
        <KpiCard titulo="Posição líquida" valor={d ? formatBRL(d.posicaoLiquida) : '—'} detalhe={d && `Receber ${formatBRLCompacto(d.aReceberAberto)} − pagar ${formatBRLCompacto(d.aPagarAberto)}`} Icone={Banknote} destaque={d && d.posicaoLiquida < 0 ? 'negativo' : 'positivo'} carregando={isLoading} />
      </Grade>

      {d?.diferencaPrazoDias != null && (
        <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
          Você recebe em média {dias(d.prazoMedioRecebimentoDias)} após a emissão e paga fornecedores em {dias(d.prazoMedioPagamentoDias)}:{' '}
          {d.diferencaPrazoDias > 0
            ? `um descompasso de ${dias(d.diferencaPrazoDias)} que o caixa precisa financiar.`
            : 'o caixa recebe antes de pagar, o que alivia a necessidade de capital de giro.'}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Secao titulo="Recebido x pago por mês">
          {d && <SerieMensal dados={d.serie} formatoEsq={formatBRLCompacto} series={[
            { chave: 'recebido', nome: 'Recebido', tipo: 'barra', cor: CORES.azul },
            { chave: 'pago', nome: 'Pago', tipo: 'barra', cor: CORES.laranja },
            { chave: 'saldo', nome: 'Saldo', tipo: 'linha', cor: CORES.verde },
          ]} />}
        </Secao>
        <Secao titulo="Margens por mês" descricao="Margem bruta (receita − CMV) e resultado operacional">
          {d && <SerieMensal dados={d.serie} formatoEsq={(v) => `${v}%`} series={[
            { chave: 'margemBrutaPct', nome: 'Margem bruta', tipo: 'linha', cor: CORES.azul },
            { chave: 'resultadoPct', nome: 'Resultado', tipo: 'linha', cor: CORES.verde },
          ]} />}
        </Secao>
      </div>

      <Secao titulo="Concentração do a receber" descricao={d?.concentracaoTop5Pct != null ? `Os 5 maiores devedores respondem por ${pct(d.concentracaoTop5Pct)} do em aberto` : undefined}>
        <Ranking cor={CORES.laranja} itens={(d?.concentracaoRecebiveis ?? []).map((c) => ({ rotulo: c.rotulo, valor: c.valor ?? 0, texto: formatBRL(c.valor ?? 0), detalhe: `${c.quantidade} títulos` }))} vazio="Nada em aberto" />
      </Secao>
    </div>
  )
}

// ------------------------------------------------------------------ logística

function TabelaGrupo({ grupos, primeira }: { grupos: LogisticaGrupo[]; primeira: string }) {
  if (grupos.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Sem entregas no período</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{primeira}</TableHead>
          <TableHead className="text-right">Entregas</TableHead>
          <TableHead className="text-right">No prazo</TableHead>
          <TableHead className="text-right">Trânsito</TableHead>
          <TableHead className="text-right">Ocorr./100</TableHead>
          <TableHead className="text-right">Frete</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {grupos.map((g) => (
          <TableRow key={g.rotulo}>
            <TableCell className="font-medium">{g.rotulo}</TableCell>
            <TableCell className="text-right tabular-nums">{g.entregues}</TableCell>
            <TableCell className="text-right">
              <Badge variant={g.pontualidadePct == null ? 'neutro' : g.pontualidadePct >= 90 ? 'ok' : g.pontualidadePct >= 75 ? 'alerta' : 'critico'}>{pct(g.pontualidadePct)}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{dias(g.prazoMedioDias)}</TableCell>
            <TableCell className="text-right tabular-nums">{g.ocorrenciasPor100 == null ? '—' : g.ocorrenciasPor100.toLocaleString('pt-BR')}</TableCell>
            <TableCell className="text-right tabular-nums">{pct(g.fretePct)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Logistica({ meses }: { meses: number }) {
  const { data: d, isLoading, error } = useIndicadoresLogistica(meses)
  if (error) return <Erro erro={error} />
  return (
    <div className="space-y-6">
      <Grade>
        <KpiCard titulo="Entregas no prazo" valor={pct(d?.pontualidadePct)} detalhe={d && `${num(d.entregues)} entregues de ${num(d.cargas)} cargas`} Icone={PackageCheck} destaque={d?.pontualidadePct != null && d.pontualidadePct < 80 ? 'risco' : 'neutro'} carregando={isLoading} />
        <KpiCard titulo="Prazo médio de trânsito" valor={dias(d?.prazoMedioDias)} detalhe={d?.atrasoMedioDias != null ? `Atraso médio ${dias(d.atrasoMedioDias)}` : 'Embarque até entrega'} Icone={Truck} carregando={isLoading} />
        <KpiCard titulo="Frete sobre mercadoria" valor={pct(d?.fretePct)} detalhe="Custo logístico relativo" Icone={Percent} carregando={isLoading} />
        <KpiCard titulo="Ocorrências por 100 cargas" valor={d?.ocorrenciasPor100 == null ? '—' : d.ocorrenciasPor100.toLocaleString('pt-BR')} detalhe="Avarias, atrasos, extravios…" Icone={AlertTriangle} carregando={isLoading} />
      </Grade>

      <Secao titulo="Entregas e pontualidade por mês">
        {d && <SerieMensal dados={d.serie} formatoEsq={num} formatoDir={(v) => `${v}%`} series={[
          { chave: 'entregues', nome: 'Entregas', tipo: 'barra', cor: CORES.azul },
          { chave: 'pontualidadePct', nome: 'No prazo %', tipo: 'linha', cor: CORES.verde, eixo: 'dir' },
        ]} />}
      </Secao>

      <div className="grid gap-4 xl:grid-cols-2">
        <Secao titulo="Por sentido"><TabelaGrupo grupos={d?.porSentido ?? []} primeira="Sentido" /></Secao>
        <Secao titulo="Por transportadora"><TabelaGrupo grupos={d?.porTransportadora ?? []} primeira="Transportadora" /></Secao>
        <Secao titulo="Entregas por UF de destino" descricao="Cargas de saída"><TabelaGrupo grupos={d?.porUfDestino ?? []} primeira="UF" /></Secao>
        <Secao titulo="Recebimentos por fornecedor" descricao="Cargas de entrada"><TabelaGrupo grupos={d?.porFornecedor ?? []} primeira="Fornecedor" /></Secao>
      </div>
    </div>
  )
}

