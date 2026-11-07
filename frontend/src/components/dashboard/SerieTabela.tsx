import type { PontoSerie } from '@/api/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBRL, formatPercentual } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Visão tabular da mesma série do gráfico (acessibilidade / leitura exata). */
export function SerieTabela({ dados }: { dados: PontoSerie[] }) {
  return (
    <div className="max-h-[340px] overflow-y-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0">
          <TableRow>
            <TableHead>Período</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-right">Custos</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="text-right">Saldo acumulado</TableHead>
            <TableHead className="text-right">Margem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dados.map((p) => (
            <TableRow key={p.periodo}>
              <TableCell className="font-medium">{p.rotulo}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBRL(p.faturamento)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBRL(p.custos)}</TableCell>
              <TableCell className={cn('text-right tabular-nums', p.saldo < 0 && 'text-red-700')}>
                {formatBRL(p.saldo)}
              </TableCell>
              <TableCell className={cn('text-right tabular-nums', p.saldoAcumulado < 0 && 'text-red-700')}>
                {formatBRL(p.saldoAcumulado)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatPercentual(p.margemPercentual)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
