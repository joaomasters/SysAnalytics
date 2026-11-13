import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TAMANHOS_PAGINA } from '@/lib/usePaginacao'

interface Props {
  /** Página atual, começando em 0. */
  pagina: number
  tamanho: number
  total: number
  onPagina: (pagina: number) => void
  /** Se informado, mostra o seletor de itens por página. */
  onTamanho?: (tamanho: number) => void
  rotulo?: string
}

/** Rodapé de paginação: faixa exibida, itens por página e navegação. */
export function Paginacao({ pagina, tamanho, total, onPagina, onTamanho, rotulo = 'itens' }: Props) {
  if (total === 0) return null
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho))
  const de = pagina * tamanho + 1
  const ate = Math.min((pagina + 1) * tamanho, total)
  const menorOpcao = TAMANHOS_PAGINA[0]
  // Lista curta, sem seletor útil: só o contador.
  const mostrarControles = totalPaginas > 1 || (onTamanho !== undefined && total > menorOpcao)
  // Cabe numa página só: o contador do cabeçalho da lista já informa o total.
  if (!mostrarControles) return null

  return (
    <nav
      aria-label="Paginação"
      className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t bg-card px-4 py-2 text-xs text-muted-foreground"
    >
      <span>
        {de}–{ate} de {total} {rotulo}
      </span>
      {mostrarControles && (
        <div className="flex items-center gap-3">
          {onTamanho && (
            <label className="flex items-center gap-1.5">
              Por página
              <select
                value={tamanho}
                onChange={(e) => onTamanho(Number(e.target.value))}
                className="h-7 rounded-sm border border-input bg-card px-1.5 text-xs text-foreground"
              >
                {TAMANHOS_PAGINA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="tabular-nums">
            Página {pagina + 1} de {totalPaginas}
          </span>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina === 0} onClick={() => onPagina(0)} aria-label="Primeira página">
              <ChevronsLeft />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina === 0} onClick={() => onPagina(pagina - 1)} aria-label="Página anterior">
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina >= totalPaginas - 1} onClick={() => onPagina(pagina + 1)} aria-label="Próxima página">
              <ChevronRight />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pagina >= totalPaginas - 1} onClick={() => onPagina(totalPaginas - 1)} aria-label="Última página">
              <ChevronsRight />
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
