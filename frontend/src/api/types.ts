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
