import type { ReactNode } from 'react'

/** Rótulo + controle de formulário. */
export function Campo({ id, rotulo, className, children }: { id: string; rotulo: string; className?: string; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      {children}
    </div>
  )
}
