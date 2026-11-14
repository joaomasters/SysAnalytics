import { ArrowLeft, Ban, CheckCircle2, Circle, MessageSquare, PackageCheck, Pencil, ShieldAlert, Truck, XCircle, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import type { CargaResumo, CategoriaOcorrencia, EventoCarga, EventoCargaInput, TipoEventoCarga } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { FormCarga } from '@/components/logistica/FormCarga'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/ui/campo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputMascarado } from '@/components/ui/input-mascarado'
import { Skeleton } from '@/components/ui/skeleton'
import { useCancelarCarga, useCarga, useEventoCarga, useResolverOcorrencia } from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'
import { CATEGORIAS_OCORRENCIA, CLASSE_CAMPO, dataISO, ROTULO_EVENTO, rotuloOcorrencia, SITUACAO_CARGA } from '@/lib/rotulos'

const ICONE: Record<TipoEventoCarga, LucideIcon> = {
  CRIADA: Circle,
  EMBARCADA: Truck,
  ATUALIZACAO: Truck,
  OCORRENCIA: ShieldAlert,
  ENTREGUE: CheckCircle2,
  CANCELADA: XCircle,
  OBSERVACAO: MessageSquare,
}

type TipoManual = EventoCargaInput['tipo']

export function CargaPage() {
  const cargaId = Number(useParams().id)
  const { temPerfil } = useAuth()
  const gestao = temPerfil('GESTOR', 'ADMIN')
  const { data, isLoading, isError, error } = useCarga(cargaId)
  const cancelar = useCancelarCarga(cargaId)
  const resolver = useResolverOcorrencia(cargaId)
  const [editando, setEditando] = useState(false)

  const voltar = (
    <Link to="/logistica/cargas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Voltar para cargas
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
          <CardContent className="p-4 text-sm text-red-800">Não foi possível carregar a carga: {mensagemDeErro(error)}</CardContent>
        </Card>
      </div>
    )
  }

  const c = data.carga
  const sit = SITUACAO_CARGA[c.situacao]
  const ativa = c.status === 'AGUARDANDO' || c.status === 'EM_TRANSITO'
  const link = c.sentido === 'SAIDA' ? `/clientes/${c.parceiroId}` : `/financeiro/pagar?fornecedorId=${c.parceiroId}`

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {voltar}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {c.codigo} <span className="text-base font-normal text-muted-foreground">· {c.sentido === 'SAIDA' ? 'Saída' : 'Entrada'}</span>
          </h2>
          <Link to={link} className="text-sm text-muted-foreground hover:underline">
            {c.parceiroNome}
          </Link>
          {c.numeroDocumento && <p className="text-sm text-muted-foreground">Documento: {c.numeroDocumento}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={sit.variant}>{sit.rotulo}</Badge>
          {gestao && ativa && !editando && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
                <Pencil /> Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={cancelar.isPending}
                onClick={() => {
                  const motivo = window.prompt('Motivo do cancelamento:')
                  if (motivo && motivo.trim()) cancelar.mutate(motivo.trim())
                }}
              >
                <Ban /> Cancelar carga
              </Button>
            </>
          )}
        </div>
      </div>
      {cancelar.isError && <p role="alert" className="text-sm text-destructive">{mensagemDeErro(cancelar.error)}</p>}

      {editando && <FormCarga carga={c} onFechar={() => setEditando(false)} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info
          rotulo={c.status === 'ENTREGUE' ? 'Entregue em' : 'Previsão de entrega'}
          valor={formatData(c.status === 'ENTREGUE' && c.dataEntrega ? c.dataEntrega : c.previsaoEntrega)}
          detalhe={
            c.situacao === 'ATRASADA'
              ? `${c.diasAtraso} dia(s) de atraso`
              : c.status === 'ENTREGUE'
                ? c.noPrazo
                  ? `No prazo (previsto ${formatData(c.previsaoEntrega)})`
                  : `${c.diasAtraso} dia(s) após a previsão de ${formatData(c.previsaoEntrega)}`
                : undefined
          }
          destaque={c.situacao === 'ATRASADA' || c.noPrazo === false}
        />
        <Info rotulo="Transportadora" valor={c.transportadoraNome ?? 'A definir'} detalhe={c.codigoRastreio ? `Rastreio ${c.codigoRastreio}` : undefined} />
        <Info rotulo="Trajeto" valor={`${c.origem ?? '—'} → ${c.destino ?? '—'}`} detalhe={c.dataEmbarque ? `Embarcada em ${formatData(c.dataEmbarque)}` : 'Ainda não embarcada'} />
        <Info
          rotulo="Carga"
          valor={c.valorMercadoria != null ? formatBRL(c.valorMercadoria) : '—'}
          detalhe={[c.volumes != null && `${c.volumes} volume(s)`, c.pesoKg != null && `${c.pesoKg.toLocaleString('pt-BR')} kg`, c.valorFrete != null && `frete ${formatBRL(c.valorFrete)}`].filter(Boolean).join(' · ') || undefined}
        />
      </div>
      {c.observacao && <p className="text-sm text-muted-foreground">{c.observacao}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {gestao && (ativa || c.status === 'ENTREGUE') && <EventoForm carga={c} />}
        <Card className={gestao && (ativa || c.status === 'ENTREGUE') ? '' : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle>Linha do tempo</CardTitle>
            <CardDescription>Do cadastro à entrega, mais recente primeiro</CardDescription>
          </CardHeader>
          <CardContent>
            {resolver.isError && <p role="alert" className="mb-2 text-sm text-destructive">{mensagemDeErro(resolver.error)}</p>}
            <ol className="relative space-y-4 border-l pl-6">
              {data.eventos.map((e) => (
                <LinhaEvento key={e.id} evento={e} podeResolver={gestao && ativa} resolvendo={resolver.isPending} onResolver={() => resolver.mutate(e.id)} />
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function LinhaEvento({ evento: e, podeResolver, resolvendo, onResolver }: { evento: EventoCarga; podeResolver: boolean; resolvendo: boolean; onResolver: () => void }) {
  const Icone = ICONE[e.tipo]
  const ocorrenciaAberta = e.tipo === 'OCORRENCIA' && !e.resolvida
  return (
    <li className="relative">
      <span className={`absolute -left-[2.15rem] flex size-6 items-center justify-center rounded-full border bg-card ${ocorrenciaAberta ? 'border-orange-400 text-orange-600' : e.tipo === 'ENTREGUE' ? 'border-emerald-500 text-emerald-600' : e.tipo === 'CANCELADA' ? 'border-red-400 text-red-600' : 'text-muted-foreground'}`}>
        <Icone className="size-3.5" aria-hidden />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{ROTULO_EVENTO[e.tipo]}</span>
        {e.categoria && <Badge variant={e.resolvida ? 'neutro' : 'atencao'}>{rotuloOcorrencia(e.categoria)}</Badge>}
        {e.tipo === 'OCORRENCIA' && <Badge variant={e.resolvida ? 'ok' : 'critico'}>{e.resolvida ? 'Resolvida' : 'Aberta'}</Badge>}
      </div>
      <p className="whitespace-pre-line text-sm">{e.descricao}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(e.ocorridoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        {e.local && ` · ${e.local}`} · {e.usuarioNome}
        {e.resolvida && e.resolvidaEm && ` · resolvida em ${new Date(e.resolvidaEm).toLocaleDateString('pt-BR')}`}
      </p>
      {ocorrenciaAberta && podeResolver && (
        <Button variant="outline" size="sm" className="mt-1" disabled={resolvendo} onClick={onResolver}>
          Marcar como resolvida
        </Button>
      )}
    </li>
  )
}

function EventoForm({ carga }: { carga: CargaResumo }) {
  const registrar = useEventoCarga(carga.id)
  const opcoes: { valor: TipoManual; rotulo: string }[] =
    carga.status === 'AGUARDANDO'
      ? [
          { valor: 'EMBARCADA', rotulo: 'Registrar embarque' },
          { valor: 'OCORRENCIA', rotulo: 'Registrar ocorrência' },
          { valor: 'OBSERVACAO', rotulo: 'Observação' },
        ]
      : carga.status === 'EM_TRANSITO'
        ? [
            { valor: 'ATUALIZACAO', rotulo: 'Atualizar rota / localização' },
            { valor: 'OCORRENCIA', rotulo: 'Registrar ocorrência' },
            { valor: 'ENTREGUE', rotulo: 'Confirmar entrega' },
            { valor: 'OBSERVACAO', rotulo: 'Observação' },
          ]
        : [{ valor: 'OBSERVACAO', rotulo: 'Observação' }]
  const [tipo, setTipo] = useState<TipoManual>(opcoes[0].valor)
  const [categoria, setCategoria] = useState<CategoriaOcorrencia>('ATRASO')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [data, setData] = useState(dataISO(0))
  const usaData = tipo === 'EMBARCADA' || tipo === 'ENTREGUE'

  function enviar(e: FormEvent) {
    e.preventDefault()
    registrar.mutate(
      {
        tipo,
        categoria: tipo === 'OCORRENCIA' ? categoria : undefined,
        descricao: descricao.trim(),
        local: local.trim() || undefined,
        data: usaData ? data : undefined,
      },
      {
        onSuccess: () => {
          setDescricao('')
          setLocal('')
          setTipo(carga.status === 'AGUARDANDO' ? 'OBSERVACAO' : 'ATUALIZACAO')
        },
      },
    )
  }

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>
          <PackageCheck className="mr-1.5 inline size-4" aria-hidden />
          Atualizar carga
        </CardTitle>
        <CardDescription>Cada registro entra na linha do tempo. Entrega e embarque mudam o andamento da carga.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="space-y-3">
          <Campo id="ev-tipo" rotulo="O que aconteceu? *">
            <select id="ev-tipo" className={CLASSE_CAMPO} value={tipo} onChange={(e) => setTipo(e.target.value as TipoManual)}>
              {opcoes.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          {tipo === 'OCORRENCIA' && (
            <Campo id="ev-cat" rotulo="Tipo de ocorrência *">
              <select id="ev-cat" className={CLASSE_CAMPO} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaOcorrencia)}>
                {CATEGORIAS_OCORRENCIA.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          {usaData && (
            <Campo id="ev-data" rotulo={tipo === 'EMBARCADA' ? 'Data do embarque *' : 'Data da entrega *'}>
              <Input id="ev-data" type="date" required max={dataISO(0)} min={carga.dataEmbarque ?? undefined} value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
          )}
          <Campo id="ev-desc" rotulo="Descrição *">
            <textarea id="ev-desc" required rows={3} maxLength={500} className={CLASSE_CAMPO} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>
          <Campo id="ev-local" rotulo="Local">
            <InputMascarado id="ev-local" mascara="texto" tamanho={120} value={local} onValueChange={setLocal} />
          </Campo>
          {registrar.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mensagemDeErro(registrar.error)}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={registrar.isPending || !descricao.trim()}>
              {registrar.isPending ? 'Registrando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Info({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <Card>
      <CardContent className="space-y-1 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">{rotulo}</p>
        <p className={`text-lg font-semibold ${destaque ? 'text-red-700' : ''}`}>{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  )
}
