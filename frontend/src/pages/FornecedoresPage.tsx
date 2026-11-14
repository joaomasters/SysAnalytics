import { Plus, Search, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { Fornecedor } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Paginacao } from '@/components/ui/paginacao'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFornecedores, useSalvarFornecedor } from '@/hooks/queries'
import { formatBRL } from '@/lib/format'
import { formatarTelefone } from '@/lib/mascaras'
import { usePaginacao } from '@/lib/usePaginacao'
import { useDebounce } from '@/lib/useDebounce'

export function FornecedoresPage() {
  const [busca, setBusca] = useState('')
  const [inativos, setInativos] = useState(false)
  const [editando, setEditando] = useState<Fornecedor | 'novo' | null>(null)
  const termo = useDebounce(busca)
  const { data, isLoading, isError, error } = useFornecedores(termo, inativos)
  const pg = usePaginacao(data, 10, `${termo}|${inativos}`)

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Fornecedores</h2>
          <p className="text-sm text-muted-foreground">Cadastro de quem você compra e paga. O saldo vem das contas a pagar.</p>
        </div>
        {!editando && (
          <Button onClick={() => setEditando('novo')}>
            <Plus /> Novo fornecedor
          </Button>
        )}
      </div>

      {editando && (
        <FormFornecedor key={editando === 'novo' ? 'novo' : editando.id} fornecedor={editando === 'novo' ? null : editando} onFechar={() => setEditando(null)} />
      )}

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Fornecedores</CardTitle>
            <CardDescription>{data ? `${data.length} fornecedor(es)` : 'Carregando...'}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} /> Mostrar inativos
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar fornecedor" className="w-full pl-8 sm:w-60" placeholder="Nome ou CNPJ…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isError && <p className="p-4 text-sm text-red-700">Erro ao carregar fornecedores: {mensagemDeErro(error)}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Em aberto</TableHead>
                <TableHead className="text-right">Vencido</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              )}
              {pg.visiveis.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Link to={`/financeiro/pagar?fornecedorId=${f.id}`} className="font-semibold text-primary hover:underline">
                      {f.nome}
                    </Link>
                    <p className="text-xs text-muted-foreground">{f.documento ?? 'Sem documento'}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.contato ?? '—'}
                    <p className="text-xs text-muted-foreground">{[f.email, formatarTelefone(f.telefone)].filter(Boolean).join(' · ')}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(f.totalAberto)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${f.totalVencido > 0 ? 'font-semibold text-red-700' : ''}`}>{formatBRL(f.totalVencido)}</TableCell>
                  <TableCell>
                    <Badge variant={f.ativo ? 'ok' : 'neutro'}>{f.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditando(f)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <Paginacao pagina={pg.pagina} tamanho={pg.tamanho} total={pg.total} onPagina={pg.setPagina} onTamanho={pg.setTamanho} rotulo="fornecedores" />
      </Card>
    </div>
  )
}

function FormFornecedor({ fornecedor, onFechar }: { fornecedor: Fornecedor | null; onFechar: () => void }) {
  const salvar = useSalvarFornecedor()
  const [nome, setNome] = useState(fornecedor?.nome ?? '')
  const [documento, setDocumento] = useState(fornecedor?.documento ?? '')
  const [contato, setContato] = useState(fornecedor?.contato ?? '')
  const [email, setEmail] = useState(fornecedor?.email ?? '')
  const [telefone, setTelefone] = useState(fornecedor?.telefone ?? '')
  const [ativo, setAtivo] = useState(fornecedor?.ativo ?? true)

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate(
      {
        id: fornecedor?.id,
        dados: {
          nome: nome.trim(),
          documento: documento || undefined,
          contato: contato.trim() || undefined,
          email: email.trim() || undefined,
          telefone: telefone || undefined,
          ativo,
        },
      },
      { onSuccess: onFechar },
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <CardTitle>{fornecedor ? 'Editar fornecedor' : 'Novo fornecedor'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Cancelar">
          <X />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Campo id="f-nome" rotulo="Nome *" className="md:col-span-2">
              <InputMascarado id="f-nome" mascara="texto" tamanho={160} required value={nome} onValueChange={setNome} />
            </Campo>
            <Campo id="f-doc" rotulo="CNPJ / CPF">
              <InputMascarado id="f-doc" mascara="documento" value={documento} onValueChange={setDocumento} />
            </Campo>
            <Campo id="f-contato" rotulo="Contato">
              <InputMascarado id="f-contato" mascara="texto" tamanho={120} value={contato} onValueChange={setContato} />
            </Campo>
            <Campo id="f-email" rotulo="E-mail">
              <InputMascarado id="f-email" mascara="email" tamanho={160} value={email} onValueChange={setEmail} />
            </Campo>
            <Campo id="f-tel" rotulo="Telefone">
              <InputMascarado id="f-tel" mascara="telefone" value={telefone} onValueChange={setTelefone} />
            </Campo>
          </div>
          {fornecedor && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Fornecedor ativo (inativos não recebem novas contas)
            </label>
          )}
          {salvar.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensagemDeErro(salvar.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending || !nome.trim()}>
              {salvar.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
