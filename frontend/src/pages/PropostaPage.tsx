import { ArrowLeft, Printer, Trophy } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import { EditorRascunho } from '@/components/proposta/EditorRascunho'
import { TabelaItens } from '@/components/proposta/TabelaItens'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useExcluirProposta, useProposta, useStatusProposta } from '@/hooks/queries'
import { formatData } from '@/lib/format'
import { STATUS_PROPOSTA } from '@/lib/rotulos'

export function PropostaPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: p, isLoading, isError, error } = useProposta(id)
  const status = useStatusProposta(id)
  const excluir = useExcluirProposta(id)

  if (isLoading) return <Skeleton className="mx-auto h-64 max-w-5xl" />
  if (isError || !p) {
    return (
      <div className="mx-auto max-w-[1440px]">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">
            Não foi possível carregar a proposta: {mensagemDeErro(error)}
          </CardContent>
        </Card>
      </div>
    )
  }

  const meta = STATUS_PROPOSTA[p.status]
  const erro = status.error ?? excluir.error

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <Link
        to={`/oportunidades/${p.oportunidadeId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar à oportunidade
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-semibold">
            {p.numero} <Badge variant={meta.variant}>{meta.rotulo}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Link to={`/clientes/${p.clienteId}`} className="hover:underline">
              {p.clienteNome}
            </Link>{' '}
            · {p.oportunidadeTitulo}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/propostas/${p.id}/imprimir`)}>
            <Printer /> Visualizar / imprimir
          </Button>
          {p.status === 'RASCUNHO' && (
            <Button
              variant="outline"
              disabled={excluir.isPending}
              onClick={() => {
                if (window.confirm('Excluir este rascunho?'))
                  excluir.mutate(undefined, { onSuccess: () => navigate(`/oportunidades/${p.oportunidadeId}`, { replace: true }) })
              }}
            >
              Excluir rascunho
            </Button>
          )}
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {mensagemDeErro(erro)}
        </p>
      )}

      {p.status === 'RASCUNHO' ? (
        // a chave reinicia o formulário quando o servidor devolve dados novos
        <EditorRascunho key={`${p.id}-${p.atualizadaEm}`} proposta={p} />
      ) : (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <CardTitle>Itens</CardTitle>
            <div className="flex flex-wrap gap-2">
              {p.status === 'ENVIADA' && (
                <>
                  <Button size="sm" disabled={status.isPending} onClick={() => status.mutate('ACEITA')}>
                    Cliente aceitou
                  </Button>
                  <Button size="sm" variant="outline" disabled={status.isPending} onClick={() => status.mutate('RECUSADA')}>
                    Cliente recusou
                  </Button>
                  <Button size="sm" variant="ghost" disabled={status.isPending} onClick={() => status.mutate('RASCUNHO')}>
                    Voltar para rascunho
                  </Button>
                </>
              )}
              {p.status === 'ACEITA' && (
                <Button size="sm" variant="outline" onClick={() => navigate('/funil')}>
                  <Trophy /> Marcar a oportunidade como ganha no funil
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <TabelaItens itens={p.itens} subtotal={p.subtotal} descontoTotal={p.descontoTotal} total={p.total} />
            <div className="space-y-1 px-6 pb-5 text-sm text-muted-foreground">
              <p>Válida até: {formatData(p.validadeAte)}</p>
              {p.condicoesPagamento && <p>Pagamento: {p.condicoesPagamento}</p>}
              {p.observacoes && <p className="whitespace-pre-line">Observações: {p.observacoes}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
