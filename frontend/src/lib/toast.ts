/** Avisos rápidos (toasts) sem dependências: qualquer código pode chamar `toast.erro(...)`. */
export type TipoToast = 'erro' | 'sucesso' | 'info'
export interface Toast {
  id: number
  tipo: TipoToast
  mensagem: string
}

type Ouvinte = (toasts: Toast[]) => void

let proximoId = 1
let lista: Toast[] = []
const ouvintes = new Set<Ouvinte>()

function emitir() {
  ouvintes.forEach((o) => o(lista))
}

function adicionar(tipo: TipoToast, mensagem: string, duracaoMs: number) {
  // evita empilhar o mesmo aviso repetido (ex.: vários refetchs falhando juntos)
  if (lista.some((t) => t.tipo === tipo && t.mensagem === mensagem)) return
  const id = proximoId++
  lista = [...lista, { id, tipo, mensagem }].slice(-4)
  emitir()
  setTimeout(() => toast.fechar(id), duracaoMs)
}

export const toast = {
  erro: (mensagem: string) => adicionar('erro', mensagem, 8000),
  sucesso: (mensagem: string) => adicionar('sucesso', mensagem, 4000),
  info: (mensagem: string) => adicionar('info', mensagem, 5000),
  fechar: (id: number) => {
    lista = lista.filter((t) => t.id !== id)
    emitir()
  },
  assinar: (o: Ouvinte) => {
    ouvintes.add(o)
    o(lista)
    return () => {
      ouvintes.delete(o)
    }
  },
}
