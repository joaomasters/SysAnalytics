import type { TicketVendedor } from '@/api/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL } from '@/lib/format'

/** Ticket médio segmentado por vendedor/carteira, com barra de participação no faturamento. */
export function TicketVendedorCard({ dados, ticketGeral }: { dados: TicketVendedor[]; ticketGeral: number }) {
  const total = dados.reduce((s, v) => s + v.faturamento, 0) || 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket médio por carteira</CardTitle>
        <CardDescription>
          Ticket médio geral: <span className="font-semibold text-foreground">{formatBRL(ticketGeral)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {dados.map((v) => {
          const participacao = (v.faturamento / total) * 100
          return (
            <div key={v.vendedorId} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{v.vendedorNome}</p>
                  <p className="truncate text-xs text-muted-foreground">{v.carteira}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatBRL(v.ticketMedio)}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.totalNotas} notas · {v.clientesAtendidos} clientes
                  </p>
                </div>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-valuenow={Math.round(participacao)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Participação de ${v.vendedorNome} no faturamento`}
              >
                <div className="h-full rounded-full bg-[var(--chart-faturamento)]" style={{ width: `${participacao}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBRL(v.faturamento)} · {participacao.toFixed(1).replace('.', ',')}% do faturamento
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
