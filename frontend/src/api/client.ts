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
  Oportunidade,
  OportunidadeEdicaoInput,
  OportunidadeInput,
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

  moverOportunidade: async (id: number, dados: MoverOportunidadeInput) =>
    (await http.patch<Oportunidade>(`/oportunidades/${id}/etapa`, dados)).data,

  notificacoes: async (apenasNaoLidas = false) =>
    (
      await http.get<Pagina<Notificacao>>('/notificacoes', {
        params: { apenasNaoLidas, tamanho: 100 },
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
