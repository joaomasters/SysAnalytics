import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Granularidade, NivelRisco } from '@/api/types'

export const queryKeys = {
  kpis: (g: Granularidade) => ['kpis', g] as const,
  clientes: (niveis: NivelRisco[], busca: string) => ['clientes', { niveis, busca }] as const,
  notificacoes: (apenasNaoLidas: boolean) => ['notificacoes', 'lista', { apenasNaoLidas }] as const,
  contagemNaoLidas: ['notificacoes', 'contagem'] as const,
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
