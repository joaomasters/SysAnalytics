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

/** Grupo de botões exclusivos (equivalente ao ToggleGroup/Tabs do shadcn). */
export function SegmentedControl<T extends string>({ opcoes, valor, onChange, ariaLabel }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex max-w-full self-start overflow-x-auto rounded-lg border bg-muted p-1">
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
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              ativo ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
