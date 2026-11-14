import axios from 'axios'
import type {
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

/** Extrai a mensagem de erro de um ProblemDetail do Spring, quando existir. */
export function mensagemDeErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    const detail = (erro.response?.data as { detail?: string } | undefined)?.detail
    return detail ?? erro.message
  }
  return erro instanceof Error ? erro.message : 'Erro inesperado'
}

export const api = {
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
