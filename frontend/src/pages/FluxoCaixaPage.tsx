import { ArrowDownCircle, ArrowUpCircle, Landmark, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { mensagemDeErro } from '@/api/client'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { FluxoCaixaChart } from '@/components/financeiro/FluxoCaixaChart'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFluxoCaixa } from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'
import { CLASSE_CAMPO } from '@/lib/rotulos'

function rotuloMes(yyyyMm: string) {
  const [a, m] = yyyyMm.split('-')
  return `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]}/${a.slice(2)}`
}

export function FluxoCaixaPage() {
  const [semanas, setSemanas] = useState(13)
  const [saldoTexto, setSaldoTexto] = useState('')
  const [saldoAplicado, setSaldoAplicado] = useState(0)
  const [comAtrasado, setComAtrasado] = useState(false)
  const { data, isLoading, isError, error } = useFluxoCaixa({ semanas, saldoInicial: saldoAplicado, incluirReceberAtrasado: comAtrasado })

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Fluxo de caixa projetado</h2>
        <p className="text-sm text-muted-foreground">
          O que entra (contas a receber) e o que sai (contas a pagar), semana a semana a partir de hoje.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
          <Campo id="fx-sem" rotulo="Horizonte">
            <select id="fx-sem" className={`${CLASSE_CAMPO} md:w-40`} value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
              <option value={8}>8 semanas</option>
              <option value={13}>13 semanas</option>
              <option value={26}>26 semanas</option>
            </select>
          </Campo>
          <Campo id="fx-saldo" rotulo="Saldo atual em caixa (R$)">
            <InputMascarado id="fx-saldo" mascara="moeda" permitirZero placeholder="0,00" className="md:w-48" value={saldoTexto} onValueChange={setSaldoTexto} />
          </Campo>
          <Button variant="outline" onClick={() => setSaldoAplicado(Number(saldoTexto) || 0)}>
            Aplicar saldo
          </Button>
          <label className="flex items-center gap-2 text-sm md:ml-4">
            <input type="checkbox" checked={comAtrasado} onChange={(e) => setComAtrasado(e.target.checked)} />
            Contar recebíveis vencidos na 1ª semana
          </label>
        </CardContent>
      </Card>

      {isError && <p className="text-sm text-red-700">Erro ao carregar o fluxo: {mensagemDeErro(error)}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="A receber no período" valor={data ? formatBRL(data.totalEntradas) : '—'} detalhe={data && `Vencido fora da projeção: ${formatBRL(data.incluiReceberAtrasado ? 0 : data.receberAtrasado)}`} Icone={ArrowDownCircle} destaque="positivo" carregando={isLoading} />
        <KpiCard titulo="A pagar no período" valor={data ? formatBRL(data.totalSaidas) : '—'} detalhe={data && `Inclui ${formatBRL(data.pagarAtrasado)} já vencidos`} Icone={ArrowUpCircle} destaque="negativo" carregando={isLoading} />
        <KpiCard titulo="Saldo final projetado" valor={data ? formatBRL(data.saldoFinalProjetado) : '—'} detalhe={data && `Saldo inicial ${formatBRL(data.saldoInicial)}`} Icone={Landmark} destaque={data && data.saldoFinalProjetado < 0 ? 'negativo' : 'neutro'} carregando={isLoading} />
        <KpiCard titulo="Pior saldo da projeção" valor={data ? formatBRL(data.menorSaldo) : '—'} detalhe={data && `Semana de ${formatData(data.semanaMenorSaldo)}`} Icone={TrendingDown} destaque={data && data.menorSaldo < 0 ? 'risco' : 'neutro'} carregando={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projeção semanal</CardTitle>
          <CardDescription>
            Contas a pagar vencidas entram na 1ª semana. Recebíveis vencidos ficam de fora (conservador), a menos que você os inclua acima.
          </CardDescription>
        </CardHeader>
        <CardContent>{isLoading ? <Skeleton className="h-80 w-full" /> : data && <FluxoCaixaChart semanas={data.semanas} />}</CardContent>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semana</TableHead>
                <TableHead className="text-right">A receber</TableHead>
                <TableHead className="text-right">A pagar</TableHead>
                <TableHead className="text-right">Saldo da semana</TableHead>
                <TableHead className="text-right">Saldo acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.semanas.map((s) => (
                <TableRow key={s.inicio}>
                  <TableCell className="tabular-nums">
                    {formatData(s.inicio)} a {formatData(s.fim)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(s.entradas)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(s.saidas)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${s.saldo < 0 ? 'text-red-700' : ''}`}>{formatBRL(s.saldo)}</TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${s.saldoAcumulado < 0 ? 'text-red-700' : ''}`}>{formatBRL(s.saldoAcumulado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Realizado nos últimos 6 meses</CardTitle>
            <CardDescription>Recebimentos (baixas de títulos) e pagamentos (baixas de contas)</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.historico.map((h) => (
                  <TableRow key={h.mes}>
                    <TableCell>{rotuloMes(h.mes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(h.recebido)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(h.pago)}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${h.recebido - h.pago < 0 ? 'text-red-700' : ''}`}>{formatBRL(h.recebido - h.pago)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
