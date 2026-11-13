import type { EtapaOportunidade, MotivoPerda, ResultadoTarefa, StatusProposta, TipoInteracao } from '@/api/types'

export const TIPOS_INTERACAO: { valor: TipoInteracao; rotulo: string }[] = [
  { valor: 'LIGACAO', rotulo: 'Ligação' },
  { valor: 'WHATSAPP', rotulo: 'WhatsApp' },
  { valor: 'EMAIL', rotulo: 'E-mail' },
  { valor: 'VISITA', rotulo: 'Visita' },
  { valor: 'REUNIAO', rotulo: 'Reunião' },
  { valor: 'OUTRO', rotulo: 'Outro' },
]

export const RESULTADOS_TAREFA: { valor: ResultadoTarefa; rotulo: string }[] = [
  { valor: 'REATIVADO', rotulo: 'Cliente reativado' },
  { valor: 'EM_NEGOCIACAO', rotulo: 'Em negociação' },
  { valor: 'SEM_RETORNO', rotulo: 'Sem retorno' },
  { valor: 'PERDIDO', rotulo: 'Cliente perdido' },
  { valor: 'OUTRO', rotulo: 'Outro' },
]

export const ETAPAS_ABERTAS: { valor: EtapaOportunidade; rotulo: string; descricao: string }[] = [
  { valor: 'PROSPECCAO', rotulo: 'Prospecção', descricao: 'Primeiro contato' },
  { valor: 'QUALIFICACAO', rotulo: 'Qualificação', descricao: 'Entendendo a necessidade' },
  { valor: 'PROPOSTA', rotulo: 'Proposta', descricao: 'Proposta enviada' },
  { valor: 'NEGOCIACAO', rotulo: 'Negociação', descricao: 'Ajustando condições' },
]

export const rotuloEtapa = (e: EtapaOportunidade): string =>
  e === 'GANHA' ? 'Ganha' : e === 'PERDIDA' ? 'Perdida' : (ETAPAS_ABERTAS.find((x) => x.valor === e)?.rotulo ?? e)

export const STATUS_PROPOSTA: Record<StatusProposta, { rotulo: string; variant: 'neutro' | 'alerta' | 'ok' | 'critico' }> = {
  RASCUNHO: { rotulo: 'Rascunho', variant: 'neutro' },
  ENVIADA: { rotulo: 'Enviada', variant: 'alerta' },
  ACEITA: { rotulo: 'Aceita', variant: 'ok' },
  RECUSADA: { rotulo: 'Recusada', variant: 'critico' },
}

export const MOTIVOS_PERDA: { valor: MotivoPerda; rotulo: string }[] = [
  { valor: 'PRECO', rotulo: 'Preço' },
  { valor: 'CONCORRENTE', rotulo: 'Escolheu concorrente' },
  { valor: 'SEM_ORCAMENTO', rotulo: 'Sem orçamento' },
  { valor: 'SEM_RETORNO', rotulo: 'Sem retorno' },
  { valor: 'OUTRO', rotulo: 'Outro' },
]

export const rotuloMotivo = (m: MotivoPerda) => MOTIVOS_PERDA.find((x) => x.valor === m)?.rotulo ?? m

export const rotuloTipo = (t: TipoInteracao) => TIPOS_INTERACAO.find((x) => x.valor === t)?.rotulo ?? t
export const rotuloResultado = (r: ResultadoTarefa) => RESULTADOS_TAREFA.find((x) => x.valor === r)?.rotulo ?? r

/** Data local "yyyy-MM-dd" daqui a N dias (sem deslocamento de fuso). */
export function dataISO(diasAFrente = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + diasAFrente)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Classes do <select>/<textarea> nativos, alinhadas ao componente Input. */
export const CLASSE_CAMPO =
  'flex w-full rounded-sm border border-input bg-card px-2.5 py-1.5 text-sm hover:border-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
