import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast, type Toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const ESTILO = {
  erro: { Icone: AlertCircle, classe: 'border-red-300 bg-red-50 text-red-900' },
  sucesso: { Icone: CheckCircle2, classe: 'border-green-300 bg-green-50 text-green-900' },
  info: { Icone: Info, classe: 'border-sky-300 bg-sky-50 text-sky-900' },
} as const

/** Pilha de avisos no canto da tela. Montar uma única vez, perto da raiz do app. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => toast.assinar(setToasts), [])
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 print:hidden" aria-live="polite">
      {toasts.map((t) => {
        const { Icone, classe } = ESTILO[t.tipo]
        return (
          <div key={t.id} role={t.tipo === 'erro' ? 'alert' : 'status'} className={cn('pointer-events-auto flex items-start gap-2 rounded-sm border p-3 text-sm shadow-flutuante', classe)}>
            <Icone className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 break-words">{t.mensagem}</p>
            <button type="button" aria-label="Fechar aviso" onClick={() => toast.fechar(t.id)} className="rounded-sm p-0.5 hover:bg-black/10">
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
