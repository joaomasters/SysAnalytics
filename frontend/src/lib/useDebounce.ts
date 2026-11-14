import { useEffect, useState } from 'react'

/** Atrasa a propagação de um valor (ex.: texto de busca) para não consultar a API a cada tecla. */
export function useDebounce<T>(valor: T, ms = 300) {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return v
}
