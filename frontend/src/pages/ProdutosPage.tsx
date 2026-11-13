import { PackagePlus, Pencil, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { mensagemDeErro } from '@/api/client'
import type { Produto } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Paginacao } from '@/components/ui/paginacao'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useProdutos, useSalvarProduto } from '@/hooks/queries'
import { formatBRL } from '@/lib/format'
import { usePaginacao } from '@/lib/usePaginacao'

interface Form {
  id?: number
  codigo: string
  nome: string
  descricao: string
  unidade: string
  preco: string
  ativo: boolean
}

const VAZIO: Form = { codigo: '', nome: '', descricao: '', unidade: 'UN', preco: '', ativo: true }

export function ProdutosPage() {
  const { temPerfil } = useAuth()
  const gestao = temPerfil('GESTOR', 'ADMIN')
  const [busca, setBusca] = useState('')
  const [inativos, setInativos] = useState(false)
  const { data, isLoading, isError, error } = useProdutos(busca, inativos)
  const salvar = useSalvarProduto()
  const [form, setForm] = useState<Form | null>(null)
  const pg = usePaginacao(data, 10, `${busca}|${inativos}`)

  const campo = (k: keyof Form, v: string | boolean) => setForm((f) => (f ? { ...f, [k]: v } : f))

  function editar(p: Produto) {
    setForm({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      descricao: p.descricao ?? '',
      unidade: p.unidade,
      preco: String(p.precoUnitario),
      ativo: p.ativo,
    })
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    salvar.mutate(
      {
        id: form.id,
        dados: {
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || undefined,
          unidade: form.unidade.trim(),
          precoUnitario: Number(form.preco),
          ativo: form.ativo,
        },
      },
      {
        onSuccess: () => {
          setForm(null)
          salvar.reset()
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Catálogo de produtos</h2>
          <p className="text-sm text-muted-foreground">
            Itens usados nas propostas.{' '}
            {gestao ? 'Alterar um preço não muda propostas já criadas.' : 'Somente a gestão altera o catálogo.'}
          </p>
        </div>
        {gestao && !form && (
          <Button onClick={() => setForm({ ...VAZIO })}>
            <PackagePlus /> Novo produto
          </Button>
        )}
      </div>

      {form && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? 'Editar produto' : 'Novo produto'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviar} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <Rotulo id="p-cod" texto="Código *">
                  <InputMascarado id="p-cod" mascara="codigo" tamanho={40} required value={form.codigo} onValueChange={(v) => campo('codigo', v)} />
                </Rotulo>
                <Rotulo id="p-nome" texto="Nome *" className="sm:col-span-2">
                  <InputMascarado id="p-nome" mascara="texto" tamanho={160} required value={form.nome} onValueChange={(v) => campo('nome', v)} />
                </Rotulo>
                <Rotulo id="p-un" texto="Unidade *">
                  <InputMascarado id="p-un" mascara="codigo" tamanho={10} required value={form.unidade} onValueChange={(v) => campo('unidade', v)} />
                </Rotulo>
                <Rotulo id="p-preco" texto="Preço unitário (R$) *">
                  <InputMascarado
                    id="p-preco"
                    mascara="moeda"
                    required
                    placeholder="0,00"
                    value={form.preco}
                    onValueChange={(v) => campo('preco', v)}
                  />
                </Rotulo>
                <Rotulo id="p-desc" texto="Descrição" className="sm:col-span-3">
                  <InputMascarado id="p-desc" mascara="texto" tamanho={500} value={form.descricao} onValueChange={(v) => campo('descricao', v)} />
                </Rotulo>
              </div>
              {form.id && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => campo('ativo', e.target.checked)} />
                  Produto ativo (aparece nas propostas novas)
                </label>
              )}
              {salvar.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {mensagemDeErro(salvar.error)}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(null)
                    salvar.reset()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvar.isPending}>
                  {salvar.isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Produtos</CardTitle>
            <CardDescription>{data ? `${data.length} item(ns)` : 'Carregando...'}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {gestao && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} />
                Mostrar inativos
              </label>
            )}
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                aria-label="Buscar produto"
                className="pl-8"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <p className="p-6 text-sm text-red-700">Erro ao carregar o catálogo: {mensagemDeErro(error)}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Status</TableHead>
                  {gestao && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                )}
                {data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {gestao ? 'Nenhum produto. Use "Novo produto" para começar.' : 'O catálogo ainda está vazio.'}
                    </TableCell>
                  </TableRow>
                )}
                {pg.visiveis.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.codigo}</TableCell>
                    <TableCell>
                      <p className="font-semibold">{p.nome}</p>
                      {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
                    </TableCell>
                    <TableCell>{p.unidade}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(p.precoUnitario)}</TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? 'ok' : 'neutro'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    {gestao && (
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label={`Editar ${p.nome}`} onClick={() => editar(p)}>
                          <Pencil />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Paginacao pagina={pg.pagina} tamanho={pg.tamanho} total={pg.total} onPagina={pg.setPagina} onTamanho={pg.setTamanho} rotulo="produtos" />
        </CardContent>
      </Card>
    </div>
  )
}

function Rotulo({ id, texto, className, children }: { id: string; texto: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {texto}
      </label>
      {children}
    </div>
  )
}
