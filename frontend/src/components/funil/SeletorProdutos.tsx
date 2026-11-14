import { Trash2 } from 'lucide-react'
import type { Produto } from '@/api/types'
import { Button } from '@/components/ui/button'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { useProdutos } from '@/hooks/queries'
import { formatBRL } from '@/lib/format'
import { CLASSE_CAMPO } from '@/lib/rotulos'

export interface LinhaProduto {
  chave: number
  produtoId: number
  quantidade: string
}

let proxima = 1
export const novaLinha = (produtoId: number, quantidade = '1'): LinhaProduto => ({ chave: proxima++, produtoId, quantidade })

/** Soma quantidade x preço de catálogo das linhas. */
export function totalLinhas(linhas: LinhaProduto[], produtos: Produto[] | undefined): number {
  return linhas.reduce((acc, l) => {
    const p = produtos?.find((x) => x.id === l.produtoId)
    return acc + (p ? p.precoUnitario * (Number(l.quantidade) || 0) : 0)
  }, 0)
}

interface Props {
  linhas: LinhaProduto[]
  onChange: (linhas: LinhaProduto[]) => void
}

/** Escolhe produtos do catálogo da empresa com a quantidade de cada um. */
export function SeletorProdutos({ linhas, onChange }: Props) {
  const { data: produtos, isLoading } = useProdutos('')
  const total = totalLinhas(linhas, produtos)

  function adicionar(id: string) {
    if (!id) return
    const existente = linhas.find((l) => l.produtoId === Number(id))
    if (existente) {
      onChange(linhas.map((l) => (l === existente ? { ...l, quantidade: String(Number(l.quantidade || 0) + 1) } : l)))
    } else {
      onChange([...linhas, novaLinha(Number(id))])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Adicionar produto do catálogo"
          className={`${CLASSE_CAMPO} h-9 w-full sm:w-96`}
          value=""
          onChange={(e) => adicionar(e.target.value)}
          disabled={isLoading}
        >
          <option value="">{isLoading ? 'Carregando catálogo…' : 'Adicionar produto do catálogo…'}</option>
          {produtos?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} · {p.nome} · {formatBRL(p.precoUnitario)}/{p.unidade}
            </option>
          ))}
        </select>
        {!isLoading && produtos?.length === 0 && (
          <span className="text-xs text-muted-foreground">Catálogo vazio: cadastre produtos em Comercial › Catálogo.</span>
        )}
      </div>

      {linhas.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Produto</th>
                <th className="w-32 px-3 py-2 text-right font-medium">Quantidade</th>
                <th className="px-3 py-2 text-right font-medium">Preço</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const p = produtos?.find((x) => x.id === l.produtoId)
                return (
                  <tr key={l.chave} className="border-t">
                    <td className="px-3 py-2">{p ? `${p.codigo} · ${p.nome}` : `Produto #${l.produtoId}`}</td>
                    <td className="px-3 py-1.5">
                      <InputMascarado
                        aria-label={`Quantidade de ${p?.nome ?? 'produto'}`}
                        mascara="decimal"
                        className="h-8 text-right"
                        value={l.quantidade}
                        onValueChange={(v) => onChange(linhas.map((x) => (x === l ? { ...x, quantidade: v } : x)))}
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p ? `${formatBRL(p.precoUnitario)}/${p.unidade}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {p ? formatBRL(p.precoUnitario * (Number(l.quantidade) || 0)) : '—'}
                    </td>
                    <td className="px-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remover produto"
                        onClick={() => onChange(linhas.filter((x) => x !== l))}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold">
                <td className="px-3 py-2" colSpan={3}>
                  Valor estimado (soma dos produtos)
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatBRL(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {linhas.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Opcional: escolha produtos do catálogo e o valor estimado é calculado sozinho.
        </p>
      )}
    </div>
  )
}
