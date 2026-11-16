import axios from 'axios'
import type {
  EventoSeguranca,
  SenhaTemporariaResposta,
  UsuarioInput,
  UsuarioItem,
  VendedorOpcao,
  IndicadoresClientes,
  IndicadoresFinanceiro,
  IndicadoresLogistica,
  IndicadoresVendas,
  CargaDetalhe,
  CargaInput,
  CargaResumo,
  EventoCargaInput,
  FiltrosCargas,
  ResumoCargas,
  SentidoCarga,
  Transportadora,
  TransportadoraInput,
  ContaDetalhe,
  ContaInput,
  ContaResumo,
  Dre,
  FiltrosFluxo,
  FiltrosPagar,
  FluxoCaixa,
  Fornecedor,
  FornecedorInput,
  PagamentoInput,
  ResumoPagar,
  ClienteDetalhe,
  ClienteRisco,
  ConcluirTarefaInput,
  Contato,
  ContatoInput,
  ExecucaoJob,
  FunilResumo,
  Interacao,
  InteracaoInput,
  MoverOportunidadeInput,
  ItemOportunidade,
  ItemOportunidadeInput,
  Oportunidade,
  OportunidadeEdicaoInput,
  OportunidadeInput,
  MetaItem,
  MetaMes,
  Produto,
  ProdutoInput,
  PropostaDetalhe,
  PropostaInput,
  PropostaResumo,
  StatusProposta,
  Granularidade,
  KpiDashboard,
  LoginResposta,
  NivelRisco,
  Notificacao,
  Pagina,
  SituacaoOportunidade,
  StatusTarefa,
  Tarefa,
  TarefaInput,
  Usuario,
  BaixaInput,
  CobrancaInput,
  FiltrosReceber,
  ResumoReceber,
  TituloDetalhe,
  TituloInput,
  TituloResumo,
} from './types'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 30_000,
  // Envia listas como ?nivel=A&nivel=B (formato esperado pelo Spring)
  paramsSerializer: { indexes: null },
})

const CHAVE_TOKEN = 'sysanalytics.token'

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(CHAVE_TOKEN)
    } catch {
      return null
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(CHAVE_TOKEN, token)
    } catch {
      /* armazenamento indisponível: a sessão vale só até recarregar */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(CHAVE_TOKEN)
    } catch {
      /* ignora */
    }
  },
}

/** Disparado quando a API devolve 401 com token enviado (sessão expirada ou inválida). */
export const EVENTO_SESSAO_EXPIRADA = 'sysanalytics:sessao-expirada'

http.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehLogin = erro.config?.url?.includes('/auth/login')
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !ehLogin) {
      tokenStorage.clear()
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA))
    }
    return Promise.reject(erro)
  },
)

/** Mensagem padrão por status, para quando a API não devolve um `detail` legível. */
const MENSAGEM_POR_STATUS: Record<number, string> = {
  400: 'Os dados informados são inválidos.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Registro não encontrado.',
  405: 'Operação não permitida.',
  409: 'Os dados conflitam com um registro existente.',
  413: 'O conteúdo enviado é grande demais.',
  423: 'Conta temporariamente bloqueada.',
  429: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
  500: 'Ocorreu um erro inesperado no servidor. Tente novamente em instantes.',
  502: 'O servidor está indisponível no momento. Tente novamente em instantes.',
  503: 'O servidor está indisponível no momento. Tente novamente em instantes.',
  504: 'O servidor demorou demais para responder. Tente novamente.',
}

/** Extrai uma mensagem em português de qualquer erro: ProblemDetail da API, falha de rede, timeout ou status HTTP. */
export function mensagemDeErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    const dados = erro.response?.data as { detail?: unknown; protocolo?: unknown } | undefined
    const detalhe = typeof dados?.detail === 'string' && dados.detail.trim() ? dados.detail : null
    if (detalhe) return detalhe
    if (erro.code === 'ECONNABORTED') return 'O servidor demorou demais para responder. Tente novamente.'
    if (!erro.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
    const status = erro.response.status
    return MENSAGEM_POR_STATUS[status] ?? (status >= 500 ? MENSAGEM_POR_STATUS[500] : 'Não foi possível concluir a operação.')
  }
  return erro instanceof Error && erro.message ? erro.message : 'Erro inesperado.'
}

