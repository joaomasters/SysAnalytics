import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  ConcluirTarefaInput,
  ContatoInput,
  Granularidade,
  InteracaoInput,
  MoverOportunidadeInput,
  NivelRisco,
  OportunidadeEdicaoInput,
  OportunidadeInput,
  SituacaoOportunidade,
  StatusTarefa,
  TarefaInput,
} from '@/api/types'

export const queryKeys = {
  kpis: (g: Granularidade) => ['kpis', g] as const,
  clientes: (niveis: NivelRisco[], busca: string) => ['clientes', { niveis, busca }] as const,
  notificacoes: (apenasNaoLidas: boolean) => ['notificacoes', 'lista', { apenasNaoLidas }] as const,
  contagemNaoLidas: ['notificacoes', 'contagem'] as const,
  cliente: (id: number) => ['cliente', id] as const,
  interacoes: (clienteId: number) => ['interacoes', clienteId] as const,
  tarefas: (status: StatusTarefa, somenteMinhas: boolean, clienteId?: number) =>
    ['tarefas', { status, somenteMinhas, clienteId }] as const,
}

export function useKpis(granularidade: Granularidade) {
  return useQuery({
    queryKey: queryKeys.kpis(granularidade),
    queryFn: () => api.kpis(granularidade),
    placeholderData: keepPreviousData, // evita "piscar" ao trocar o filtro temporal
  })
}

export function useClientes(niveis: NivelRisco[], busca: string) {
  return useQuery({
    queryKey: queryKeys.clientes(niveis, busca),
    queryFn: () => api.clientes({ niveis, busca }),
    placeholderData: keepPreviousData,
  })
}

export function useCliente(id: number) {
  return useQuery({
    queryKey: queryKeys.cliente(id),
    queryFn: () => api.cliente(id),
    enabled: Number.isFinite(id),
    retry: false, // 404 (fora da carteira) não deve ser repetido
  })
}

/** Mutações de contato: depois de qualquer mudança, recarrega o detalhe do cliente. */
export function useSalvarContato(clienteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contatoId, dados }: { contatoId?: number; dados: ContatoInput }) =>
      contatoId ? api.atualizarContato(clienteId, contatoId, dados) : api.criarContato(clienteId, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cliente(clienteId) }),
  })
}

export function useRemoverContato(clienteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contatoId: number) => api.removerContato(clienteId, contatoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cliente(clienteId) }),
  })
}

export function useInteracoes(clienteId: number) {
  return useQuery({ queryKey: queryKeys.interacoes(clienteId), queryFn: () => api.interacoes(clienteId) })
}

export function useRegistrarInteracao(clienteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: InteracaoInput) => api.registrarInteracao(clienteId, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.interacoes(clienteId) }),
  })
}

export function useTarefas(status: StatusTarefa, somenteMinhas = false, clienteId?: number) {
  return useQuery({
    queryKey: queryKeys.tarefas(status, somenteMinhas, clienteId),
    queryFn: () => api.tarefas({ status, somenteMinhas, clienteId }),
    placeholderData: keepPreviousData,
  })
}

/** Qualquer mudança em tarefa invalida as listas; concluir com resumo também cria uma interação. */
function useInvalidarTarefas() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['tarefas'] })
    qc.invalidateQueries({ queryKey: ['interacoes'] })
  }
}

export function useCriarTarefa() {
  const invalidar = useInvalidarTarefas()
  return useMutation({ mutationFn: (dados: TarefaInput) => api.criarTarefa(dados), onSuccess: invalidar })
}

export function useConcluirTarefa() {
  const invalidar = useInvalidarTarefas()
  return useMutation({
    mutationFn: ({ id, dados }: { id: number; dados: ConcluirTarefaInput }) => api.concluirTarefa(id, dados),
    onSuccess: invalidar,
  })
}

export function useCancelarTarefa() {
  const invalidar = useInvalidarTarefas()
  return useMutation({ mutationFn: (id: number) => api.cancelarTarefa(id), onSuccess: invalidar })
}

export function useCriarTarefaDeAlerta() {
  const invalidar = useInvalidarTarefas()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notificacaoId: number) => api.criarTarefaDeAlerta(notificacaoId),
    onSuccess: () => {
      invalidar()
      qc.invalidateQueries({ queryKey: ['notificacoes'] }) // o alerta passa a "lido"
    },
  })
}

export function useOportunidades(situacao: SituacaoOportunidade, somenteMinhas: boolean) {
  return useQuery({
    queryKey: ['oportunidades', 'lista', { situacao, somenteMinhas }] as const,
    queryFn: () => api.oportunidades({ situacao, somenteMinhas }),
    placeholderData: keepPreviousData,
  })
}

export function useFunilResumo(somenteMinhas: boolean) {
  return useQuery({
    queryKey: ['oportunidades', 'resumo', { somenteMinhas }] as const,
    queryFn: () => api.funilResumo(somenteMinhas),
    placeholderData: keepPreviousData,
  })
}

/** Qualquer mudança numa oportunidade muda a lista e os indicadores do funil. */
function useInvalidarOportunidades() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['oportunidades'] })
}

export function useCriarOportunidade() {
  const invalidar = useInvalidarOportunidades()
  return useMutation({ mutationFn: (d: OportunidadeInput) => api.criarOportunidade(d), onSuccess: invalidar })
}

export function useAtualizarOportunidade() {
  const invalidar = useInvalidarOportunidades()
  return useMutation({
    mutationFn: ({ id, dados }: { id: number; dados: OportunidadeEdicaoInput }) => api.atualizarOportunidade(id, dados),
    onSuccess: invalidar,
  })
}

export function useMoverOportunidade() {
  const invalidar = useInvalidarOportunidades()
  return useMutation({
    mutationFn: ({ id, dados }: { id: number; dados: MoverOportunidadeInput }) => api.moverOportunidade(id, dados),
    onSuccess: invalidar,
  })
}

/** O feed é alimentado de forma assíncrona pelo RabbitMQ, por isso fazemos polling leve. */
export function useNotificacoes(apenasNaoLidas = false) {
  return useQuery({
    queryKey: queryKeys.notificacoes(apenasNaoLidas),
    queryFn: () => api.notificacoes(apenasNaoLidas),
    refetchInterval: 10_000,
  })
}

export function useContagemNaoLidas() {
  return useQuery({
    queryKey: queryKeys.contagemNaoLidas,
    queryFn: api.contagemNaoLidas,
    refetchInterval: 5_000,
  })
}

function useInvalidarNotificacoes() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['notificacoes'] })
}

export function useMarcarComoLida() {
  const invalidar = useInvalidarNotificacoes()
  return useMutation({ mutationFn: api.marcarComoLida, onSuccess: invalidar })
}

export function useMarcarTodasComoLidas() {
  const invalidar = useInvalidarNotificacoes()
  return useMutation({ mutationFn: api.marcarTodasComoLidas, onSuccess: invalidar })
}

/**
 * Dispara o job de inatividade. O job publica no RabbitMQ e os consumidores gravam os alertas
 * de forma assíncrona, por isso invalidamos já e novamente após um curto intervalo.
 */
export function useExecutarAnaliseInatividade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.executarAnaliseInatividade,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['notificacoes'] })
      setTimeout(() => qc.invalidateQueries({ queryKey: ['notificacoes'] }), 1500)
    },
  })
}
