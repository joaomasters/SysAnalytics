import { Ban, Check, Copy, KeyRound, LockOpen, Pencil, Plus, Search, UserCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { Perfil, SenhaTemporariaResposta, UsuarioItem } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialogo } from '@/components/ui/dialogo'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useAtualizarUsuario,
  useCriarUsuario,
  useDefinirUsuarioAtivo,
  useDesbloquearUsuario,
  useEventosSeguranca,
  useRedefinirSenhaUsuario,
  useUsuarios,
  useVendedoresOpcao,
} from '@/hooks/queries'
import { useDebounce } from '@/lib/useDebounce'
import { formatDataHoraRelativa } from '@/lib/format'
import { CLASSE_CAMPO, ROTULO_EVENTO_SEGURANCA, ROTULO_PERFIL } from '@/lib/rotulos'
import { toast } from '@/lib/toast'

type Aba = 'usuarios' | 'atividade'

export function UsuariosPage() {
  const { usuario: eu } = useAuth()
  const [aba, setAba] = useState<Aba>('usuarios')
  const [busca, setBusca] = useState('')
  const [incluirInativos, setIncluirInativos] = useState(true)
  const [editando, setEditando] = useState<UsuarioItem | 'novo' | null>(null)
  const [senhaGerada, setSenhaGerada] = useState<SenhaTemporariaResposta | null>(null)
  const termo = useDebounce(busca)
  const { data: usuarios, isLoading, error } = useUsuarios(termo, incluirInativos)
  const ativo = useDefinirUsuarioAtivo()
  const redefinir = useRedefinirSenhaUsuario()
  const desbloquear = useDesbloquearUsuario()

  const souAdmin = eu?.perfil === 'ADMIN'
  // gestor não administra administradores (o backend também recusa)
  const podeGerir = (u: UsuarioItem) => souAdmin || u.perfil !== 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários e acessos</h1>
          <p className="text-sm text-muted-foreground">Quem acessa o sistema, com qual perfil, e o histórico de segurança</p>
        </div>
        <Button onClick={() => setEditando('novo')}>
          <Plus /> Novo usuário
        </Button>
      </div>

      <SegmentedControl
        ariaLabel="Seção"
        opcoes={[
          { valor: 'usuarios', rotulo: 'Usuários' },
          { valor: 'atividade', rotulo: 'Atividade de segurança' },
        ]}
        valor={aba}
        onChange={setAba}
      />

      {aba === 'atividade' ? (
        <Atividade />
      ) : (
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Usuários da empresa</CardTitle>
                <CardDescription>{usuarios ? `${usuarios.length} usuário(s)` : 'Carregando…'}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={incluirInativos} onChange={(e) => setIncluirInativos(e.target.checked)} />
                  Mostrar inativos
                </label>
                <label className="relative block">
                  <span className="sr-only">Buscar usuário</span>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou e-mail" className="h-8 w-56 pl-8" />
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <p role="alert" className="text-sm text-destructive">{mensagemDeErro(error)}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Carregando…</TableCell>
                    </TableRow>
                  )}
                  {usuarios?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum usuário encontrado</TableCell>
                    </TableRow>
                  )}
                  {usuarios?.map((u) => {
                    const euMesmo = u.id === eu?.id
                    const gerir = podeGerir(u)
                    return (
                      <TableRow key={u.id} className={u.ativo ? undefined : 'opacity-60'}>
                        <TableCell>
                          <p className="font-medium">
                            {u.nome} {euMesmo && <span className="text-xs font-normal text-muted-foreground">(você)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </TableCell>
                        <TableCell>
                          {ROTULO_PERFIL[u.perfil]}
                          {u.vendedorNome && <p className="text-xs text-muted-foreground">Carteira: {u.vendedorNome}</p>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={u.ativo ? 'ok' : 'neutro'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                            {u.bloqueado && <Badge variant="critico">Bloqueado</Badge>}
                            {u.senhaTemporaria && <Badge variant="alerta">Senha temporária</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.ultimoLoginEm ? formatDataHoraRelativa(u.ultimoLoginEm) : 'Nunca acessou'}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {gerir && (
                              <>
                                <Button variant="ghost" size="icon" aria-label={`Editar ${u.nome}`} title="Editar" onClick={() => setEditando(u)}>
                                  <Pencil />
                                </Button>
                                {u.bloqueado && (
                                  <Button variant="ghost" size="icon" aria-label="Desbloquear" title="Desbloquear" disabled={desbloquear.isPending}
                                    onClick={() => desbloquear.mutate(u.id, { onSuccess: () => toast.sucesso(`${u.nome} desbloqueado.`) })}>
                                    <LockOpen />
                                  </Button>
                                )}
                                {!euMesmo && u.ativo && (
                                  <Button variant="ghost" size="icon" aria-label="Redefinir senha" title="Redefinir senha" disabled={redefinir.isPending}
                                    onClick={() => {
                                      if (window.confirm(`Gerar uma nova senha temporária para ${u.nome}? As sessões abertas dele serão encerradas.`)) {
                                        redefinir.mutate(u.id, { onSuccess: setSenhaGerada })
                                      }
                                    }}>
                                    <KeyRound />
                                  </Button>
                                )}
                                {!euMesmo && (
                                  <Button variant="ghost" size="icon" aria-label={u.ativo ? 'Desativar' : 'Reativar'} title={u.ativo ? 'Desativar' : 'Reativar'} disabled={ativo.isPending}
                                    onClick={() => {
                                      if (u.ativo && !window.confirm(`Desativar ${u.nome}? Ele perde o acesso imediatamente.`)) return
                                      ativo.mutate({ id: u.id, ativo: !u.ativo }, { onSuccess: () => toast.sucesso(u.ativo ? `${u.nome} desativado.` : `${u.nome} reativado.`) })
                                    }}>
                                    {u.ativo ? <Ban /> : <UserCheck />}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {editando && (
        <FormUsuario
          usuario={editando === 'novo' ? null : editando}
          souAdmin={souAdmin}
          euMesmo={editando !== 'novo' && editando.id === eu?.id}
          onFechar={() => setEditando(null)}
          onSenhaGerada={(r) => {
            setEditando(null)
            setSenhaGerada(r)
          }}
        />
      )}
      {senhaGerada && <SenhaGerada resposta={senhaGerada} onFechar={() => setSenhaGerada(null)} />}
    </div>
  )
}

function FormUsuario({ usuario, souAdmin, euMesmo, onFechar, onSenhaGerada }: {
  usuario: UsuarioItem | null
  souAdmin: boolean
  euMesmo: boolean
  onFechar: () => void
  onSenhaGerada: (r: SenhaTemporariaResposta) => void
}) {
  const criar = useCriarUsuario()
  const atualizar = useAtualizarUsuario()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [perfil, setPerfil] = useState<Perfil>(usuario?.perfil ?? 'VENDEDOR')
  const [vendedorId, setVendedorId] = useState<number | null>(usuario?.vendedorId ?? null)
  const [erro, setErro] = useState<string | null>(null)
  const { data: vendedores } = useVendedoresOpcao(perfil === 'VENDEDOR')
  const salvando = criar.isPending || atualizar.isPending

  function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (perfil === 'VENDEDOR' && vendedorId == null) {
      setErro('Selecione o vendedor (carteira) deste usuário.')
      return
    }
    const dados = { nome: nome.trim(), email: email.trim(), perfil, vendedorId: perfil === 'VENDEDOR' ? vendedorId : null }
    if (usuario) {
      atualizar.mutate({ id: usuario.id, dados }, {
        onSuccess: () => {
          toast.sucesso('Usuário atualizado.')
          onFechar()
        },
        onError: (err) => setErro(mensagemDeErro(err)),
      })
    } else {
      criar.mutate(dados, { onSuccess: onSenhaGerada, onError: (err) => setErro(mensagemDeErro(err)) })
    }
  }

  return (
    <Dialogo titulo={usuario ? 'Editar usuário' : 'Novo usuário'} descricao={usuario ? undefined : 'Uma senha temporária será gerada; o usuário a troca no primeiro acesso.'} onFechar={onFechar}>
      <form onSubmit={enviar} className="space-y-4">
        <Campo id="u-nome" rotulo="Nome">
          <Input id="u-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required className="h-9" />
        </Campo>
        <Campo id="u-email" rotulo="E-mail (login)">
          <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} required className="h-9" />
        </Campo>
        <Campo id="u-perfil" rotulo="Perfil">
          <select id="u-perfil" className={`${CLASSE_CAMPO} h-9`} value={perfil} disabled={euMesmo} onChange={(e) => setPerfil(e.target.value as Perfil)}>
            <option value="VENDEDOR">Vendedor — vê só a própria carteira</option>
            <option value="GESTOR">Gestor — vê toda a empresa e o financeiro</option>
            {(souAdmin || perfil === 'ADMIN') && <option value="ADMIN">Administrador — acesso total e gestão de administradores</option>}
          </select>
          {euMesmo && <p className="text-xs text-muted-foreground">Você não pode alterar o seu próprio perfil.</p>}
        </Campo>
        {perfil === 'VENDEDOR' && (
          <Campo id="u-vendedor" rotulo="Vendedor (carteira)">
            <select id="u-vendedor" className={`${CLASSE_CAMPO} h-9`} value={vendedorId ?? ''} onChange={(e) => setVendedorId(e.target.value ? Number(e.target.value) : null)} required>
              <option value="">Selecione…</option>
              {vendedores?.map((v) => (
                <option key={v.id} value={v.id} disabled={v.vinculado && v.id !== usuario?.vendedorId}>
                  {v.nome}{v.vinculado && v.id !== usuario?.vendedorId ? ' (já tem usuário)' : ''}
                </option>
              ))}
            </select>
          </Campo>
        )}
        {usuario && <p className="text-xs text-muted-foreground">Mudanças de perfil, e-mail ou carteira encerram as sessões abertas deste usuário.</p>}
        {erro && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : usuario ? 'Salvar' : 'Criar usuário'}</Button>
        </div>
      </form>
    </Dialogo>
  )
}

function SenhaGerada({ resposta, onFechar }: { resposta: SenhaTemporariaResposta; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(resposta.senhaTemporaria)
      setCopiado(true)
    } catch {
      toast.erro('Não foi possível copiar. Selecione a senha e copie manualmente.')
    }
  }
  return (
    <Dialogo titulo="Senha temporária gerada" onFechar={onFechar}>
      <div className="space-y-4">
        <p className="text-sm">
          Entregue a senha abaixo a <strong>{resposta.usuario.nome}</strong> ({resposta.usuario.email}). Ela é exibida
          <strong> uma única vez</strong> e deve ser trocada no primeiro acesso.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all rounded-sm border bg-muted px-3 py-2 text-center font-mono text-lg tracking-wider">{resposta.senhaTemporaria}</code>
          <Button variant="outline" onClick={copiar} aria-label="Copiar senha">
            {copiado ? <Check /> : <Copy />} {copiado ? 'Copiada' : 'Copiar'}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={onFechar}>Concluir</Button>
        </div>
      </div>
    </Dialogo>
  )
}

function Atividade() {
  const { data, isLoading, error } = useEventosSeguranca()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade de segurança</CardTitle>
        <CardDescription>Últimos 100 eventos: acessos, bloqueios, trocas de senha e alterações de usuários</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p role="alert" className="text-sm text-destructive">{mensagemDeErro(error)}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Detalhe</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando…</TableCell></TableRow>
              )}
              {data?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum evento registrado ainda</TableCell></TableRow>
              )}
              {data?.map((e) => {
                const r = ROTULO_EVENTO_SEGURANCA[e.tipo] ?? { rotulo: e.tipo, tom: 'neutro' as const }
                const mesmo = !e.alvoNome || e.alvoNome === e.usuarioNome
                return (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDataHoraRelativa(e.criadoEm)}</TableCell>
                    <TableCell><Badge variant={r.tom}>{r.rotulo}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {e.usuarioNome ?? '—'}
                      {!mesmo && <span className="text-muted-foreground"> → {e.alvoNome}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.detalhe ?? ''}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.ip ?? ''}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
