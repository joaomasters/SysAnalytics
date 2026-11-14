import { ClipboardList, MessageSquarePlus, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { Contato, TipoInteracao } from '@/api/types'
import { TarefaItem } from '@/components/tarefas/TarefaItem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Input } from '@/components/ui/input'
import { Paginacao } from '@/components/ui/paginacao'
import { Skeleton } from '@/components/ui/skeleton'
import { useCriarTarefa, useInteracoes, useRegistrarInteracao, useTarefas } from '@/hooks/queries'
import { usePaginacao } from '@/lib/usePaginacao'
import { CLASSE_CAMPO, dataISO, rotuloTipo, TIPOS_INTERACAO } from '@/lib/rotulos'

/** Histórico de interações do cliente + formulário para registrar uma nova. */
export function InteracoesCard({ clienteId, contatos }: { clienteId: number; contatos: Contato[] }) {
  const { data, isLoading, isError, error } = useInteracoes(clienteId)
  const registrar = useRegistrarInteracao(clienteId)
  const pg = usePaginacao(data, 5)
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<TipoInteracao>('LIGACAO')
  const [resumo, setResumo] = useState('')
  const [contatoId, setContatoId] = useState('')

  const fechar = () => {
    setAberto(false)
    setResumo('')
    setContatoId('')
    registrar.reset()
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    registrar.mutate(
      { tipo, resumo: resumo.trim(), contatoId: contatoId ? Number(contatoId) : undefined },
      { onSuccess: fechar },
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Histórico de interações</CardTitle>
          <CardDescription>Ligações, visitas e conversas registradas pelo time</CardDescription>
        </div>
        {!aberto && (
          <Button size="sm" onClick={() => setAberto(true)}>
            <MessageSquarePlus /> Registrar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {aberto && (
          <form onSubmit={enviar} className="space-y-3 rounded-md border bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="i-tipo" className="text-sm font-medium">
                  Tipo
                </label>
                <select
                  id="i-tipo"
                  className={`${CLASSE_CAMPO} h-9`}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoInteracao)}
                >
                  {TIPOS_INTERACAO.map((x) => (
                    <option key={x.valor} value={x.valor}>
                      {x.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="i-contato" className="text-sm font-medium">
                  Com quem falou
                </label>
                <select
                  id="i-contato"
                  className={`${CLASSE_CAMPO} h-9`}
                  value={contatoId}
                  onChange={(e) => setContatoId(e.target.value)}
                >
                  <option value="">Não informado</option>
                  {contatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="i-resumo" className="text-sm font-medium">
                O que foi conversado *
              </label>
              <textarea
                id="i-resumo"
                required
                rows={3}
                maxLength={1000}
                className={CLASSE_CAMPO}
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
              />
            </div>
            {registrar.isError && (
              <p role="alert" className="text-sm text-destructive">
                {mensagemDeErro(registrar.error)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={registrar.isPending || !resumo.trim()}>
                {registrar.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}

        {isLoading && <Skeleton className="h-16 w-full" />}
        {isError && <p className="text-sm text-red-700">Erro ao carregar interações: {mensagemDeErro(error)}</p>}
        {data?.length === 0 && !aberto && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
        )}
        <ol className="divide-y">
          {pg.visiveis.map((i) => (
            <li key={i.id} className="space-y-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutro">{rotuloTipo(i.tipo)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(i.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                  {i.usuarioNome}
                  {i.contatoNome && ` · com ${i.contatoNome}`}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm">{i.resumo}</p>
            </li>
          ))}
        </ol>
      </CardContent>
      <Paginacao pagina={pg.pagina} tamanho={pg.tamanho} total={pg.total} onPagina={pg.setPagina} rotulo="interações" />
    </Card>
  )
}

/** Tarefas abertas do cliente + criação de nova tarefa. */
export function TarefasDoCliente({ clienteId }: { clienteId: number }) {
  const { data, isLoading } = useTarefas('ABERTA', false, clienteId)
  const criar = useCriarTarefa()
  const pg = usePaginacao(data, 5)
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prazo, setPrazo] = useState(dataISO(3))

  const fechar = () => {
    setAberto(false)
    setTitulo('')
    setDescricao('')
    setPrazo(dataISO(3))
    criar.reset()
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    criar.mutate(
      { clienteId, titulo: titulo.trim(), descricao: descricao.trim() || undefined, prazo },
      { onSuccess: fechar },
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Tarefas em aberto</CardTitle>
          <CardDescription>Próximos passos combinados com este cliente</CardDescription>
        </div>
        {!aberto && (
          <Button size="sm" onClick={() => setAberto(true)}>
            <Plus /> Nova tarefa
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {aberto && (
          <form onSubmit={enviar} className="m-5 space-y-3 rounded-md border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Nova tarefa</p>
              <Button type="button" variant="ghost" size="icon" onClick={fechar} aria-label="Cancelar">
                <X />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="t-titulo" className="text-sm font-medium">
                  Título *
                </label>
                <InputMascarado
                  id="t-titulo"
                  mascara="texto"
                  tamanho={160}
                  required
                  value={titulo}
                  onValueChange={setTitulo}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="t-prazo" className="text-sm font-medium">
                  Prazo *
                </label>
                <Input
                  id="t-prazo"
                  type="date"
                  required
                  min={dataISO(0)}
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="t-desc" className="text-sm font-medium">
                Detalhes
              </label>
              <textarea
                id="t-desc"
                rows={2}
                maxLength={1000}
                className={CLASSE_CAMPO}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            {criar.isError && (
              <p role="alert" className="text-sm text-destructive">
                {mensagemDeErro(criar.error)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending || !titulo.trim()}>
                {criar.isPending ? 'Salvando…' : 'Criar tarefa'}
              </Button>
            </div>
          </form>
        )}
        {isLoading && <Skeleton className="m-5 h-16" />}
        {data?.length === 0 && !aberto && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
            <ClipboardList className="size-6" />
            Nenhuma tarefa aberta para este cliente.
          </div>
        )}
        <ol className="divide-y">
          {pg.visiveis.map((t) => <TarefaItem key={t.id} tarefa={t} mostrarCliente={false} />)}
        </ol>
      </CardContent>
      <Paginacao pagina={pg.pagina} tamanho={pg.tamanho} total={pg.total} onPagina={pg.setPagina} rotulo="tarefas" />
    </Card>
  )
}
