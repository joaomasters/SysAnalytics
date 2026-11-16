import { Check, Circle, Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import { paginaInicial } from '@/auth/RotasProtegidas'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ROTULO_PERFIL } from '@/lib/rotulos'
import { regrasDeSenha, senhaValida } from '@/lib/senha'
import { toast } from '@/lib/toast'

export function ContaPage() {
  const { usuario, trocarSenha } = useAuth()
  const navigate = useNavigate()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!usuario) return null
  const regras = regrasDeSenha(nova)
  const confere = nova.length > 0 && nova === confirmacao
  const podeEnviar = atual.length > 0 && senhaValida(nova) && confere && !enviando

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!podeEnviar) return
    setErro(null)
    setEnviando(true)
    try {
      const eraTemporaria = usuario!.senhaTemporaria
      await trocarSenha(atual, nova)
      toast.sucesso('Senha alterada. As outras sessões abertas foram encerradas.')
      setAtual('')
      setNova('')
      setConfirmacao('')
      if (eraTemporaria) navigate(paginaInicial(usuario!.perfil), { replace: true })
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  const tipo = mostrar ? 'text' : 'password'
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha conta</h1>
        <p className="text-sm text-muted-foreground">Seus dados de acesso e a troca de senha</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados de acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Item rotulo="Nome" valor={usuario.nome} />
            <Item rotulo="E-mail" valor={usuario.email} />
            <Item rotulo="Perfil" valor={ROTULO_PERFIL[usuario.perfil]} />
            <Item rotulo="Empresa" valor={usuario.empresaNome} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <CardDescription>
            {usuario.senhaTemporaria
              ? 'Sua senha atual é temporária: cadastre uma nova para continuar.'
              : 'Ao trocar, as outras sessões abertas com a senha antiga são encerradas.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="space-y-4" autoComplete="off">
            <Campo id="senha-atual" rotulo="Senha atual">
              <Input id="senha-atual" type={tipo} autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} className="h-9" required />
            </Campo>
            <Campo id="senha-nova" rotulo="Nova senha">
              <Input id="senha-nova" type={tipo} autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} className="h-9" required />
            </Campo>
            <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos da senha">
              {regras.map((r) => (
                <li key={r.rotulo} className={`flex items-center gap-1.5 ${r.ok ? 'text-green-700' : 'text-muted-foreground'}`}>
                  {r.ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                  {r.rotulo}
                </li>
              ))}
            </ul>
            <Campo id="senha-confirma" rotulo="Confirmar nova senha">
              <Input id="senha-confirma" type={tipo} autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="h-9" required />
            </Campo>
            {confirmacao.length > 0 && !confere && <p className="text-xs text-red-700">As senhas não conferem.</p>}
            <button type="button" onClick={() => setMostrar((v) => !v)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              {mostrar ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
            </button>
            {erro && (
              <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {erro}
              </p>
            )}
            <Button type="submit" disabled={!podeEnviar}>
              {enviando ? 'Salvando…' : 'Alterar senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  )
}
