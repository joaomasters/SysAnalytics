export type Granularidade = 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'SEMESTRAL'

export type NivelRisco = 'SEM_RISCO' | 'ALERTA' | 'ATENCAO' | 'CRITICO'

export interface PontoSerie {
  periodo: string
  rotulo: string
  faturamento: number
  custos: number
  custosFixos: number
  custosVariaveis: number
  saldo: number
  saldoAcumulado: number
  margemPercentual: number
  notas: number
}

export interface TicketVendedor {
  vendedorId: number
  vendedorNome: string
  carteira: string
  totalNotas: number
  clientesAtendidos: number
  faturamento: number
  ticketMedio: number
}

export interface KpiDashboard {
  granularidade: Granularidade
  inicio: string
  fim: string
  resumo: {
    faturamentoTotal: number
    custoTotal: number
    custoFixo: number
    custoVariavel: number
    saldoOperacional: number
    margemPercentual: number
    ticketMedioGeral: number
    totalNotas: number
    totalClientes: number
    clientesEmRisco: number
    clientesPorNivel: Record<NivelRisco, number>
  }
  serie: PontoSerie[]
  ticketMedioPorVendedor: TicketVendedor[]
}

export interface ClienteRisco {
  id: number
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  contato: string | null
  cidade: string | null
  uf: string | null
  segmento: string | null
  vendedorId: number
  vendedorNome: string
  carteira: string
  ultimaCompra: string | null
  diasInatividade: number | null
  totalNotas: number
  valorTotal: number
  ticketMedio: number
  nivelRisco: NivelRisco
  nivelDescricao: string
}

export interface Notificacao {
  id: number
  clienteId: number
  clienteNome: string
  vendedorId: number | null
  vendedorNome: string | null
  nivel: NivelRisco
  nivelDescricao: string
  diasInatividade: number | null
  mensagem: string
  lida: boolean
  criadaEm: string
}

export interface Pagina<T> {
  conteudo: T[]
  pagina: number
  tamanho: number
  totalElementos: number
  totalPaginas: number
}

export interface ExecucaoJob {
  jobExecutionId: number
  status: string
  inicio: string
  fim: string
  duracaoMs: number
  clientesEmRiscoLidos: number
  eventosPublicados: number
  eventosPorNivel: Partial<Record<NivelRisco, number>>
  erro: string | null
}

export type Perfil = 'ADMIN' | 'GESTOR' | 'VENDEDOR'

export interface Usuario {
  id: number
  nome: string
  email: string
  perfil: Perfil
  empresaId: number
  empresaNome: string
  vendedorId: number | null
}

export interface LoginResposta {
  token: string
  tipo: string
  expiraEm: string
  usuario: Usuario
}

export interface Contato {
  id: number
  nome: string
  cargo: string | null
  email: string | null
  telefone: string | null
  principal: boolean
}

export interface ContatoInput {
  nome: string
  cargo?: string
  email?: string
  telefone?: string
  principal: boolean
}

export interface NotaResumo {
  numeroNota: string
  dataFaturamento: string
  valorTotal: number
}

export interface ClienteDetalhe {
  resumo: ClienteRisco
  email: string | null
  telefone: string | null
  dataCadastro: string
  contatos: Contato[]
  ultimasNotas: NotaResumo[]
}

export type TipoInteracao = 'LIGACAO' | 'EMAIL' | 'VISITA' | 'WHATSAPP' | 'REUNIAO' | 'OUTRO'
export type StatusTarefa = 'ABERTA' | 'CONCLUIDA' | 'CANCELADA'
export type OrigemTarefa = 'MANUAL' | 'ALERTA'
export type ResultadoTarefa = 'REATIVADO' | 'EM_NEGOCIACAO' | 'SEM_RETORNO' | 'PERDIDO' | 'OUTRO'

export interface Interacao {
  id: number
  tipo: TipoInteracao
  dataHora: string
  resumo: string
  contatoId: number | null
  contatoNome: string | null
  usuarioId: number
  usuarioNome: string
}

export interface InteracaoInput {
  tipo: TipoInteracao
  resumo: string
  contatoId?: number
}

export interface Tarefa {
  id: number
  clienteId: number
  clienteNome: string
  responsavelId: number
  responsavelNome: string
  titulo: string
  descricao: string | null
  prazo: string
  status: StatusTarefa
  origem: OrigemTarefa
  resultado: ResultadoTarefa | null
  atrasada: boolean
  concluidaEm: string | null
  criadaEm: string
}

export interface TarefaInput {
  clienteId: number
  titulo: string
  descricao?: string
  prazo: string
}

export interface ConcluirTarefaInput {
  resultado: ResultadoTarefa
  resumo?: string
  tipoInteracao?: TipoInteracao
}

export type EtapaOportunidade = 'PROSPECCAO' | 'QUALIFICACAO' | 'PROPOSTA' | 'NEGOCIACAO' | 'GANHA' | 'PERDIDA'
export type MotivoPerda = 'PRECO' | 'CONCORRENTE' | 'SEM_ORCAMENTO' | 'SEM_RETORNO' | 'OUTRO'
export type SituacaoOportunidade = 'ABERTA' | 'GANHA' | 'PERDIDA'

export interface Oportunidade {
  id: number
  clienteId: number
  clienteNome: string
  responsavelId: number
  responsavelNome: string
  titulo: string
  descricao: string | null
  valorEstimado: number
  probabilidade: number
  etapa: EtapaOportunidade
  dataPrevistaFechamento: string | null
  atrasada: boolean
  motivoPerda: MotivoPerda | null
  fechadaEm: string | null
  criadaEm: string
}

export interface OportunidadeInput {
  clienteId: number
  titulo: string
  descricao?: string
  valorEstimado: number
  dataPrevistaFechamento?: string
}

export interface OportunidadeEdicaoInput {
  titulo: string
  descricao?: string
  valorEstimado: number
  dataPrevistaFechamento?: string
  probabilidade?: number
}

export interface MoverOportunidadeInput {
  etapa: EtapaOportunidade
  motivoPerda?: MotivoPerda
  probabilidade?: number
}

export interface EtapaResumo {
  etapa: EtapaOportunidade
  quantidade: number
  valor: number
  valorPonderado: number
}

export interface FunilResumo {
  etapas: EtapaResumo[]
  pipelineAberto: number
  previsaoPonderada: number
  ganhasNoMes: number
  valorGanhoNoMes: number
  taxaConversao90d: number | null
}
