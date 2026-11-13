import { cn } from '@/lib/utils'

interface Opcao<T extends string> {
  valor: T
  rotulo: string
}

interface Props<T extends string> {
  opcoes: Opcao<T>[]
  valor: T
  onChange: (valor: T) => void
  ariaLabel: string
}

/** Alternância exclusiva no estilo "pivot": o item ativo ganha sublinhado azul. */
export function SegmentedControl<T extends string>({ opcoes, valor, onChange, ariaLabel }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex max-w-full self-start overflow-x-auto rounded-sm border bg-card">
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.valor)}
            className={cn(
              'relative h-8 whitespace-nowrap border-r px-3 text-sm transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              ativo
                ? 'bg-accent font-semibold text-accent-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
