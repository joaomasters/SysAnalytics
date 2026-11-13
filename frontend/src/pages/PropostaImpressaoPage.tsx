import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import { TabelaItens } from '@/components/proposta/TabelaItens'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProposta } from '@/hooks/queries'
import { formatData } from '@/lib/format'

/**
 * Documento da proposta pronto para impressão. O menu e o topo do app somem na impressão (print:hidden),
 * então "Imprimir" -> "Salvar como PDF" do navegador gera o PDF.
 */
export function PropostaImpressaoPage() {
  const id = Number(useParams().id)
  const { data: p, isLoading, isError, error } = useProposta(id)

  if (isLoading) return <Skeleton className="mx-auto h-96 max-w-3xl" />
  if (isError || !p) {
    return <p className="text-sm text-red-700">Não foi possível carregar a proposta: {mensagemDeErro(error)}</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link to={`/propostas/${p.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <Button onClick={() => window.print()}>
          <Printer /> Imprimir / salvar PDF
        </Button>
      </div>
      {p.status === 'RASCUNHO' && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 print:hidden">
          Esta proposta ainda é um rascunho. Envie-a antes de compartilhar com o cliente.
        </p>
      )}

      <article className="space-y-6 rounded-lg border bg-white p-8 text-slate-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">{p.empresaNome}</h1>
            <p className="text-sm text-slate-600">Proposta comercial</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-bold">{p.numero}</p>
            <p className="text-slate-600">Emitida em {new Date(p.criadaEm).toLocaleDateString('pt-BR')}</p>
            {p.validadeAte && <p className="text-slate-600">Válida até {formatData(p.validadeAte)}</p>}
          </div>
        </header>

        <section className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</h2>
            <p className="font-semibold">{p.clienteRazaoSocial}</p>
            <p>CNPJ {p.clienteCnpj}</p>
            {p.contatoNome && (
              <p>
                A/C {p.contatoNome}
                {p.contatoEmail && ` · ${p.contatoEmail}`}
              </p>
            )}
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Referente a</h2>
            <p className="font-semibold">{p.oportunidadeTitulo}</p>
            <p>Elaborada por {p.elaboradaPor}</p>
          </div>
        </section>

        <TabelaItens itens={p.itens} subtotal={p.subtotal} descontoTotal={p.descontoTotal} total={p.total} />

        {(p.condicoesPagamento || p.observacoes) && (
          <section className="space-y-3 text-sm">
            {p.condicoesPagamento && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Condições de pagamento</h2>
                <p>{p.condicoesPagamento}</p>
              </div>
            )}
            {p.observacoes && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</h2>
                <p className="whitespace-pre-line">{p.observacoes}</p>
              </div>
            )}
          </section>
        )}

        <footer className="grid grid-cols-2 gap-10 pt-12 text-center text-xs text-slate-600">
          <div className="border-t border-slate-400 pt-1">{p.empresaNome}</div>
          <div className="border-t border-slate-400 pt-1">{p.clienteRazaoSocial}</div>
        </footer>
      </article>
    </div>
  )
}
