import { ArrowLeft, FilePlus2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { mensagemDeErro } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Paginacao } from '@/components/ui/paginacao'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCriarProposta, useOportunidade, usePropostas } from '@/hooks/queries'
import { formatBRL, formatData } from '@/lib/format'
import { usePaginacao } from '@/lib/usePaginacao'
import { rotuloEtapa, rotuloMotivo, STATUS_PROPOSTA } from '@/lib/rotulos'

export function OportunidadeDetalhePage() {
  const oportunidadeId = Number(useParams().id)
  const navigate = useNavigate()
  const { data: o, isLoading, isError, error } = useOportunidade(oportunidadeId)
  const { data: propostas } = usePropostas(oportunidadeId)
  const criar = useCriarProposta(oportunidadeId)
  const pg = usePaginacao(propostas, 5)

  const voltar = (
    <Link to="/funil" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Voltar ao funil
    </Link>
  )

  if (isLoading) return <Skeleton className="mx-auto h-48 max-w-5xl" />
  if (isError || !o) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-4">
        {voltar}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">
            Não foi possível carregar a oportunidade: {mensagemDeErro(error)}
          </CardContent>
        </Card>
      </div>
    )
  }

  const encerrada = o.etapa === 'GANHA' || o.etapa === 'PERDIDA'

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {voltar}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{o.titulo}</h2>
          <Link to={`/clientes/${o.clienteId}`} className="text-sm text-muted-foreground hover:underline">
            {o.clienteNome}
          </Link>
        </div>
        <Badge variant={o.etapa === 'GANHA' ? 'ok' : o.etapa === 'PERDIDA' ? 'critico' : 'neutro'}>
          {rotuloEtapa(o.etapa)}
          {o.motivoPerda ? ` · ${rotuloMotivo(o.motivoPerda)}` : ''}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info rotulo="Valor estimado" valor={formatBRL(o.valorEstimado)} />
        <Info rotulo="Probabilidade" valor={`${o.probabilidade}%`} />
        <Info rotulo="Previsão de fechamento" valor={formatData(o.dataPrevistaFechamento)} />
        <Info rotulo="Responsável" valor={o.responsavelNome} />
      </div>
      {o.descricao && <p className="text-sm text-muted-foreground">{o.descricao}</p>}

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Propostas</CardTitle>
            <CardDescription>
              Ao enviar uma proposta, o valor da oportunidade passa a ser o total dela.
            </CardDescription>
          </div>
          <Button
            size="sm"
            disabled={encerrada || criar.isPending}
            title={encerrada ? 'Oportunidade encerrada' : undefined}
            onClick={() =>
              criar.mutate({ itens: [] }, { onSuccess: (p) => navigate(`/propostas/${p.id}`) })
            }
          >
            <FilePlus2 /> {criar.isPending ? 'Criando…' : 'Nova proposta'}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {criar.isError && (
            <p role="alert" className="px-6 pb-3 text-sm text-destructive">
              {mensagemDeErro(criar.error)}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Criada por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {propostas?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhuma proposta ainda.
                  </TableCell>
                </TableRow>
              )}
              {pg.visiveis.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link to={`/propostas/${p.id}`} className="font-semibold hover:underline">
                      {p.numero}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_PROPOSTA[p.status].variant}>{STATUS_PROPOSTA[p.status].rotulo}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(p.total)}</TableCell>
                  <TableCell>{formatData(p.validadeAte)}</TableCell>
                  <TableCell>{p.criadaPor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <Paginacao pagina={pg.pagina} tamanho={pg.tamanho} total={pg.total} onPagina={pg.setPagina} rotulo="propostas" />
      </Card>
    </div>
  )
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-muted-foreground">{rotulo}</p>
        <p className="mt-1 text-lg font-bold">{valor}</p>
      </CardContent>
    </Card>
  )
}
