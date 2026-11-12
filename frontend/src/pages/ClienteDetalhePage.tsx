import { ArrowLeft, Mail, Pencil, Phone, Plus, Star, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { Contato, ContatoInput } from '@/api/types'
import { InteracoesCard, TarefasDoCliente } from '@/components/cliente/Relacionamento'
import { RiscoBadge } from '@/components/RiscoBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCliente, useRemoverContato, useSalvarContato } from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'

export function ClienteDetalhePage() {
  const { id } = useParams()
  const clienteId = Number(id)
  const { data, isLoading, isError, error } = useCliente(clienteId)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <VoltarParaLista />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">
            Não foi possível carregar o cliente: {mensagemDeErro(error)}
          </CardContent>
        </Card>
      </div>
    )
  }

  const { resumo: c } = data

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <VoltarParaLista />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{c.nomeFantasia}</h2>
          <p className="text-sm text-muted-foreground">
            {c.razaoSocial} · {c.cnpj}
          </p>
        </div>
        <RiscoBadge nivel={c.nivelRisco} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Última compra" valor={formatData(c.ultimaCompra)} />
        <Indicador
          rotulo="Dias sem faturar"
          valor={c.diasInatividade === null ? 'Nunca comprou' : String(c.diasInatividade)}
        />
        <Indicador rotulo="Ticket médio" valor={formatBRL(c.ticketMedio)} detalhe={`${c.totalNotas} notas`} />
        <Indicador rotulo="Faturado no histórico" valor={formatBRL(c.valorTotal)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Cadastro</CardTitle>
            <CardDescription>Dados vindos do ERP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Campo rotulo="Segmento" valor={c.segmento} />
            <Campo rotulo="Cidade/UF" valor={c.cidade ? `${c.cidade}/${c.uf ?? ''}` : null} />
            <Campo rotulo="E-mail" valor={data.email} />
            <Campo rotulo="Telefone" valor={data.telefone} />
            <Campo rotulo="Cliente desde" valor={formatData(data.dataCadastro)} />
            <Campo rotulo="Vendedor" valor={`${c.vendedorNome} · ${c.carteira}`} />
          </CardContent>
        </Card>

        <ContatosCard clienteId={clienteId} contatos={data.contatos} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TarefasDoCliente clienteId={clienteId} />
        <InteracoesCard clienteId={clienteId} contatos={data.contatos} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas notas fiscais</CardTitle>
          <CardDescription>As 12 mais recentes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nota</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ultimasNotas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Este cliente ainda não possui notas fiscais.
                  </TableCell>
                </TableRow>
              )}
              {data.ultimasNotas.map((n) => (
                <TableRow key={n.numeroNota}>
                  <TableCell className="font-medium">{n.numeroNota}</TableCell>
                  <TableCell>{formatData(n.dataFaturamento)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(n.valorTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function VoltarParaLista() {
  return (
    <Link
      to="/clientes"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Voltar para clientes
    </Link>
  )
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
        <p className="mt-1 text-xl font-bold tabular-nums">{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="font-medium">{valor || '—'}</p>
    </div>
  )
}

// ---------------------------------------------------------------- contatos

const VAZIO: ContatoInput = { nome: '', cargo: '', email: '', telefone: '', principal: false }

function ContatosCard({ clienteId, contatos }: { clienteId: number; contatos: Contato[] }) {
  const salvar = useSalvarContato(clienteId)
  const remover = useRemoverContato(clienteId)
  // null = formulário fechado; { contatoId: undefined } = novo contato
  const [edicao, setEdicao] = useState<{ contatoId?: number; dados: ContatoInput } | null>(null)

  const fechar = () => {
    setEdicao(null)
    salvar.reset()
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!edicao) return
    salvar.mutate({ contatoId: edicao.contatoId, dados: edicao.dados }, { onSuccess: fechar })
  }

  const atualizar = (campo: keyof ContatoInput, valor: string | boolean) =>
    setEdicao((atual) => (atual ? { ...atual, dados: { ...atual.dados, [campo]: valor } } : atual))

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Contatos</CardTitle>
          <CardDescription>Pessoas com quem o time comercial fala neste cliente</CardDescription>
        </div>
        {!edicao && (
          <Button size="sm" onClick={() => setEdicao({ dados: { ...VAZIO } })}>
            <Plus /> Novo contato
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {edicao && (
          <form onSubmit={enviar} className="space-y-3 rounded-md border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{edicao.contatoId ? 'Editar contato' : 'Novo contato'}</p>
              <Button type="button" variant="ghost" size="icon" onClick={fechar} aria-label="Cancelar">
                <X />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Rotulado id="c-nome" rotulo="Nome *">
                <Input
                  id="c-nome"
                  required
                  maxLength={120}
                  value={edicao.dados.nome}
                  onChange={(e) => atualizar('nome', e.target.value)}
                />
              </Rotulado>
              <Rotulado id="c-cargo" rotulo="Cargo">
                <Input
                  id="c-cargo"
                  maxLength={80}
                  value={edicao.dados.cargo ?? ''}
                  onChange={(e) => atualizar('cargo', e.target.value)}
                />
              </Rotulado>
              <Rotulado id="c-email" rotulo="E-mail">
                <Input
                  id="c-email"
                  type="email"
                  maxLength={160}
                  value={edicao.dados.email ?? ''}
                  onChange={(e) => atualizar('email', e.target.value)}
                />
              </Rotulado>
              <Rotulado id="c-tel" rotulo="Telefone">
                <Input
                  id="c-tel"
                  maxLength={20}
                  value={edicao.dados.telefone ?? ''}
                  onChange={(e) => atualizar('telefone', e.target.value)}
                />
              </Rotulado>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edicao.dados.principal}
                onChange={(e) => atualizar('principal', e.target.checked)}
              />
              Contato principal
            </label>
            {salvar.isError && (
              <p role="alert" className="text-sm text-destructive">
                {mensagemDeErro(salvar.error)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}

        {remover.isError && (
          <p role="alert" className="text-sm text-destructive">
            {mensagemDeErro(remover.error)}
          </p>
        )}

        {contatos.length === 0 && !edicao && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
        )}

        <ul className="divide-y">
          {contatos.map((ct) => (
            <li key={ct.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className="flex items-center gap-2 font-semibold">
                  {ct.nome}
                  {ct.principal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      <Star className="size-3" aria-hidden /> Principal
                    </span>
                  )}
                </p>
                {ct.cargo && <p className="text-sm text-muted-foreground">{ct.cargo}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {ct.email && (
                    <a href={`mailto:${ct.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Mail className="size-3.5" aria-hidden /> {ct.email}
                    </a>
                  )}
                  {ct.telefone && (
                    <a href={`tel:${ct.telefone}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="size-3.5" aria-hidden /> {ct.telefone}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${ct.nome}`}
                  onClick={() =>
                    setEdicao({
                      contatoId: ct.id,
                      dados: {
                        nome: ct.nome,
                        cargo: ct.cargo ?? '',
                        email: ct.email ?? '',
                        telefone: ct.telefone ?? '',
                        principal: ct.principal,
                      },
                    })
                  }
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${ct.nome}`}
                  disabled={remover.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover o contato ${ct.nome}?`)) remover.mutate(ct.id)
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function Rotulado({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      {children}
    </div>
  )
}
