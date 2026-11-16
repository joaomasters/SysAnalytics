import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface Props {
  titulo: string
  descricao?: string
  onFechar: () => void
  children: ReactNode
}

/** Janela modal simples: fecha com Esc ou clicando fora; foco permanece no conteúdo. */
export function Dialogo({ titulo, descricao, onFechar, children }: Props) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={onFechar} tabIndex={-1} />
      <div role="dialog" aria-modal="true" aria-label={titulo} className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border bg-card p-6 shadow-flutuante">
        <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground hover:bg-accent">
          <X className="size-4" />
        </button>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
