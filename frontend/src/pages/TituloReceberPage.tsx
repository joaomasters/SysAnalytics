import { ArrowLeft, Ban, HandCoins, Phone, Undo2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { BaixaItem, FormaPagamento, ResultadoCobranca, TipoCobranca, TituloResumo } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useBaixarTitulo,
  useCancelarTitulo,
  useEstornarBaixa,
  useRegistrarCobranca,
  useTituloReceber,
} from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'
import {
  CLASSE_CAMPO,
  dataISO,
  FORMAS_PAGAMENTO,
  RESULTADOS_COBRANCA,
  rotuloForma,
  rotuloResultadoCobranca,
  rotuloTipoCobranca,
  SITUACAO_TITULO,
  TIPOS_COBRANCA,
} from '@/lib/rotulos'
import { usePaginacao } from '@/lib/usePaginacao'
import { Paginacao } from '@/components/ui/paginacao'

const PROMESSA_VARIANTE = { PENDENTE: 'alerta', CUMPRIDA: 'ok', QUEBRADA: 'critico' } as const
const PROMESSA_ROTULO = { PENDENTE: 'Promessa pendente', CUMPRIDA: 'Promessa cumprida', QUEBRADA: 'Promessa não cumprida' } as const

export function TituloReceberPage() {
  const { id } = useParams()
  const tituloId = Number(id)
  const { temPerfil } = useAuth()
  const gestao = temPerfil('GESTOR', 'ADMIN')
  const { data, isLoading, isError, error } = useTituloReceber(tituloId)
  const cancelar = useCancelarTitulo(tituloId)
  const pgCobrancas = usePaginacao(data?.cobrancas, 5)

  const voltar = (
    <Link to="/financeiro/receber" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Voltar para contas a receber
    </Link>
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-4">
        {voltar}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">Não foi possível carregar o título: {mensagemDeErro(error)}</CardContent>
        </Card>
      </div>
    )
  }

  const t = data.titulo
  const sit = SITUACAO_TITULO[t.situacao]
  const aberto = t.status === 'ABERTO' || t.status === 'PARCIAL'

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {voltar}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {t.numeroDocumento} · parcela {t.parcela}/{t.totalParcelas}
          </h2>
          <Link to={`/clientes/${t.clienteId}`} className="text-sm text-muted-foreground hover:underline">
            {t.clienteNome}
          </Link>
          {t.descricao && <p className="text-sm text-muted-foreground">{t.descricao}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={sit.variant}>{sit.rotulo}</Badge>
          {gestao && t.status === 'ABERTO' && t.valorPago === 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={cancelar.isPending}
              onClick={() => window.confirm('Cancelar este título? Esta ação não pode ser desfeita.') && cancelar.mutate()}
            >
              <Ban /> Cancelar título
            </Button>
          )}
        </div>
      </div>
      {cancelar.isError && <p role="alert" className="text-sm text-destructive">{mensagemDeErro(cancelar.error)}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info rotulo="Valor" valor={formatBRL(t.valor)} detalhe={`Emitido em ${formatData(t.dataEmissao)}`} />
        <Info rotulo="Pago" valor={formatBRL(t.valorPago)} />
        <Info rotulo="Saldo" valor={formatBRL(t.saldo)} destaque={t.situacao === 'VENCIDO'} />
        <Info
          rotulo="Vencimento"
          valor={formatData(t.dataVencimento)}
          detalhe={t.diasAtraso > 0 ? `${t.diasAtraso} dia(s) de atraso` : undefined}
          destaque={t.diasAtraso > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BaixasCard tituloId={tituloId} titulo={t} baixas={data.baixas} gestao={gestao} aberto={aberto} />

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Cobrança</CardTitle>
            <CardDescription>Contatos feitos com o cliente e promessas de pagamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aberto && <CobrancaForm tituloId={tituloId} saldo={t.saldo} />}
            {data.cobrancas.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhum contato registrado.</p>}
            <ol className="divide-y">
              {pgCobrancas.visiveis.map((c) => (
                <li key={c.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutro">
                      <Phone aria-hidden /> {rotuloTipoCobranca(c.tipo)}
                    </Badge>
                    <span className="text-xs font-semibold">{rotuloResultadoCobranca(c.resultado)}</span>
                    {c.promessaStatus && <Badge variant={PROMESSA_VARIANTE[c.promessaStatus]}>{PROMESSA_ROTULO[c.promessaStatus]}</Badge>}
                  </div>
                  <p className="whitespace-pre-line text-sm">{c.resumo}</p>
                  {c.promessaData && (
                    <p className="text-xs text-muted-foreground">
                      Prometeu pagar {c.promessaValor !== null ? formatBRL(c.promessaValor) : 'o saldo'} em {formatData(c.promessaData)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.criadaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {c.usuarioNome}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
          <Paginacao pagina={pgCobrancas.pagina} tamanho={pgCobrancas.tamanho} total={pgCobrancas.total} onPagina={pgCobrancas.setPagina} rotulo="contatos" />
        </Card>
      </div>
    </div>
  )
}

function BaixasCard({
  tituloId,
  titulo,
  baixas,
  gestao,
  aberto,
}: {
  tituloId: number
  titulo: TituloResumo
  baixas: BaixaItem[]
  gestao: boolean
  aberto: boolean
}) {
  const baixar = useBaixarTitulo(tituloId)
  const estornar = useEstornarBaixa(tituloId)
  const [valor, setValor] = useState(String(titulo.saldo.toFixed(2)))
  const [data, setData] = useState(dataISO(0))
  const [forma, setForma] = useState<FormaPagamento>('PIX')
  const [obs, setObs] = useState('')
  const pg = usePaginacao(baixas, 5)

  function enviar(e: FormEvent) {
    e.preventDefault()
    baixar.mutate(
      { dataBaixa: data, valor: Number(valor), formaPagamento: forma, observacao: obs.trim() || undefined },
      {
        onSuccess: (novo) => {
          setValor(novo.titulo.saldo.toFixed(2))
          setObs('')
        },
      },
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Baixas</CardTitle>
        <CardDescription>Pagamentos recebidos, totais ou parciais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {gestao && aberto && (
          <form onSubmit={enviar} className="space-y-3 rounded-sm border bg-muted/40 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo id="b-valor" rotulo="Valor *">
                <InputMascarado id="b-valor" mascara="moeda" required value={valor} onValueChange={setValor} />
              </Campo>
              <Campo id="b-data" rotulo="Data *">
                <Input id="b-data" type="date" required max={dataISO(0)} value={data} onChange={(e) => setData(e.target.value)} />
              </Campo>
              <Campo id="b-forma" rotulo="Forma *">
                <select id="b-forma" className={CLASSE_CAMPO} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo id="b-obs" rotulo="Observação">
              <InputMascarado id="b-obs" mascara="texto" tamanho={300} value={obs} onValueChange={setObs} />
            </Campo>
            {baixar.isError && <p role="alert" className="text-sm text-destructive">{mensagemDeErro(baixar.error)}</p>}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={baixar.isPending || !Number(valor)}>
                <HandCoins /> {baixar.isPending ? 'Registrando…' : 'Registrar baixa'}
              </Button>
            </div>
          </form>
        )}
        {estornar.isError && <p role="alert" className="text-sm text-destructive">{mensagemDeErro(estornar.error)}</p>}
      </CardContent>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Por</TableHead>
              {gestao && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {baixas.length === 0 && (
              <TableRow>
                <TableCell colSpan={gestao ? 5 : 4} className="py-6 text-center text-muted-foreground">
                  Nenhuma baixa registrada.
                </TableCell>
              </TableRow>
            )}
            {pg.visiveis.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="tabular-nums">{formatData(b.dataBaixa)}</TableCell>
                <TableCell>
                  {rotuloForma(b.formaPagamento)}
                  {b.observacao && <p className="text-xs text-muted-foreground">{b.observacao}</p>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatBRL(b.valor)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{b.usuarioNome}</TableCell>
                {gestao && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Estornar baixa"
                      title="Estornar baixa"
                      disabled={estornar.isPending}
                      onClick={() => window.confirm('Estornar esta baixa?') && estornar.mutate(b.id)}
                    >
                      <Undo2 />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Paginacao pagina={pg.pagina} tamanho={pg.tamanho} total={pg.total} onPagina={pg.setPagina} rotulo="baixas" />
    </Card>
  )
}

function CobrancaForm({ tituloId, saldo }: { tituloId: number; saldo: number }) {
  const registrar = useRegistrarCobranca(tituloId)
  const [tipo, setTipo] = useState<TipoCobranca>('LIGACAO')
  const [resultado, setResultado] = useState<ResultadoCobranca>('SEM_RETORNO')
  const [resumo, setResumo] = useState('')
  const [promessaData, setPromessaData] = useState(dataISO(3))
  const [promessaValor, setPromessaValor] = useState(saldo.toFixed(2))

  function enviar(e: FormEvent) {
    e.preventDefault()
    registrar.mutate(
      {
        tipo,
        resultado,
        resumo: resumo.trim(),
        promessaData: resultado === 'PROMESSA' ? promessaData : undefined,
        promessaValor: resultado === 'PROMESSA' && Number(promessaValor) > 0 ? Number(promessaValor) : undefined,
      },
      { onSuccess: () => setResumo('') },
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-sm border bg-muted/40 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo id="c-tipo" rotulo="Contato por">
          <select id="c-tipo" className={CLASSE_CAMPO} value={tipo} onChange={(e) => setTipo(e.target.value as TipoCobranca)}>
            {TIPOS_COBRANCA.map((x) => (
              <option key={x.valor} value={x.valor}>
                {x.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="c-res" rotulo="Resultado">
          <select id="c-res" className={CLASSE_CAMPO} value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoCobranca)}>
            {RESULTADOS_COBRANCA.map((x) => (
              <option key={x.valor} value={x.valor}>
                {x.rotulo}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {resultado === 'PROMESSA' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="c-pdata" rotulo="Pagará em *">
            <Input id="c-pdata" type="date" required min={dataISO(0)} max={dataISO(90)} value={promessaData} onChange={(e) => setPromessaData(e.target.value)} />
          </Campo>
          <Campo id="c-pvalor" rotulo="Valor prometido">
            <InputMascarado id="c-pvalor" mascara="moeda" value={promessaValor} onValueChange={setPromessaValor} />
          </Campo>
        </div>
      )}
      <Campo id="c-resumo" rotulo="O que foi combinado *">
        <textarea id="c-resumo" required rows={2} maxLength={500} className={CLASSE_CAMPO} value={resumo} onChange={(e) => setResumo(e.target.value)} />
      </Campo>
      {registrar.isError && <p role="alert" className="text-sm text-destructive">{mensagemDeErro(registrar.error)}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={registrar.isPending || !resumo.trim()}>
          {registrar.isPending ? 'Salvando…' : 'Registrar contato'}
        </Button>
      </div>
    </form>
  )
}

function Info({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <Card>
      <CardContent className="space-y-1 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">{rotulo}</p>
        <p className={`text-xl font-semibold tabular-nums ${destaque ? 'text-red-700' : ''}`}>{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  )
}

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {rotulo}
      </label>
      {children}
    </div>
  )
}
