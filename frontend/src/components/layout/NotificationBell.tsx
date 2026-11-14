import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { RiscoBadge } from '@/components/RiscoBadge'
import {
  useContagemNaoLidas,
  useMarcarComoLida,
  useMarcarTodasComoLidas,
  useNotificacoes,
} from '@/hooks/queries'
import { formatDataHoraRelativa } from '@/lib/format'

/** Ícone de notificações com contador de não lidas e pré-visualização do feed. */
export function NotificationBell() {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: naoLidas = 0 } = useContagemNaoLidas()
  const { data: pagina } = useNotificacoes(true)
  const marcarLida = useMarcarComoLida()
  const marcarTodas = useMarcarTodasComoLidas()

  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fechar)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  const itens = pagina?.conteudo.slice(0, 6) ?? []

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notificações: ${naoLidas} não lidas`}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="relative h-9 w-9 text-topbar-foreground hover:bg-white/10 hover:text-topbar-foreground"
      >
        <Bell className="!size-5" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-topbar">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </Button>

      {aberto && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded border bg-popover text-popover-foreground shadow-flutuante animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Alertas não lidos</p>
            <Button
              variant="ghost"
              size="sm"
              disabled={naoLidas === 0 || marcarTodas.isPending}
              onClick={() => marcarTodas.mutate()}
            >
              <CheckCheck /> Marcar todos
            </Button>
          </div>

          <ul className="max-h-96 divide-y overflow-y-auto">
            {itens.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum alerta pendente 🎉</li>
            )}
            {itens.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-muted/60"
                  onClick={() => marcarLida.mutate(n.id)}
                  title="Marcar como lido"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <RiscoBadge nivel={n.nivel} />
                    <span className="text-xs text-muted-foreground">{formatDataHoraRelativa(n.criadaEm)}</span>
                  </div>
                  <p className="text-sm leading-snug">{n.mensagem}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t p-2">
            <Link
              to="/alertas"
              onClick={() => setAberto(false)}
              className="block rounded-md py-2 text-center text-sm font-medium text-primary hover:bg-muted/60"
            >
              Ver central de alertas
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
