import type { ItemProposta } from '@/api/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBRL } from '@/lib/format'

const qtd = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

/** Itens da proposta somente leitura, com os totais. */
export function TabelaItens({
  itens,
  subtotal,
  descontoTotal,
  total,
}: {
  itens: ItemProposta[]
  subtotal: number
  descontoTotal: number
  total: number
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Qtd.</TableHead>
          <TableHead className="text-right">Preço unit.</TableHead>
          <TableHead className="text-right">Desc.</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
              Sem itens.
            </TableCell>
          </TableRow>
        )}
        {itens.map((i) => (
          <TableRow key={i.id}>
            <TableCell>{i.descricao}</TableCell>
            <TableCell className="text-right tabular-nums">
              {qtd.format(i.quantidade)} {i.unidade}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatBRL(i.precoUnitario)}</TableCell>
            <TableCell className="text-right tabular-nums">{i.descontoPercentual > 0 ? `${i.descontoPercentual}%` : '—'}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatBRL(i.total)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="text-right text-muted-foreground">
            Subtotal
          </TableCell>
          <TableCell className="text-right tabular-nums">{formatBRL(subtotal)}</TableCell>
        </TableRow>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="text-right text-muted-foreground">
            Descontos
          </TableCell>
          <TableCell className="text-right tabular-nums">- {formatBRL(descontoTotal)}</TableCell>
        </TableRow>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="text-right font-semibold">
            Total
          </TableCell>
          <TableCell className="text-right text-base font-bold tabular-nums">{formatBRL(total)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
