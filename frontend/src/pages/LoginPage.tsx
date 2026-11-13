import { BarChart3, ShieldCheck, Target, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { paginaInicial } from '@/auth/RotasProtegidas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const DESTAQUES = [
  { Icone: Users, texto: 'Relacionamento com a carteira e régua de churn' },
  { Icone: Target, texto: 'Funil de vendas, propostas e metas por vendedor' },
  { Icone: ShieldCheck, texto: 'Dados isolados por empresa, com acesso por perfil' },
]

export function LoginPage() {
  const { usuario, login } = useAuth()
  const navigate = useNavigate()
  const local = useLocation()
  const destino = (local.state as { de?: string } | null)?.de
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={destino ?? paginaInicial(usuario.perfil)} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await login(email, senha)
      navigate(destino ?? '/', { replace: true })
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      {/* Painel de marca */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-topbar p-12 text-topbar-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-96 rounded-full bg-sky-400/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary">
            <BarChart3 className="size-5" />
          </span>
          <span className="text-lg font-semibold">SysAnalytics</span>
        </div>
        <div className="relative max-w-lg space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-tight">CRM para revendas que vendem pelo relacionamento.</h1>
            <p className="text-white/75">
              Veja quem está esfriando, conduza cada oportunidade até a proposta e acompanhe a meta de cada vendedor.
            </p>
          </div>
          <ul className="space-y-3">
            {DESTAQUES.map(({ Icone, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-white/10">
                  <Icone className="size-4" aria-hidden />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© SysAnalytics</p>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center bg-card p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <BarChart3 className="size-5" />
            </span>
            <span className="font-semibold">SysAnalytics</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Entrar</h2>
            <p className="text-sm text-muted-foreground">Use seu e-mail e senha corporativos.</p>
          </div>
          <form onSubmit={enviar} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                className="h-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="senha" className="text-sm font-semibold">
                Senha
              </label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                className="h-9"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            {erro && (
              <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {erro}
              </p>
            )}
            <Button type="submit" size="lg" className="h-9 w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
