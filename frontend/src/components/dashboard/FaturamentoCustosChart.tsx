import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import type { PontoSerie } from '@/api/types'
import { formatBRL, formatBRLCompacto, formatPercentual } from '@/lib/format'

const COR = {
  faturamento: 'var(--chart-faturamento)',
  custos: 'var(--chart-custos)',
  saldo: 'var(--chart-saldo)',
  grid: 'var(--chart-grid)',
  eixo: 'var(--chart-axis)',
}

function TooltipConteudo({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as PontoSerie
  const linhas = [
    { cor: COR.faturamento, nome: 'Faturamento', valor: p.faturamento },
    { cor: COR.custos, nome: 'Custos', valor: p.custos },
    { cor: COR.saldo, nome: 'Saldo', valor: p.saldo },
  ]
  return (
    <div className="min-w-52 rounded-md border bg-popover p-3 text-sm shadow-md">
      <p className="mb-2 font-semibold">{label}</p>
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
      <div className="mt-2 flex justify-between border-t pt-2 text-xs text-muted-foreground">
        <span>Margem {formatPercentual(p.margemPercentual)}</span>
        <span>{p.notas} notas</span>
      </div>
    </div>
  )
}

/**
 * Faturamento vs. Custos (barras) com Saldo operacional (linha).
 * Um único eixo Y em R$: as três séries partilham a mesma unidade.
 */
export function FaturamentoCustosChart({ dados }: { dados: PontoSerie[] }) {
  const muitosPontos = dados.length > 16

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={COR.grid} />
        <XAxis
          dataKey="rotulo"
          tickLine={false}
          axisLine={false}
          tick={{ fill: COR.eixo, fontSize: 12 }}
          interval="preserveStartEnd"
          minTickGap={10}
        />
        <YAxis
          tickFormatter={(v: number) => formatBRLCompacto(v)}
          tickLine={false}
          axisLine={false}
          tick={{ fill: COR.eixo, fontSize: 12 }}
          width={72}
        />
        <ReferenceLine y={0} stroke={COR.eixo} strokeOpacity={0.4} />
        <Tooltip content={<TooltipConteudo />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }} />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: 13, paddingBottom: 12 }}
        />
        <Bar dataKey="faturamento" name="Faturamento" fill={COR.faturamento} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="custos" name="Custos" fill={COR.custos} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Line
          type="monotone"
          dataKey="saldo"
          name="Saldo operacional"
          stroke={COR.saldo}
          strokeWidth={2}
          isAnimationActive={false}
          dot={muitosPontos ? false : { r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
