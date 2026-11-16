import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  /** Quando muda (ex.: a rota), o erro é limpo e a tela tenta renderizar de novo. */
  chaveReset?: string
}

interface Estado {
  erro: Error | null
  chave?: string
}

/** Evita a "tela branca": um erro de renderização mostra um aviso com saída em vez de derrubar o app inteiro. */
export class ErrorBoundary extends Component<Props, Estado> {
  state: Estado = { erro: null, chave: this.props.chaveReset }

  static getDerivedStateFromError(erro: Error): Partial<Estado> {
    return { erro }
  }

  static getDerivedStateFromProps(props: Props, estado: Estado): Partial<Estado> | null {
    if (props.chaveReset !== estado.chave) return { erro: null, chave: props.chaveReset }
    return null
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro de renderização', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div role="alert" className="mx-auto mt-16 max-w-md space-y-4 rounded-sm border bg-card p-6 text-center">
        <AlertTriangle className="mx-auto size-8 text-amber-600" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Algo deu errado nesta tela</h2>
          <p className="text-sm text-muted-foreground">
            O restante do sistema continua funcionando. Tente recarregar; se o problema persistir, avise o suporte.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Recarregar a página</Button>
          <Button variant="outline" onClick={() => this.setState({ erro: null })}>
            Tentar de novo
          </Button>
        </div>
      </div>
    )
  }
}
