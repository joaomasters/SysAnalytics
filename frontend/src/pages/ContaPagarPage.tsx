import { ArrowLeft, Ban, HandCoins, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { FormaPagamento, PagamentoItem } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Paginacao } from '@/components/ui/paginacao'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCancelarConta, useConta, useEstornarPagamento, usePagarConta } from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'
import { CLASSE_CAMPO, dataISO, FORMAS_PAGAMENTO, rotuloCategoria, rotuloForma, SITUACAO_TITULO } from '@/lib/rotulos'
import { usePaginacao } from '@/lib/usePaginacao'

export function ContaPagarPage() {
  const contaId = Number(useParams().id)
  const { data, isLoading, isError, error } = useConta(contaId)
  const cancelar = useCancelarConta(contaId)

  const voltar = (
    <Link to="/financeiro/pagar" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Voltar para contas a pagar
    </Link>
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-4">
        {voltar}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">Não foi possível carregar a conta: {mensagemDeErro(error)}</CardContent>
        </Card>
      </div>
    )
  }

  const c = data.conta
  const sit = SITUACAO_TITULO[c.situacao]
  const aberto = c.status === 'ABERTO' || c.status === 'PARCIAL'

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {voltar}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {c.numeroDocumento} · parcela {c.parcela}/{c.totalParcelas}
          </h2>
          <p className="text-sm text-muted-foreground">
            {c.fornecedorNome} · {rotuloCategoria(c.categoria)}
          </p>
          {c.descricao && <p className="text-sm text-muted-foreground">{c.descricao}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={sit.variant}>{sit.rotulo}</Badge>
          {c.status === 'ABERTO' && c.valorPago === 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={cancelar.isPending}
              onClick={() => window.confirm('Cancelar esta conta? Esta ação não pode ser desfeita.') && cancelar.mutate()}
            >
              <Ban /> Cancelar conta
            </Button>
          )}
        </div>
      </div>
      {cancelar.isError && <p role="alert" className="text-sm text-destructive">{mensagemDeErro(cancelar.error)}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info rotulo="Valor" valor={formatBRL(c.valor)} detalhe={`Emitida em ${formatData(c.dataEmissao)}`} />
        <Info rotulo="Pago" valor={formatBRL(c.valorPago)} />
        <Info rotulo="Saldo" valor={formatBRL(c.saldo)} destaque={c.situacao === 'VENCIDO'} />
        <Info rotulo="Vencimento" valor={formatData(c.dataVencimento)} detalhe={c.diasAtraso > 0 ? `${c.diasAtraso} dia(s) de atraso` : undefined} destaque={c.diasAtraso > 0} />
      </div>

      <PagamentosCard contaId={contaId} saldo={c.saldo} pagamentos={data.pagamentos} aberto={aberto} />
    </div>
  )
}

function PagamentosCard({ contaId, saldo, pagamentos, aberto }: { contaId: number; saldo: number; pagamentos: PagamentoItem[]; aberto: boolean }) {
  const pagar = usePagarConta(contaId)
  const estornar = useEstornarPagamento(contaId)
  const [valor, setValor] = useState(saldo.toFixed(2))
  const [data, setData] = useState(dataISO(0))
  const [forma, setForma] = useState<FormaPagamento>('PIX')
  const [obs, setObs] = useState('')
  const pg = usePaginacao(pagamentos, 5)

  function enviar(e: FormEvent) {
    e.preventDefault()
    pagar.mutate(
      { dataPagamento: data, valor: Number(valor), formaPagamento: forma, observacao: obs.trim() || undefined },
      {
        onSuccess: (novo) => {
          setValor(novo.conta.saldo.toFixed(2))
          setObs('')
        },
      },
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Pagamentos</CardTitle>
        <CardDescription>Pagamentos feitos, totais ou parciais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {aberto && (
          <form onSubmit={enviar} className="space-y-3 rounded-sm border bg-muted/40 p-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <Campo id="p-valor" rotulo="Valor *">
                <InputMascarado id="p-valor" mascara="moeda" required value={valor} onValueChange={setValor} />
              </Campo>
              <Campo id="p-data" rotulo="Data *">
                <Input id="p-data" type="date" required max={dataISO(0)} value={data} onChange={(e) => setData(e.target.value)} />
              </Campo>
              <Campo id="p-forma" rotulo="Forma *">
                <select id="p-forma" className={CLASSE_CAMPO} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo id="p-obs" rotulo="Observação">
                <InputMascarado id="p-obs" mascara="texto" tamanho={300} value={obs} onValueChange={setObs} />
              </Campo>
            </div>
            {pagar.isError && <p role="alert" className="text-sm text-destructive">{mensagemDeErro(pagar.error)}</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pagar.isPending || !Number(valor)}>
                <HandCoins /> {pagar.isPending ? 'Registrando…' : 'Registrar pagamento'}
              </Button>
            </div>
          </form>
        )}
        {estornar.isError && <p role="alert" className="text-sm text-destructive">{mensagemDeErro(estornar.error)}</p>}
      </CardContent>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Por</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  Nenhum pagamento registrado.
                </TableCell>
              </TableRow>
            )}
            {pg.visiveis.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="tabular-nums">{formatData(b.dataPagamento)}</TableCell>
                <TableCell>
                  {rotuloForma(b.formaPagamento)}
                  {b.observacao && <p className="text-xs text-muted-foreground">{b.observacao}</p>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(b.valor)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{b.usuarioNome}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Estornar pagamento" title="Estornar pagamento" disabled={estornar.isPending} onClick={() => window.confirm('Estornar este pagamento?') && estornar.mutate(b.id)}>
                    <Undo2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Paginacao pagina={pg.pagina} tamanho={pg.tamanho} total={pg.total} onPagina={pg.setPagina} rotulo="pagamentos" />
    </Card>
  )
}

function Info({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <Card>
      <CardContent className="space-y-1 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">{rotulo}</p>
        <p className={`text-xl font-semibold tabular-nums ${destaque ? 'text-red-700' : ''}`}>{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  )
}
