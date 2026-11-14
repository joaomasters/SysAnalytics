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

export interface ItemOportunidadeInput {
  produtoId: number
  quantidade: number
}

export interface ItemOportunidade {
  id: number
  produtoId: number
  descricao: string
  unidade: string
  quantidade: number
  precoUnitario: number
  total: number
}

export interface OportunidadeInput {
  clienteId: number
  titulo: string
  descricao?: string
  /** Opcional quando há itens do catálogo (o valor passa a ser a soma deles). */
  valorEstimado?: number
  dataPrevistaFechamento?: string
  itens?: ItemOportunidadeInput[]
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

export interface Produto {
  id: number
  codigo: string
  nome: string
  descricao: string | null
  unidade: string
  precoUnitario: number
  ativo: boolean
}

export interface ProdutoInput {
  codigo: string
  nome: string
  descricao?: string
  unidade: string
  precoUnitario: number
  ativo?: boolean
}

export type StatusProposta = 'RASCUNHO' | 'ENVIADA' | 'ACEITA' | 'RECUSADA'

export interface ItemProposta {
  id: number
  produtoId: number | null
  descricao: string
  unidade: string
  quantidade: number
  precoUnitario: number
  descontoPercentual: number
  total: number
}

export interface ItemPropostaInput {
  produtoId?: number | null
  descricao: string
  unidade: string
  quantidade: number
  precoUnitario: number
  descontoPercentual: number
}

export interface PropostaResumo {
  id: number
  numero: string
  status: StatusProposta
  validadeAte: string | null
  total: number
  criadaPor: string
  criadaEm: string
}

export interface PropostaDetalhe {
  id: number
  numero: string
  status: StatusProposta
  oportunidadeId: number
  oportunidadeTitulo: string
  clienteId: number
  clienteNome: string
  clienteRazaoSocial: string
  clienteCnpj: string
  contatoNome: string | null
  contatoEmail: string | null
  empresaNome: string
  elaboradaPor: string
  validadeAte: string | null
  condicoesPagamento: string | null
  observacoes: string | null
  itens: ItemProposta[]
  subtotal: number
  descontoTotal: number
  total: number
  criadaEm: string
  atualizadaEm: string
}

export interface PropostaInput {
  validadeAte?: string
  condicoesPagamento?: string
  observacoes?: string
  itens: ItemPropostaInput[]
}

export type SituacaoMeta = 'SEM_META' | 'ATINGIDA' | 'NO_RITMO' | 'ABAIXO_DO_RITMO' | 'NAO_ATINGIDA' | 'PENDENTE'

export interface MetaVendedor {
  vendedorId: number | null
  vendedorNome: string
  carteira: string | null
  meta: number | null
  realizado: number
  atingimento: number | null
  ritmoEsperado: number | null
  faltaParaMeta: number | null
  previsaoFunil: number
  atingimentoProjetado: number | null
  situacao: SituacaoMeta
}

export interface MetaMes {
  mes: string
  diasNoMes: number
  diasDecorridos: number
  total: MetaVendedor
  vendedores: MetaVendedor[]
}

export interface MetaItem {
  vendedorId: number
  valor: number | null
}

export type FiltroTitulo = 'TODOS' | 'EM_ABERTO' | 'A_VENCER' | 'VENCIDO' | 'PAGO' | 'CANCELADO'
export type SituacaoTitulo = 'A_VENCER' | 'VENCIDO' | 'PAGO' | 'CANCELADO'
export type FormaPagamento = 'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'CARTAO' | 'DINHEIRO' | 'CHEQUE' | 'OUTRO'
export type TipoCobranca = 'LIGACAO' | 'WHATSAPP' | 'EMAIL' | 'VISITA' | 'OUTRO'
export type ResultadoCobranca = 'SEM_RETORNO' | 'PROMESSA' | 'CONTESTACAO' | 'PAGAMENTO_INFORMADO' | 'OUTRO'

export interface TituloResumo {
  id: number
  clienteId: number
  clienteNome: string
  vendedorNome: string
  numeroDocumento: string
  parcela: number
  totalParcelas: number
  descricao: string | null
  dataEmissao: string
  dataVencimento: string
  valor: number
  valorPago: number
  saldo: number
  status: 'ABERTO' | 'PARCIAL' | 'PAGO' | 'CANCELADO'
  situacao: SituacaoTitulo
  diasAtraso: number
  ultimaCobrancaEm: string | null
  promessaData: string | null
}

export interface BaixaItem {
  id: number
  dataBaixa: string
  valor: number
  formaPagamento: FormaPagamento
  observacao: string | null
  usuarioNome: string
  criadaEm: string
}

export interface CobrancaItem {
  id: number
  tipo: TipoCobranca
  resultado: ResultadoCobranca
  resumo: string
  promessaData: string | null
  promessaValor: number | null
  promessaStatus: 'PENDENTE' | 'CUMPRIDA' | 'QUEBRADA' | null
  usuarioNome: string
  criadaEm: string
}

export interface TituloDetalhe {
  titulo: TituloResumo
  baixas: BaixaItem[]
  cobrancas: CobrancaItem[]
}

export interface FaixaAging {
  faixa: string
  valor: number
  quantidade: number
}

export interface Devedor {
  clienteId: number
  clienteNome: string
  vencido: number
  titulos: number
  maiorAtraso: number
}

export interface ResumoReceber {
  totalAberto: number
  aVencer: number
  vence7Dias: number
  vencido: number
  titulosAbertos: number
  titulosVencidos: number
  recebidoNoMes: number
  inadimplenciaPercentual: number | null
  prazoMedioRecebimentoDias: number | null
  aging: FaixaAging[]
  maioresDevedores: Devedor[]
  promessasPendentes: number
  promessasQuebradas: number
}

export interface TituloInput {
  clienteId: number
  numeroDocumento: string
  descricao?: string
  dataEmissao: string
  primeiroVencimento: string
  valorTotal: number
  parcelas: number
  intervaloDias: number
}

export interface BaixaInput {
  dataBaixa: string
  valor: number
  formaPagamento: FormaPagamento
  observacao?: string
}

export interface CobrancaInput {
  tipo: TipoCobranca
  resultado: ResultadoCobranca
  resumo: string
  promessaData?: string
  promessaValor?: number
}

export interface FiltrosReceber {
  situacao: FiltroTitulo
  busca: string
  clienteId?: number
  pagina: number
  tamanho: number
}

// ---------------------------------------------------------------- financeiro: a pagar, fluxo de caixa e DRE

export type CategoriaDespesa =
  | 'MERCADORIA'
  | 'FRETE'
  | 'IMPOSTOS'
  | 'PESSOAL'
  | 'ALUGUEL'
  | 'UTILIDADES'
  | 'MARKETING'
  | 'SERVICOS'
  | 'OUTROS'

export interface Fornecedor {
  id: number
  nome: string
  documento: string | null
  contato: string | null
  email: string | null
  telefone: string | null
  ativo: boolean
  totalAberto: number
  totalVencido: number
}

export interface FornecedorInput {
  nome: string
  documento?: string
  contato?: string
  email?: string
  telefone?: string
  ativo?: boolean
}

export interface ContaResumo {
  id: number
  fornecedorId: number
  fornecedorNome: string
  numeroDocumento: string
  parcela: number
  totalParcelas: number
  descricao: string | null
  categoria: CategoriaDespesa
  dataEmissao: string
  dataVencimento: string
  valor: number
  valorPago: number
  saldo: number
  status: 'ABERTO' | 'PARCIAL' | 'PAGO' | 'CANCELADO'
  situacao: SituacaoTitulo
  diasAtraso: number
}

export interface PagamentoItem {
  id: number
  dataPagamento: string
  valor: number
  formaPagamento: FormaPagamento
  observacao: string | null
  usuarioNome: string
  criadaEm: string
}

export interface ContaDetalhe {
  conta: ContaResumo
  pagamentos: PagamentoItem[]
}

export interface ContaInput {
  fornecedorId: number
  numeroDocumento: string
  descricao?: string
  categoria: CategoriaDespesa
  dataEmissao: string
  primeiroVencimento: string
  valorTotal: number
  parcelas?: number
  intervaloDias?: number
}

export interface PagamentoInput {
  dataPagamento: string
  valor: number
  formaPagamento: FormaPagamento
  observacao?: string
}

export interface FiltrosPagar {
  situacao: FiltroTitulo
  busca: string
  categoria?: CategoriaDespesa
  fornecedorId?: number
  pagina: number
  tamanho: number
}

export interface FaixaAgingPagar {
  faixa: string
  valor: number
  quantidade: number
}

export interface ResumoPagar {
  totalAberto: number
  aVencer: number
  vence7Dias: number
  vencido: number
  contasAbertas: number
  contasVencidas: number
  pagoNoMes: number
  aging: FaixaAgingPagar[]
  abertoPorCategoria: { categoria: CategoriaDespesa; valor: number }[]
  maioresFornecedores: { fornecedorId: number; fornecedorNome: string; aberto: number; vencido: number }[]
}

export interface FluxoSemana {
  inicio: string
  fim: string
  entradas: number
  saidas: number
  saldo: number
  saldoAcumulado: number
}

export interface FluxoCaixa {
  hoje: string
  saldoInicial: number
  receberAtrasado: number
  pagarAtrasado: number
  incluiReceberAtrasado: boolean
  semanas: FluxoSemana[]
  totalEntradas: number
  totalSaidas: number
  saldoFinalProjetado: number
  menorSaldo: number
  semanaMenorSaldo: string
  historico: { mes: string; recebido: number; pago: number }[]
}

export interface FiltrosFluxo {
  semanas: number
  saldoInicial: number
  incluirReceberAtrasado: boolean
}

export interface DreMes {
  mes: number
  receitaBruta: number
  cmv: number
  margemBruta: number
  custosVariaveis: number
  margemContribuicao: number
  custosFixos: number
  resultadoOperacional: number
  margemBrutaPct: number | null
  margemContribuicaoPct: number | null
  resultadoPct: number | null
}

export interface Dre {
  ano: number
  meses: DreMes[]
  total: DreMes
  categorias: { tipo: 'CMV' | 'VARIAVEL' | 'FIXO'; categoria: string; valor: number }[]
}
