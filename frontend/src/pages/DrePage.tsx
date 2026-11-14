import { Percent, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { useState } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { DreMes } from '@/api/types'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDre } from '@/hooks/queries'
import { formatBRL, formatPercentual } from '@/lib/format'
import { CLASSE_CAMPO, MESES_CURTOS } from '@/lib/rotulos'

type Linha = {
  rotulo: string
  valor: (m: DreMes) => number
  pct?: (m: DreMes) => number | null
  tipo: 'detalhe' | 'subtotal' | 'resultado'
  negativa?: boolean
}

const LINHAS: Linha[] = [
  { rotulo: 'Receita bruta (notas faturadas)', valor: (m) => m.receitaBruta, tipo: 'detalhe' },
  { rotulo: '(−) CMV · compras de mercadoria', valor: (m) => m.cmv, tipo: 'detalhe', negativa: true },
  { rotulo: '= Margem bruta', valor: (m) => m.margemBruta, pct: (m) => m.margemBrutaPct, tipo: 'subtotal' },
  { rotulo: '(−) Custos variáveis', valor: (m) => m.custosVariaveis, tipo: 'detalhe', negativa: true },
  { rotulo: '= Margem de contribuição', valor: (m) => m.margemContribuicao, pct: (m) => m.margemContribuicaoPct, tipo: 'subtotal' },
  { rotulo: '(−) Custos fixos', valor: (m) => m.custosFixos, tipo: 'detalhe', negativa: true },
  { rotulo: '= Resultado operacional', valor: (m) => m.resultadoOperacional, pct: (m) => m.resultadoPct, tipo: 'resultado' },
]

const ROTULO_TIPO = { CMV: 'CMV', VARIAVEL: 'Custo variável', FIXO: 'Custo fixo' } as const

export function DrePage() {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const { data, isLoading, isError, error } = useDre(ano)
  const mesesComDado = data?.meses.filter((m) => m.receitaBruta > 0 || m.cmv > 0 || m.custosFixos > 0 || m.custosVariaveis > 0) ?? []
  const t = data?.total

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">DRE e margens</h2>
          <p className="text-sm text-muted-foreground">Resultado gerencial por competência, mês a mês.</p>
        </div>
        <div className="w-32">
          <select aria-label="Ano" className={CLASSE_CAMPO} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {[anoAtual, anoAtual - 1, anoAtual - 2].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && <p className="text-sm text-red-700">Erro ao carregar o DRE: {mensagemDeErro(error)}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Receita bruta" valor={t ? formatBRL(t.receitaBruta) : '—'} detalhe={`Acumulado de ${ano}`} Icone={Receipt} carregando={isLoading} />
        <KpiCard titulo="Margem bruta" valor={t?.margemBrutaPct != null ? formatPercentual(t.margemBrutaPct) : '—'} detalhe={t && formatBRL(t.margemBruta)} Icone={Percent} carregando={isLoading} />
        <KpiCard titulo="Margem de contribuição" valor={t?.margemContribuicaoPct != null ? formatPercentual(t.margemContribuicaoPct) : '—'} detalhe={t && formatBRL(t.margemContribuicao)} Icone={TrendingUp} carregando={isLoading} />
        <KpiCard titulo="Resultado operacional" valor={t ? formatBRL(t.resultadoOperacional) : '—'} detalhe={t?.resultadoPct != null ? `${formatPercentual(t.resultadoPct)} da receita` : undefined} Icone={Wallet} destaque={t && t.resultadoOperacional < 0 ? 'negativo' : 'positivo'} carregando={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demonstração do resultado</CardTitle>
          <CardDescription>Meses sem lançamentos ficam ocultos</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isLoading || !data || !t ? (
            <Skeleton className="m-4 h-48" />
          ) : (
            <table className="w-full min-w-[1100px] whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <th className="sticky left-0 bg-muted/50 px-4 py-2 text-left font-semibold">Conta</th>
                  {mesesComDado.map((m) => (
                    <th key={m.mes} className="px-3 py-2 text-right font-semibold">
                      {MESES_CURTOS[m.mes - 1]}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {LINHAS.map((l) => {
                  const forte = l.tipo !== 'detalhe'
                  return (
                    <tr key={l.rotulo} className={`border-b ${l.tipo === 'resultado' ? 'bg-accent/50' : ''}`}>
                      <td className={`sticky left-0 bg-card px-4 py-2 ${forte ? 'font-semibold' : ''} ${l.tipo === 'resultado' ? 'bg-accent/50' : ''}`}>
                        {l.rotulo}
                        {l.pct && <span className="block text-xs font-normal text-muted-foreground">% da receita</span>}
                      </td>
                      {[...mesesComDado, t].map((m, i) => {
                        const v = l.valor(m)
                        const p = l.pct?.(m)
                        return (
                          <td key={i} className={`px-3 py-2 text-right tabular-nums ${forte ? 'font-semibold' : ''} ${v < 0 && forte ? 'text-red-700' : ''}`}>
                            {l.negativa && v > 0 ? `(${formatBRL(v)})` : formatBRL(v)}
                            {l.pct && <span className="block text-xs font-normal text-muted-foreground">{p != null ? formatPercentual(p) : '—'}</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Para onde vai o dinheiro</CardTitle>
              <CardDescription>Custos do ano por categoria, em % da receita</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.categorias.length === 0 && <p className="text-sm text-muted-foreground">Sem custos no ano.</p>}
              {data.categorias.map((c) => {
                const pct = data.total.receitaBruta > 0 ? (c.valor / data.total.receitaBruta) * 100 : 0
                return (
                  <div key={`${c.tipo}-${c.categoria}`} className="grid grid-cols-[1fr_7rem_3.5rem] items-center gap-3 text-sm">
                    <span className="truncate">
                      {c.categoria} <span className="text-xs text-muted-foreground">· {ROTULO_TIPO[c.tipo]}</span>
                    </span>
                    <span className="text-right tabular-nums">{formatBRL(c.valor)}</span>
                    <span className="text-right text-xs tabular-nums text-muted-foreground">{formatPercentual(pct)}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Como ler este DRE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Receita:</strong> notas faturadas na data de emissão.
              </p>
              <p>
                <strong className="text-foreground">CMV:</strong> usa as compras de mercadoria lançadas em Contas a pagar (categoria "Mercadoria p/ revenda") por data de emissão, como aproximação do custo da mercadoria vendida. Ainda não considera variação de estoque.
              </p>
              <p>
                <strong className="text-foreground">Custos variáveis e fixos:</strong> lançamentos de custo da empresa. As demais categorias de contas a pagar (aluguel, folha etc.) são o caixa dessas despesas e não entram aqui, para não contar duas vezes.
              </p>
              <p>
                Margem por produto ou por cliente depende do custo de cada item, que virá com a integração do ERP.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
