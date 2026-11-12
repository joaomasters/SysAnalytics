import { Plus, Target, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { SituacaoOportunidade } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { OportunidadeCard } from '@/components/funil/OportunidadeCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useClientes, useCriarOportunidade, useFunilResumo, useOportunidades } from '@/hooks/queries'
import { formatBRL, formatPercentual } from '@/lib/format'
import { CLASSE_CAMPO, ETAPAS_ABERTAS, rotuloMotivo } from '@/lib/rotulos'

export function FunilPage() {
  const { temPerfil } = useAuth()
  const gestao = temPerfil('GESTOR', 'ADMIN')
  const [situacao, setSituacao] = useState<SituacaoOportunidade>('ABERTA')
  const [escopo, setEscopo] = useState<'minhas' | 'todas'>(gestao ? 'todas' : 'minhas')
  const [criando, setCriando] = useState(false)
  const somenteMinhas = escopo === 'minhas'

  const resumo = useFunilResumo(somenteMinhas)
  const lista = useOportunidades(situacao, somenteMinhas)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Funil de vendas</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe cada oportunidade da prospecção ao fechamento. A previsão pondera o valor pela probabilidade.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {gestao && (
            <SegmentedControl
              ariaLabel="Escopo do funil"
              opcoes={[
                { valor: 'todas', rotulo: 'Todo o time' },
                { valor: 'minhas', rotulo: 'Minhas' },
              ]}
              valor={escopo}
              onChange={setEscopo}
            />
          )}
          {!criando && (
            <Button onClick={() => setCriando(true)}>
              <Plus /> Nova oportunidade
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Pipeline em aberto" valor={resumo.data ? formatBRL(resumo.data.pipelineAberto) : null} />
        <Indicador
          rotulo="Previsão ponderada"
          valor={resumo.data ? formatBRL(resumo.data.previsaoPonderada) : null}
          detalhe="valor × probabilidade"
        />
        <Indicador
          rotulo="Ganhas no mês"
          valor={resumo.data ? formatBRL(resumo.data.valorGanhoNoMes) : null}
          detalhe={resumo.data ? `${resumo.data.ganhasNoMes} oportunidade(s)` : undefined}
        />
        <Indicador
          rotulo="Conversão (90 dias)"
          valor={resumo.data ? (resumo.data.taxaConversao90d === null ? '—' : formatPercentual(resumo.data.taxaConversao90d)) : null}
          detalhe="ganhas ÷ encerradas"
        />
      </div>

      {criando && <NovaOportunidade onFechar={() => setCriando(false)} />}

      <SegmentedControl
        ariaLabel="Situação das oportunidades"
        opcoes={[
          { valor: 'ABERTA', rotulo: 'Em andamento' },
          { valor: 'GANHA', rotulo: 'Ganhas' },
          { valor: 'PERDIDA', rotulo: 'Perdidas' },
        ]}
        valor={situacao}
        onChange={setSituacao}
      />

      {lista.isError && <p className="text-sm text-red-700">Erro ao carregar oportunidades: {mensagemDeErro(lista.error)}</p>}

      {situacao === 'ABERTA' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ETAPAS_ABERTAS.map((etapa) => {
            const itens = lista.data?.filter((o) => o.etapa === etapa.valor) ?? []
            const r = resumo.data?.etapas.find((x) => x.etapa === etapa.valor)
            return (
              <section key={etapa.valor} aria-label={etapa.rotulo} className="flex flex-col rounded-lg border bg-muted/30">
                <header className="border-b p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{etapa.rotulo}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{r?.quantidade ?? itens.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{etapa.descricao}</p>
                  <p className="mt-1 text-sm font-bold tabular-nums">{formatBRL(r?.valor ?? 0)}</p>
                </header>
                <ul className="flex-1 space-y-2 p-2">
                  {lista.isLoading && <Skeleton className="h-24 w-full" />}
                  {!lista.isLoading && itens.length === 0 && (
                    <li className="py-6 text-center text-xs text-muted-foreground">Nenhuma oportunidade</li>
                  )}
                  {itens.map((o) => (
                    <OportunidadeCard key={o.id} oportunidade={o} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{situacao === 'GANHA' ? 'Oportunidades ganhas' : 'Oportunidades perdidas'}</CardTitle>
            <CardDescription>{lista.data ? `${lista.data.length} oportunidade(s)` : 'Carregando...'}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Encerrada em</TableHead>
                  {situacao === 'PERDIDA' && <TableHead>Motivo</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      <Target className="mx-auto mb-2 size-6" />
                      Nada por aqui ainda.
                    </TableCell>
                  </TableRow>
                )}
                {lista.data?.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <p className="font-semibold">{o.titulo}</p>
                      <Link to={`/clientes/${o.clienteId}`} className="text-xs text-muted-foreground hover:underline">
                        {o.clienteNome}
                      </Link>
                    </TableCell>
                    <TableCell>{o.responsavelNome}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(o.valorEstimado)}</TableCell>
                    <TableCell>{o.fechadaEm ? new Date(o.fechadaEm).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    {situacao === 'PERDIDA' && <TableCell>{o.motivoPerda ? rotuloMotivo(o.motivoPerda) : '—'}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string | null; detalhe?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
        {valor === null ? <Skeleton className="mt-2 h-7 w-28" /> : <p className="mt-1 text-xl font-bold tabular-nums">{valor}</p>}
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  )
}

function NovaOportunidade({ onFechar }: { onFechar: () => void }) {
  const criar = useCriarOportunidade()
  // A API já limita a lista à carteira do vendedor. Para carteiras muito grandes, trocar por busca assíncrona.
  const { data: clientes } = useClientes([], '')
  const [clienteId, setClienteId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [valor, setValor] = useState('')
  const [previsao, setPrevisao] = useState('')
  const [descricao, setDescricao] = useState('')

  function enviar(e: FormEvent) {
    e.preventDefault()
    criar.mutate(
      {
        clienteId: Number(clienteId),
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        valorEstimado: Number(valor),
        dataPrevistaFechamento: previsao || undefined,
      },
      { onSuccess: onFechar },
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Nova oportunidade</CardTitle>
          <CardDescription>Começa na etapa Prospecção</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Cancelar">
          <X />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="o-cliente" className="text-sm font-medium">
                Cliente *
              </label>
              <select
                id="o-cliente"
                required
                className={`${CLASSE_CAMPO} h-9`}
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {clientes
                  ?.slice()
                  .sort((a, b) => a.nomeFantasia.localeCompare(b.nomeFantasia, 'pt-BR'))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nomeFantasia}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="o-titulo" className="text-sm font-medium">
                Título *
              </label>
              <Input id="o-titulo" required maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="o-valor" className="text-sm font-medium">
                Valor estimado (R$) *
              </label>
              <Input
                id="o-valor"
                type="number"
                required
                min={0}
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="o-prev" className="text-sm font-medium">
                Previsão de fechamento
              </label>
              <Input id="o-prev" type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="o-desc" className="text-sm font-medium">
              Detalhes
            </label>
            <textarea
              id="o-desc"
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
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending || !clienteId || !titulo.trim() || valor === ''}>
              {criar.isPending ? 'Salvando…' : 'Criar oportunidade'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
