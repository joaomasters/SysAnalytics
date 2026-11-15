import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MESES_CURTOS } from '@/lib/rotulos'

export const CORES = {
  azul: 'var(--chart-faturamento)',
  laranja: 'var(--chart-custos)',
  verde: 'var(--chart-saldo)',
  grid: 'var(--chart-grid)',
  eixo: 'var(--chart-axis)',
}

/** "2026-03" → "Mar/26". */
export function rotuloMes(mes: string) {
  const [a, m] = mes.split('-')
  return `${MESES_CURTOS[Number(m) - 1]}/${a.slice(2)}`
}

export interface SerieDef {
  chave: string
  nome: string
  tipo: 'barra' | 'linha'
  cor: string
  eixo?: 'esq' | 'dir'
}

interface SerieProps {
  dados: object[]
  series: SerieDef[]
  formatoEsq: (v: number) => string
  formatoDir?: (v: number) => string
  altura?: number
}

/** Série mensal com barras e/ou linhas; as linhas podem usar um segundo eixo (ex.: percentual). */
export function SerieMensal({ dados, series, formatoEsq, formatoDir, altura = 280 }: SerieProps) {
  const pontos = (dados as { mes: string }[]).map((d) => ({ ...d, rotulo: rotuloMes(d.mes) }))
  const temDir = series.some((s) => s.eixo === 'dir')
  const fmt = (nome: string, v: number) => {
    const s = series.find((x) => x.nome === nome)
    return s?.eixo === 'dir' && formatoDir ? formatoDir(v) : formatoEsq(v)
  }
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ComposedChart data={pontos} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid vertical={false} stroke={CORES.grid} />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fill: CORES.eixo, fontSize: 12 }} minTickGap={8} />
        <YAxis yAxisId="esq" tickFormatter={formatoEsq} tickLine={false} axisLine={false} tick={{ fill: CORES.eixo, fontSize: 12 }} width={72} />
        {temDir && (
          <YAxis yAxisId="dir" orientation="right" tickFormatter={formatoDir} tickLine={false} axisLine={false} tick={{ fill: CORES.eixo, fontSize: 12 }} width={48} />
        )}
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }}
          contentStyle={{ borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: 13 }}
          formatter={(v: number, nome: string) => [v == null ? '—' : fmt(nome, v), nome]}
        />
        <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 13, paddingBottom: 12 }} />
        {series.map((s) =>
          s.tipo === 'barra' ? (
            <Bar key={s.chave} yAxisId={s.eixo ?? 'esq'} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[4, 4, 0, 0]} maxBarSize={28} />
          ) : (
            <Line
              key={s.chave}
              yAxisId={s.eixo ?? 'esq'}
              type="monotone"
              dataKey={s.chave}
              name={s.nome}
              stroke={s.cor}
              strokeWidth={2}
              connectNulls
              isAnimationActive={false}
              dot={{ r: 3, strokeWidth: 2, fill: 'hsl(var(--card))' }}
            />
          ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

interface ItemBarra {
  rotulo: string
  valor: number
  texto: string
  detalhe?: string
}

/** Ranking em barras horizontais (largura proporcional ao maior valor). */
export function Ranking({ itens, cor = CORES.azul, vazio = 'Sem dados no período' }: { itens: ItemBarra[]; cor?: string; vazio?: string }) {
  if (itens.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{vazio}</p>
  const max = Math.max(...itens.map((i) => i.valor), 1)
  return (
    <ul className="space-y-3">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{i.rotulo}</span>
            <span className="shrink-0 tabular-nums">
              {i.texto}
              {i.detalhe && <span className="ml-2 text-xs text-muted-foreground">{i.detalhe}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm bg-muted">
            <div className="h-full rounded-sm" style={{ width: `${Math.max((i.valor / max) * 100, 2)}%`, background: cor }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

