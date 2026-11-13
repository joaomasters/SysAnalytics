import { useEffect, useMemo, useState } from 'react'

export const TAMANHOS_PAGINA = [10, 25, 50, 100] as const

/** Paginação no cliente para listas já carregadas. Volta à página 1 quando a lista muda de tamanho ou os filtros mudam. */
export function usePaginacao<T>(itens: T[] | undefined, tamanhoInicial = 10, reiniciarQuando: unknown = null) {
  const [pagina, setPagina] = useState(0)
  const [tamanho, setTamanho] = useState(tamanhoInicial)
  const total = itens?.length ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho))

  useEffect(() => setPagina(0), [reiniciarQuando, tamanho])
  useEffect(() => {
    if (pagina > totalPaginas - 1) setPagina(totalPaginas - 1)
  }, [pagina, totalPaginas])

  const visiveis = useMemo(() => (itens ?? []).slice(pagina * tamanho, (pagina + 1) * tamanho), [itens, pagina, tamanho])
  return { visiveis, pagina, setPagina, tamanho, setTamanho, total, totalPaginas }
}