export const api = {
  trocarSenha: async (senhaAtual: string, novaSenha: string) =>
    (await http.post<LoginResposta>('/auth/senha', { senhaAtual, novaSenha })).data,

  usuarios: async (busca: string, incluirInativos: boolean) =>
    (await http.get<UsuarioItem[]>('/usuarios', { params: { busca: busca || undefined, incluirInativos } })).data,
  vendedoresOpcao: async () => (await http.get<VendedorOpcao[]>('/usuarios/vendedores')).data,
  eventosSeguranca: async () => (await http.get<EventoSeguranca[]>('/usuarios/eventos')).data,
  criarUsuario: async (dados: UsuarioInput) => (await http.post<SenhaTemporariaResposta>('/usuarios', dados)).data,
  atualizarUsuario: async (id: number, dados: UsuarioInput) => (await http.put<UsuarioItem>(`/usuarios/${id}`, dados)).data,
  definirUsuarioAtivo: async (id: number, ativo: boolean) => (await http.patch<UsuarioItem>(`/usuarios/${id}/ativo`, { ativo })).data,
  redefinirSenhaUsuario: async (id: number) => (await http.post<SenhaTemporariaResposta>(`/usuarios/${id}/redefinir-senha`)).data,
  desbloquearUsuario: async (id: number) => (await http.post<UsuarioItem>(`/usuarios/${id}/desbloquear`)).data,

  login: async (email: string, senha: string) =>
    (await http.post<LoginResposta>('/auth/login', { email, senha })).data,

  me: async () => (await http.get<Usuario>('/auth/me')).data,

  kpis: async (granularidade: Granularidade) =>
    (await http.get<KpiDashboard>('/kpis', { params: { granularidade } })).data,

  clientes: async (filtros: { niveis?: NivelRisco[]; busca?: string }) =>
    (
      await http.get<ClienteRisco[]>('/clientes', {
        params: {
          nivel: filtros.niveis?.length ? filtros.niveis : undefined,
          busca: filtros.busca || undefined,
        },
      })
    ).data,

  cliente: async (id: number) => (await http.get<ClienteDetalhe>(`/clientes/${id}`)).data,

  criarContato: async (clienteId: number, dados: ContatoInput) =>
    (await http.post<Contato>(`/clientes/${clienteId}/contatos`, dados)).data,

  atualizarContato: async (clienteId: number, contatoId: number, dados: ContatoInput) =>
    (await http.put<Contato>(`/clientes/${clienteId}/contatos/${contatoId}`, dados)).data,

  removerContato: async (clienteId: number, contatoId: number) => {
    await http.delete(`/clientes/${clienteId}/contatos/${contatoId}`)
  },

  interacoes: async (clienteId: number) =>
    (await http.get<Interacao[]>(`/clientes/${clienteId}/interacoes`)).data,

  registrarInteracao: async (clienteId: number, dados: InteracaoInput) =>
    (await http.post<Interacao>(`/clientes/${clienteId}/interacoes`, dados)).data,

  tarefas: async (filtros: { status: StatusTarefa; somenteMinhas?: boolean; clienteId?: number }) =>
    (await http.get<Tarefa[]>('/tarefas', { params: filtros })).data,

  criarTarefa: async (dados: TarefaInput) => (await http.post<Tarefa>('/tarefas', dados)).data,

  concluirTarefa: async (id: number, dados: ConcluirTarefaInput) =>
    (await http.patch<Tarefa>(`/tarefas/${id}/concluir`, dados)).data,

  cancelarTarefa: async (id: number) => (await http.patch<Tarefa>(`/tarefas/${id}/cancelar`)).data,

  criarTarefaDeAlerta: async (notificacaoId: number) =>
    (await http.post<Tarefa>(`/notificacoes/${notificacaoId}/tarefa`)).data,

  oportunidades: async (filtros: { situacao: SituacaoOportunidade; somenteMinhas?: boolean; clienteId?: number }) =>
    (await http.get<Oportunidade[]>('/oportunidades', { params: filtros })).data,

  funilResumo: async (somenteMinhas: boolean) =>
    (await http.get<FunilResumo>('/oportunidades/resumo', { params: { somenteMinhas } })).data,

  criarOportunidade: async (dados: OportunidadeInput) =>
    (await http.post<Oportunidade>('/oportunidades', dados)).data,

  atualizarOportunidade: async (id: number, dados: OportunidadeEdicaoInput) =>
    (await http.put<Oportunidade>(`/oportunidades/${id}`, dados)).data,

  itensOportunidade: async (id: number) =>
    (await http.get<ItemOportunidade[]>(`/oportunidades/${id}/itens`)).data,

  definirItensOportunidade: async (id: number, itens: ItemOportunidadeInput[]) =>
    (await http.put<Oportunidade>(`/oportunidades/${id}/itens`, { itens })).data,

  moverOportunidade: async (id: number, dados: MoverOportunidadeInput) =>
    (await http.patch<Oportunidade>(`/oportunidades/${id}/etapa`, dados)).data,

  oportunidade: async (id: number) => (await http.get<Oportunidade>(`/oportunidades/${id}`)).data,

  metas: async (mes: string) => (await http.get<MetaMes>('/metas', { params: { mes } })).data,

  salvarMetas: async (mes: string, metas: MetaItem[]) => (await http.put<MetaMes>(`/metas/${mes}`, { metas })).data,

  receber: async (f: FiltrosReceber) =>
    (
      await http.get<Pagina<TituloResumo>>('/financeiro/receber', {
        params: {
          situacao: f.situacao,
          busca: f.busca || undefined,
          clienteId: f.clienteId,
          pagina: f.pagina,
          tamanho: f.tamanho,
        },
      })
    ).data,

  fornecedores: async (busca: string, incluirInativos: boolean) =>
    (await http.get<Fornecedor[]>('/financeiro/fornecedores', { params: { busca: busca || undefined, incluirInativos } })).data,

  salvarFornecedor: async (id: number | undefined, dados: FornecedorInput) =>
    (id
      ? await http.put<Fornecedor>(`/financeiro/fornecedores/${id}`, dados)
      : await http.post<Fornecedor>('/financeiro/fornecedores', dados)
    ).data,

  pagar: async (f: FiltrosPagar) =>
    (
      await http.get<Pagina<ContaResumo>>('/financeiro/pagar', {
        params: {
          situacao: f.situacao,
          busca: f.busca || undefined,
          categoria: f.categoria,
          fornecedorId: f.fornecedorId,
          pagina: f.pagina,
          tamanho: f.tamanho,
        },
      })
    ).data,

  pagarResumo: async () => (await http.get<ResumoPagar>('/financeiro/pagar/resumo')).data,

  conta: async (id: number) => (await http.get<ContaDetalhe>(`/financeiro/pagar/${id}`)).data,

  criarConta: async (dados: ContaInput) => (await http.post<ContaResumo[]>('/financeiro/pagar', dados)).data,

  pagarConta: async (id: number, dados: PagamentoInput) =>
    (await http.post<ContaDetalhe>(`/financeiro/pagar/${id}/pagamentos`, dados)).data,

  estornarPagamento: async (id: number, pagamentoId: number) =>
    (await http.delete<ContaDetalhe>(`/financeiro/pagar/${id}/pagamentos/${pagamentoId}`)).data,

  cancelarConta: async (id: number) => (await http.post<ContaDetalhe>(`/financeiro/pagar/${id}/cancelar`)).data,

  fluxoCaixa: async (f: FiltrosFluxo) =>
    (
      await http.get<FluxoCaixa>('/financeiro/fluxo-caixa', {
        params: { semanas: f.semanas, saldoInicial: f.saldoInicial || undefined, incluirReceberAtrasado: f.incluirReceberAtrasado },
      })
    ).data,

  indicadoresVendas: async (meses: number) => (await http.get<IndicadoresVendas>('/indicadores/vendas', { params: { meses } })).data,
  indicadoresClientes: async (meses: number) => (await http.get<IndicadoresClientes>('/indicadores/clientes', { params: { meses } })).data,
  indicadoresFinanceiro: async (meses: number) => (await http.get<IndicadoresFinanceiro>('/indicadores/financeiro', { params: { meses } })).data,
  indicadoresLogistica: async (meses: number) => (await http.get<IndicadoresLogistica>('/indicadores/logistica', { params: { meses } })).data,

  dre: async (ano: number) => (await http.get<Dre>('/financeiro/dre', { params: { ano } })).data,

  transportadoras: async (busca: string, incluirInativos: boolean) =>
    (await http.get<Transportadora[]>('/transportadoras', { params: { busca: busca || undefined, incluirInativos } })).data,

  salvarTransportadora: async (id: number | undefined, dados: TransportadoraInput) =>
    (id ? await http.put<Transportadora>(`/transportadoras/${id}`, dados) : await http.post<Transportadora>('/transportadoras', dados)).data,

  cargas: async (f: FiltrosCargas) =>
    (
      await http.get<Pagina<CargaResumo>>('/cargas', {
        params: {
          sentido: f.sentido,
          situacao: f.situacao,
          busca: f.busca || undefined,
          clienteId: f.clienteId,
          transportadoraId: f.transportadoraId,
          pagina: f.pagina,
          tamanho: f.tamanho,
        },
      })
    ).data,

  cargasResumo: async (sentido?: SentidoCarga) => (await http.get<ResumoCargas>('/cargas/resumo', { params: { sentido } })).data,

  carga: async (id: number) => (await http.get<CargaDetalhe>(`/cargas/${id}`)).data,

  criarCarga: async (dados: CargaInput) => (await http.post<CargaDetalhe>('/cargas', dados)).data,

  atualizarCarga: async (id: number, dados: CargaInput) => (await http.put<CargaDetalhe>(`/cargas/${id}`, dados)).data,

  eventoCarga: async (id: number, dados: EventoCargaInput) => (await http.post<CargaDetalhe>(`/cargas/${id}/eventos`, dados)).data,

  resolverOcorrencia: async (id: number, eventoId: number) =>
    (await http.post<CargaDetalhe>(`/cargas/${id}/eventos/${eventoId}/resolver`)).data,

  cancelarCarga: async (id: number, motivo: string) => (await http.post<CargaDetalhe>(`/cargas/${id}/cancelar`, { motivo })).data,

  receberResumo: async () => (await http.get<ResumoReceber>('/financeiro/receber/resumo')).data,

  titulo: async (id: number) => (await http.get<TituloDetalhe>(`/financeiro/receber/${id}`)).data,

  criarTitulo: async (dados: TituloInput) => (await http.post<TituloResumo[]>('/financeiro/receber', dados)).data,

  baixarTitulo: async (id: number, dados: BaixaInput) =>
    (await http.post<TituloDetalhe>(`/financeiro/receber/${id}/baixas`, dados)).data,

  estornarBaixa: async (id: number, baixaId: number) =>
    (await http.delete<TituloDetalhe>(`/financeiro/receber/${id}/baixas/${baixaId}`)).data,

  cancelarTitulo: async (id: number) => (await http.post<TituloDetalhe>(`/financeiro/receber/${id}/cancelar`)).data,

  registrarCobranca: async (id: number, dados: CobrancaInput) =>
    (await http.post<TituloDetalhe>(`/financeiro/receber/${id}/cobrancas`, dados)).data,

  produtos: async (busca: string, incluirInativos: boolean) =>
    (await http.get<Produto[]>('/produtos', { params: { busca: busca || undefined, incluirInativos } })).data,

  criarProduto: async (dados: ProdutoInput) => (await http.post<Produto>('/produtos', dados)).data,

  atualizarProduto: async (id: number, dados: ProdutoInput) => (await http.put<Produto>(`/produtos/${id}`, dados)).data,

  propostas: async (oportunidadeId: number) =>
    (await http.get<PropostaResumo[]>(`/oportunidades/${oportunidadeId}/propostas`)).data,

  proposta: async (id: number) => (await http.get<PropostaDetalhe>(`/propostas/${id}`)).data,

  criarProposta: async (oportunidadeId: number, dados: PropostaInput) =>
    (await http.post<PropostaDetalhe>(`/oportunidades/${oportunidadeId}/propostas`, dados)).data,

  atualizarProposta: async (id: number, dados: PropostaInput) =>
    (await http.put<PropostaDetalhe>(`/propostas/${id}`, dados)).data,

  statusProposta: async (id: number, status: StatusProposta) =>
    (await http.patch<PropostaDetalhe>(`/propostas/${id}/status`, { status })).data,

  excluirProposta: async (id: number) => {
    await http.delete(`/propostas/${id}`)
  },

  notificacoes: async (apenasNaoLidas = false, pagina = 0, tamanho = 100) =>
    (
      await http.get<Pagina<Notificacao>>('/notificacoes', {
        params: { apenasNaoLidas, pagina, tamanho },
      })
    ).data,

  contagemNaoLidas: async () =>
    (await http.get<{ naoLidas: number }>('/notificacoes/nao-lidas/contagem')).data.naoLidas,

  marcarComoLida: async (id: number) =>
    (await http.patch<Notificacao>(`/notificacoes/${id}/lida`)).data,

  marcarTodasComoLidas: async () =>
    (await http.patch<{ atualizadas: number }>('/notificacoes/marcar-todas-lidas')).data,

  executarAnaliseInatividade: async () =>
    (await http.post<ExecucaoJob>('/jobs/executar-analise-inatividade')).data,
}
