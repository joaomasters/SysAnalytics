import { ChevronLeft, ChevronRight, Copy, Pencil } from 'lucide-react'
import { useState } from 'react'
import { api, mensagemDeErro } from '@/api/client'
import type { MetaVendedor, SituacaoMeta } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Paginacao } from '@/components/ui/paginacao'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMetas, useSalvarMetas } from '@/hooks/queries'
import { formatBRL, formatPercentual } from '@/lib/format'
import { usePaginacao } from '@/lib/usePaginacao'

const SITUACAO: Record<SituacaoMeta, { rotulo: string; variante: 'neutro' | 'ok' | 'alerta' | 'critico' }> = {
  SEM_META: { rotulo: 'Sem meta', variante: 'neutro' },
  ATINGIDA: { rotulo: 'Atingida', variante: 'ok' },
  NO_RITMO: { rotulo: 'No ritmo', variante: 'ok' },
  ABAIXO_DO_RITMO: { rotulo: 'Abaixo do ritmo', variante: 'alerta' },
  NAO_ATINGIDA: { rotulo: 'Não atingida', variante: 'critico' },
  PENDENTE: { rotulo: 'Pendente', variante: 'neutro' },
}

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function deslocar(mes: string, delta: number) {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a!, m! - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nomeMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  const texto = new Date(a!, m! - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function Barra({ v }: { v: MetaVendedor }) {
  if (v.meta == null || v.meta <= 0) return <span className="text-muted-foreground">—</span>
  const real = Math.min(v.atingimento ?? 0, 100)
  const proj = Math.min(v.atingimentoProjetado ?? 0, 100)
  const ritmo = v.ritmoEsperado != null ? Math.min((v.ritmoEsperado / v.meta) * 100, 100) : 0
  return (
    <div className="min-w-[160px]">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="absolute inset-y-0 left-0 bg-emerald-200" style={{ width: `${proj}%` }} />
        <div className="absolute inset-y-0 left-0 bg-emerald-600" style={{ width: `${real}%` }} />
        {ritmo > 0 && ritmo < 100 && (
          <div className="absolute inset-y-0 w-0.5 bg-slate-700" style={{ left: `${ritmo}%` }} title="Ritmo esperado hoje" />
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatPercentual(v.atingimento ?? 0)}
        {v.atingimentoProjetado != null && ` · projetado ${formatPercentual(v.atingimentoProjetado)}`}
      </p>
    </div>
  )
}

function Resumo({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">{titulo}</p>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{valor}</p>
        <p className="min-h-4 text-xs text-muted-foreground">{detalhe}</p>
      </CardContent>
    </Card>
  )
}

export function MetasPage() {
  const { temPerfil } = useAuth()
  const gestao = temPerfil('GESTOR', 'ADMIN')
  const [mes, setMes] = useState(mesAtual)
  const { data, isLoading, error } = useMetas(mes)
  const salvar = useSalvarMetas(mes)
  const pg = usePaginacao(data?.vendedores, 10, mes)
  const [edicao, setEdicao] = useState<Record<number, string> | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function iniciarEdicao() {
    if (!data) return
    const valores: Record<number, string> = {}
    data.vendedores.forEach((v) => {
      valores[v.vendedorId!] = v.meta != null ? String(v.meta) : ''
    })
    setEdicao(valores)
    setErro(null)
  }

  async function copiarMesAnterior() {
    try {
      const anterior = await api.metas(deslocar(mes, -1))
      setEdicao((atual) => {
        const novo = { ...(atual ?? {}) }
        anterior.vendedores.forEach((v) => {
          if (v.meta != null) novo[v.vendedorId!] = String(v.meta)
        })
        return novo
      })
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  function gravar() {
    if (!edicao) return
    const metas = Object.entries(edicao).map(([id, texto]) => {
      const t = texto.trim().replace(',', '.')
      return { vendedorId: Number(id), valor: t === '' ? null : Number(t) }
    })
    if (metas.some((m) => m.valor != null && (Number.isNaN(m.valor) || m.valor < 0))) {
      setErro('Informe apenas valores numéricos maiores ou iguais a zero.')
      return
    }
    salvar.mutate(metas, {
      onSuccess: () => setEdicao(null),
      onError: (e) => setErro(mensagemDeErro(e)),
    })
  }

  const total = data?.total

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Metas de faturamento</h2>
          <p className="text-sm text-muted-foreground">
            Realizado vem do faturamento do ERP; a previsão considera oportunidades abertas com fechamento no mês.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMes(deslocar(mes, -1))} aria-label="Mês anterior">
            <ChevronLeft />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-semibold">{nomeMes(mes)}</span>
          <Button variant="outline" size="icon" onClick={() => setMes(deslocar(mes, 1))} aria-label="Próximo mês">
            <ChevronRight />
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{mensagemDeErro(error)}</p>}

      {isLoading || !data || !total ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Resumo titulo="Meta" valor={total.meta != null ? formatBRL(total.meta) : '—'} />
            <Resumo
              titulo="Realizado"
              valor={formatBRL(total.realizado)}
              detalhe={total.atingimento != null ? `${formatPercentual(total.atingimento)} da meta` : undefined}
            />
            <Resumo
              titulo="Previsão do funil"
              valor={formatBRL(total.previsaoFunil)}
              detalhe="Ponderada pela probabilidade"
            />
            <Resumo
              titulo="Projetado"
              valor={total.atingimentoProjetado != null ? formatPercentual(total.atingimentoProjetado) : '—'}
              detalhe={total.faltaParaMeta != null ? `Falta ${formatBRL(total.faltaParaMeta)}` : undefined}
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{gestao ? 'Vendedores' : 'Minha meta'}</CardTitle>
              {gestao && !edicao && (
                <Button variant="outline" size="sm" onClick={iniciarEdicao}>
                  <Pencil /> Definir metas
                </Button>
              )}
              {edicao && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copiarMesAnterior}>
                    <Copy /> Copiar do mês anterior
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEdicao(null)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={gravar} disabled={salvar.isPending}>
                    Salvar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead>Atingimento</TableHead>
                    <TableHead className="text-right">Previsão funil</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pg.visiveis.map((v) => (
                    <TableRow key={v.vendedorId}>
                      <TableCell>
                        <div className="font-medium">{v.vendedorNome}</div>
                        {v.carteira && <div className="text-xs text-muted-foreground">{v.carteira}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        {edicao ? (
                          <InputMascarado
                            mascara="moeda"
                            aria-label={`Meta de ${v.vendedorNome}`}
                            className="ml-auto w-36"
                            value={edicao[v.vendedorId!] ?? ''}
                            onValueChange={(bruto) => setEdicao({ ...edicao, [v.vendedorId!]: bruto })}
                            placeholder="sem meta"
                          />
                        ) : v.meta != null ? (
                          formatBRL(v.meta)
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatBRL(v.realizado)}</TableCell>
                      <TableCell>
                        <Barra v={v} />
                      </TableCell>
                      <TableCell className="text-right">{formatBRL(v.previsaoFunil)}</TableCell>
                      <TableCell>
                        <Badge variant={SITUACAO[v.situacao].variante}>{SITUACAO[v.situacao].rotulo}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                Barra escura = realizado; clara = realizado + previsão; marcador = ritmo esperado hoje (dia{' '}
                {data.diasDecorridos} de {data.diasNoMes}).
              </p>
            </CardContent>
            <Paginacao
              pagina={pg.pagina}
              tamanho={pg.tamanho}
              total={pg.total}
              onPagina={pg.setPagina}
              onTamanho={pg.setTamanho}
              rotulo="vendedores"
            />
          </Card>
        </>
      )}
    </div>
  )
}
