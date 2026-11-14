import { Plus, Search, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { Transportadora } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Paginacao } from '@/components/ui/paginacao'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSalvarTransportadora, useTransportadoras } from '@/hooks/queries'
import { formatBRL, formatPercentual } from '@/lib/format'
import { formatarTelefone } from '@/lib/mascaras'
import { useDebounce } from '@/lib/useDebounce'
import { usePaginacao } from '@/lib/usePaginacao'

export function TransportadorasPage() {
  const [busca, setBusca] = useState('')
  const [inativas, setInativas] = useState(false)
  const [editando, setEditando] = useState<Transportadora | 'nova' | null>(null)
  const termo = useDebounce(busca)
  const { data, isLoading, isError, error } = useTransportadoras(termo, inativas)
  const pg = usePaginacao(data, 10, `${termo}|${inativas}`)

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Transportadoras</h2>
          <p className="text-sm text-muted-foreground">Cadastro e desempenho: pontualidade, ocorrências e frete dos últimos 90 dias.</p>
        </div>
        {!editando && (
          <Button onClick={() => setEditando('nova')}>
            <Plus /> Nova transportadora
          </Button>
        )}
      </div>

      {editando && <FormTransportadora key={editando === 'nova' ? 'nova' : editando.id} transportadora={editando === 'nova' ? null : editando} onFechar={() => setEditando(null)} />}

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Transportadoras</CardTitle>
            <CardDescription>{data ? `${data.length} transportadora(s)` : 'Carregando...'}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inativas} onChange={(e) => setInativas(e.target.checked)} /> Mostrar inativas
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar transportadora" className="w-full pl-8 sm:w-60" placeholder="Nome ou CNPJ…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isError && <p className="p-4 text-sm text-red-700">Erro ao carregar transportadoras: {mensagemDeErro(error)}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transportadora</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Em andamento</TableHead>
                <TableHead className="text-right">Entregas (90d)</TableHead>
                <TableHead className="text-right">No prazo</TableHead>
                <TableHead className="text-right">Ocorrências</TableHead>
                <TableHead className="text-right">Frete (90d)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nenhuma transportadora encontrada.
                  </TableCell>
                </TableRow>
              )}
              {pg.visiveis.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link to={`/logistica/cargas?transportadoraId=${t.id}`} className="font-semibold text-primary hover:underline">
                      {t.nome}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {t.documento ?? 'Sem documento'} {!t.ativo && <Badge variant="neutro">Inativa</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.contato ?? '—'}
                    <p className="text-xs text-muted-foreground">{[t.email, formatarTelefone(t.telefone)].filter(Boolean).join(' · ')}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.cargasAtivas}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.entregues90d}</TableCell>
                  <TableCell className={`text-right tabular-nums ${t.pontualidadePct90d != null && t.pontualidadePct90d < 85 ? 'font-semibold text-red-700' : ''}`}>
                    {t.pontualidadePct90d != null ? formatPercentual(t.pontualidadePct90d) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.ocorrencias90d}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(t.freteTotal90d)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditando(t)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <Paginacao pagina={pg.pagina} tamanho={pg.tamanho} total={pg.total} onPagina={pg.setPagina} onTamanho={pg.setTamanho} rotulo="transportadoras" />
      </Card>
    </div>
  )
}

function FormTransportadora({ transportadora, onFechar }: { transportadora: Transportadora | null; onFechar: () => void }) {
  const salvar = useSalvarTransportadora()
  const [nome, setNome] = useState(transportadora?.nome ?? '')
  const [documento, setDocumento] = useState(transportadora?.documento ?? '')
  const [contato, setContato] = useState(transportadora?.contato ?? '')
  const [email, setEmail] = useState(transportadora?.email ?? '')
  const [telefone, setTelefone] = useState(transportadora?.telefone ?? '')
  const [ativo, setAtivo] = useState(transportadora?.ativo ?? true)

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate(
      {
        id: transportadora?.id,
        dados: { nome: nome.trim(), documento: documento || undefined, contato: contato.trim() || undefined, email: email.trim() || undefined, telefone: telefone || undefined, ativo },
      },
      { onSuccess: onFechar },
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <CardTitle>{transportadora ? 'Editar transportadora' : 'Nova transportadora'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Cancelar">
          <X />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Campo id="t-nome" rotulo="Nome *" className="md:col-span-2">
              <InputMascarado id="t-nome" mascara="texto" tamanho={160} required value={nome} onValueChange={setNome} />
            </Campo>
            <Campo id="t-doc" rotulo="CNPJ">
              <InputMascarado id="t-doc" mascara="documento" value={documento} onValueChange={setDocumento} />
            </Campo>
            <Campo id="t-contato" rotulo="Contato">
              <InputMascarado id="t-contato" mascara="texto" tamanho={120} value={contato} onValueChange={setContato} />
            </Campo>
            <Campo id="t-email" rotulo="E-mail">
              <InputMascarado id="t-email" mascara="email" tamanho={160} value={email} onValueChange={setEmail} />
            </Campo>
            <Campo id="t-tel" rotulo="Telefone">
              <InputMascarado id="t-tel" mascara="telefone" value={telefone} onValueChange={setTelefone} />
            </Campo>
          </div>
          {transportadora && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Transportadora ativa (inativas não recebem novas cargas)
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
