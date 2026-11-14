import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts'
import type { FluxoSemana } from '@/api/types'
import { formatBRL, formatBRLCompacto, formatData } from '@/lib/format'

const COR = {
  entradas: 'var(--chart-faturamento)',
  saidas: 'var(--chart-custos)',
  saldo: 'var(--chart-saldo)',
  grid: 'var(--chart-grid)',
  eixo: 'var(--chart-axis)',
}

type Ponto = FluxoSemana & { rotulo: string }

function Dica({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as Ponto
  const linhas = [
    { cor: COR.entradas, nome: 'A receber', valor: p.entradas },
    { cor: COR.saidas, nome: 'A pagar', valor: p.saidas },
    { cor: COR.saldo, nome: 'Saldo acumulado', valor: p.saldoAcumulado },
  ]
  return (
    <div className="min-w-56 rounded-md border bg-popover p-3 text-sm shadow-md">
      <p className="mb-2 font-semibold">
        {formatData(p.inicio)} a {formatData(p.fim)}
      </p>
      <ul className="space-y-1">
        {linhas.map((l) => (
          <li key={l.nome} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.cor }} />
              {l.nome}
            </span>
            <span className="font-medium tabular-nums">{formatBRL(l.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Entradas e saídas por semana (barras) e saldo acumulado (linha), todos em R$. */
export function FluxoCaixaChart({ semanas }: { semanas: FluxoSemana[] }) {
  const dados: Ponto[] = semanas.map((s) => ({ ...s, rotulo: formatData(s.inicio).slice(0, 5) }))
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={COR.grid} />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fill: COR.eixo, fontSize: 12 }} minTickGap={8} />
        <YAxis tickFormatter={(v: number) => formatBRLCompacto(v)} tickLine={false} axisLine={false} tick={{ fill: COR.eixo, fontSize: 12 }} width={72} />
        <ReferenceLine y={0} stroke={COR.eixo} strokeOpacity={0.5} />
        <Tooltip content={<Dica />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }} />
        <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 13, paddingBottom: 12 }} />
        <Bar dataKey="entradas" name="A receber" fill={COR.entradas} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="saidas" name="A pagar" fill={COR.saidas} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Line type="monotone" dataKey="saldoAcumulado" name="Saldo acumulado" stroke={COR.saldo} strokeWidth={2} isAnimationActive={false} dot={{ r: 3, strokeWidth: 2, fill: 'hsl(var(--card))' }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
