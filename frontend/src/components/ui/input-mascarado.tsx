import { forwardRef, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/input'
import { exibir, extrair, type OpcoesMascara, type TipoMascara } from '@/lib/mascaras'

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'max'>,
    OpcoesMascara {
  mascara: TipoMascara
  /** Valor bruto (ex.: moeda "1234.56"). */
  value: string
  onValueChange: (bruto: string) => void
}

const MODO: Partial<Record<TipoMascara, InputHTMLAttributes<HTMLInputElement>['inputMode']>> = {
  moeda: 'numeric',
  percentual: 'numeric',
  decimal: 'numeric',
  inteiro: 'numeric',
  telefone: 'tel',
  documento: 'numeric',
  cep: 'numeric',
  email: 'email',
}

/** Campo de texto com máscara: guarda o valor bruto no formulário e mostra o formatado. */
export const InputMascarado = forwardRef<HTMLInputElement, Props>(
  ({ mascara, value, onValueChange, casas, max, tamanho, permitirZero, className, ...props }, ref) => {
    const opcoes = { casas, max, tamanho, permitirZero }
    const alinhaDireita = mascara === 'moeda' || mascara === 'percentual' || mascara === 'decimal' || mascara === 'inteiro'
    return (
      <Input
        ref={ref}
        type="text"
        inputMode={MODO[mascara]}
        autoComplete="off"
        className={[alinhaDireita ? 'text-right tabular-nums' : '', className].filter(Boolean).join(' ')}
        value={exibir(mascara, value, opcoes)}
        onChange={(e) => onValueChange(extrair(mascara, e.target.value, opcoes))}
        {...props}
      />
    )
  },
)
InputMascarado.displayName = 'InputMascarado'
