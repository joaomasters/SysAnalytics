import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { PropostaDetalhe, PropostaInput } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { useAtualizarProposta, useProdutos, useStatusProposta } from '@/hooks/queries'
import { formatBRL } from '@/lib/format'
import { CLASSE_CAMPO, dataISO } from '@/lib/rotulos'

/** Valores como texto para o usuário poder digitar livremente; convertidos só ao salvar. */
interface Linha {
  chave: number
  produtoId: number | null
  descricao: string
  unidade: string
  quantidade: string
  preco: string
  desconto: string
}

let proximaChave = 1

/** Total da linha só para exibição; o valor oficial vem do servidor depois de salvar. */
function totalLinha(l: Linha) {
  const q = Number(l.quantidade) || 0
  const p = Number(l.preco) || 0
  const d = Math.min(Math.max(Number(l.desconto) || 0, 0), 100)
  return Math.round(q * p * (1 - d / 100) * 100) / 100
}

/** Editor da proposta em rascunho: cabeçalho, itens (do catálogo ou avulsos) e envio. */
export function EditorRascunho({ proposta }: { proposta: PropostaDetalhe }) {
  const salvar = useAtualizarProposta(proposta.id)
  const status = useStatusProposta(proposta.id)
  const { data: produtos } = useProdutos('')
  const [validade, setValidade] = useState(proposta.validadeAte ?? '')
  const [condicoes, setCondicoes] = useState(proposta.condicoesPagamento ?? '')
  const [observacoes, setObservacoes] = useState(proposta.observacoes ?? '')
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    proposta.itens.map((i) => ({
      chave: proximaChave++,
      produtoId: i.produtoId,
      descricao: i.descricao,
      unidade: i.unidade,
      quantidade: String(i.quantidade),
      preco: String(i.precoUnitario),
      desconto: String(i.descontoPercentual),
    })),
  )
  const [salvoEm, setSalvoEm] = useState<Date | null>(null)

  const total = useMemo(() => linhas.reduce((s, l) => s + totalLinha(l), 0), [linhas])
  const ocupado = salvar.isPending || status.isPending
  const erro = salvar.error ?? status.error

  const mudar = (chave: number, campo: keyof Linha, valor: string) =>
    setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)))

  const corpo = (): PropostaInput => ({
    validadeAte: validade || undefined,
    condicoesPagamento: condicoes.trim() || undefined,
    observacoes: observacoes.trim() || undefined,
    itens: linhas.map((l) => ({
      produtoId: l.produtoId,
      descricao: l.descricao.trim(),
      unidade: l.unidade.trim() || 'UN',
      quantidade: Number(l.quantidade),
      precoUnitario: Number(l.preco),
      descontoPercentual: Number(l.desconto) || 0,
    })),
  })

  const linhasValidas = linhas.every((l) => l.descricao.trim() && Number(l.quantidade) > 0 && l.preco !== '')

  function adicionarDoCatalogo(id: string) {
    const p = produtos?.find((x) => x.id === Number(id))
    if (!p) return
    setLinhas((ls) => [
      ...ls,
      {
        chave: proximaChave++,
        produtoId: p.id,
        descricao: p.nome,
        unidade: p.unidade,
        quantidade: '1',
        preco: String(p.precoUnitario),
        desconto: '0',
      },
    ])
  }

  const adicionarAvulso = () =>
    setLinhas((ls) => [
      ...ls,
      { chave: proximaChave++, produtoId: null, descricao: '', unidade: 'UN', quantidade: '1', preco: '', desconto: '0' },
    ])

  async function salvarRascunho() {
    await salvar.mutateAsync(corpo())
    setSalvoEm(new Date())
  }

  async function enviar() {
    if (!window.confirm('Enviar a proposta? Depois de enviada ela não pode mais ser editada.')) return
    await salvar.mutateAsync(corpo())
    await status.mutateAsync('ENVIADA')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar proposta</CardTitle>
        <CardDescription>Monte os itens, defina as condições e envie quando estiver pronta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="pr-validade" className="text-sm font-medium">
              Válida até
            </label>
            <Input id="pr-validade" type="date" min={dataISO(0)} value={validade} onChange={(e) => setValidade(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="pr-cond" className="text-sm font-medium">
              Condições de pagamento
            </label>
            <Input
              id="pr-cond"
              maxLength={200}
              placeholder="Ex.: 30/60/90 dias, boleto"
              value={condicoes}
              onChange={(e) => setCondicoes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Itens</h3>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Adicionar produto do catálogo"
                className={`${CLASSE_CAMPO} h-9 w-64`}
                value=""
                onChange={(e) => adicionarDoCatalogo(e.target.value)}
              >
                <option value="">Adicionar do catálogo…</option>
                {produtos?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nome} · {formatBRL(p.precoUnitario)}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={adicionarAvulso}>
                <Plus /> Item avulso
              </Button>
            </div>
          </div>

          {linhas.length === 0 && (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              Nenhum item. Adicione um produto do catálogo ou um item avulso.
            </p>
          )}

          <ul className="space-y-2">
            {linhas.map((l, idx) => (
              <li key={l.chave} className="grid items-end gap-2 rounded-md border p-3 sm:grid-cols-12">
                <div className="space-y-1 sm:col-span-4">
                  <label htmlFor={`d-${l.chave}`} className="text-xs font-medium">
                    Descrição {idx === 0 && '*'}
                  </label>
                  <InputMascarado id={`d-${l.chave}`} mascara="texto" tamanho={160} required value={l.descricao} onValueChange={(v) => mudar(l.chave, 'descricao', v)} />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <label htmlFor={`u-${l.chave}`} className="text-xs font-medium">
                    Un.
                  </label>
                  <InputMascarado id={`u-${l.chave}`} mascara="codigo" tamanho={10} required value={l.unidade} onValueChange={(v) => mudar(l.chave, 'unidade', v)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor={`q-${l.chave}`} className="text-xs font-medium">
                    Qtd.
                  </label>
                  <InputMascarado id={`q-${l.chave}`} mascara="decimal" casas={3} required value={l.quantidade} onValueChange={(v) => mudar(l.chave, 'quantidade', v)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor={`p-${l.chave}`} className="text-xs font-medium">
                    Preço unit. (R$)
                  </label>
                  <InputMascarado id={`p-${l.chave}`} mascara="moeda" permitirZero required placeholder="0,00" value={l.preco} onValueChange={(v) => mudar(l.chave, 'preco', v)} />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <label htmlFor={`x-${l.chave}`} className="text-xs font-medium">
                    Desc. %
                  </label>
                  <InputMascarado id={`x-${l.chave}`} mascara="percentual" permitirZero value={l.desconto} onValueChange={(v) => mudar(l.chave, 'desconto', v)} />
                </div>
                <div className="flex items-center justify-between gap-1 sm:col-span-2">
                  <span className="text-sm font-semibold tabular-nums">{formatBRL(totalLinha(l))}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover item ${l.descricao || idx + 1}`}
                    onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-right text-sm">
            Total estimado: <strong className="text-base tabular-nums">{formatBRL(total)}</strong>
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pr-obs" className="text-sm font-medium">
            Observações
          </label>
          <textarea id="pr-obs" rows={3} maxLength={1000} className={CLASSE_CAMPO} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>

        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {mensagemDeErro(erro)}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {salvoEm && !ocupado && (
            <span className="text-xs text-muted-foreground">Salvo às {salvoEm.toLocaleTimeString('pt-BR')}</span>
          )}
          <Button type="button" variant="outline" disabled={ocupado || !linhasValidas} onClick={salvarRascunho}>
            {salvar.isPending ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
          <Button type="button" disabled={ocupado || linhas.length === 0 || !linhasValidas} onClick={enviar}>
            Salvar e enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
