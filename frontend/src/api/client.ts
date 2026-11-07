import axios from 'axios'
import type {
  ClienteRisco,
  ExecucaoJob,
  Granularidade,
  KpiDashboard,
  NivelRisco,
  Notificacao,
  Pagina,
} from './types'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 30_000,
  // Envia listas como ?nivel=A&nivel=B (formato esperado pelo Spring)
  paramsSerializer: { indexes: null },
})

/** Extrai a mensagem de erro de um ProblemDetail do Spring, quando existir. */
export function mensagemDeErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    const detail = (erro.response?.data as { detail?: string } | undefined)?.detail
    return detail ?? erro.message
  }
  return erro instanceof Error ? erro.message : 'Erro inesperado'
}

export const api = {
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
