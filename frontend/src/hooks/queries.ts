import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  UsuarioInput,
  CargaInput,
  EventoCargaInput,
  FiltrosCargas,
  SentidoCarga,
  TransportadoraInput,
  ContaInput,
  FiltrosFluxo,
  FiltrosPagar,
  FornecedorInput,
  PagamentoInput,
  BaixaInput,
  CobrancaInput,
  ConcluirTarefaInput,
  FiltrosReceber,
  ContatoInput,
  Granularidade,
  InteracaoInput,
  MetaItem,
  MoverOportunidadeInput,
  ItemOportunidadeInput,
  NivelRisco,
  OportunidadeEdicaoInput,
  OportunidadeInput,
  ProdutoInput,
  PropostaInput,
  SituacaoOportunidade,
  StatusProposta,
  StatusTarefa,
  TarefaInput,
  TituloInput,
} from '@/api/types'

export const queryKeys = {
  kpis: (g: Granularidade) => ['kpis', g] as const,
  clientes: (niveis: NivelRisco[], busca: string) => ['clientes', { niveis, busca }] as const,
  notificacoes: (apenasNaoLidas: boolean, pagina: number, tamanho: number) =>
    ['notificacoes', 'lista', { apenasNaoLidas, pagina, tamanho }] as const,
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

export function useItensOportunidade(id: number) {
  return useQuery({
    queryKey: ['oportunidades', 'itens', id] as const,
    queryFn: () => api.itensOportunidade(id),
    enabled: Number.isFinite(id),
  })
}

export function useDefinirItensOportunidade(id: number) {
  const invalidar = useInvalidarOportunidades()
  return useMutation({
    mutationFn: (itens: ItemOportunidadeInput[]) => api.definirItensOportunidade(id, itens),
    onSuccess: invalidar,
  })
}

export function useOportunidade(id: number) {
  return useQuery({
    queryKey: ['oportunidades', 'detalhe', id] as const,
    queryFn: () => api.oportunidade(id),
    enabled: Number.isFinite(id),
    retry: false,
  })
}

export function useProdutos(busca: string, incluirInativos = false) {
  return useQuery({
    queryKey: ['produtos', { busca, incluirInativos }] as const,
    queryFn: () => api.produtos(busca, incluirInativos),
    placeholderData: keepPreviousData,
  })
}

export function useSalvarProduto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id?: number; dados: ProdutoInput }) =>
      id ? api.atualizarProduto(id, dados) : api.criarProduto(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  })
}

export function usePropostas(oportunidadeId: number) {
  return useQuery({
    queryKey: ['propostas', 'lista', oportunidadeId] as const,
    queryFn: () => api.propostas(oportunidadeId),
    enabled: Number.isFinite(oportunidadeId),
  })
}

export function useProposta(id: number) {
  return useQuery({
    queryKey: ['propostas', 'detalhe', id] as const,
    queryFn: () => api.proposta(id),
    enabled: Number.isFinite(id),
    retry: false,
  })
}

/** Enviar uma proposta muda o valor/etapa da oportunidade, então as duas famílias de dados são recarregadas. */
function useInvalidarPropostas() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['propostas'] })
    qc.invalidateQueries({ queryKey: ['oportunidades'] })
  }
}

export function useCriarProposta(oportunidadeId: number) {
  const invalidar = useInvalidarPropostas()
  return useMutation({
    mutationFn: (dados: PropostaInput) => api.criarProposta(oportunidadeId, dados),
    onSuccess: invalidar,
  })
}

export function useAtualizarProposta(id: number) {
  const invalidar = useInvalidarPropostas()
  return useMutation({ mutationFn: (dados: PropostaInput) => api.atualizarProposta(id, dados), onSuccess: invalidar })
}

export function useStatusProposta(id: number) {
  const invalidar = useInvalidarPropostas()
  return useMutation({ mutationFn: (status: StatusProposta) => api.statusProposta(id, status), onSuccess: invalidar })
}

export function useExcluirProposta(id: number) {
  const invalidar = useInvalidarPropostas()
  return useMutation({ mutationFn: () => api.excluirProposta(id), onSuccess: invalidar })
}

/** O feed é alimentado de forma assíncrona pelo RabbitMQ, por isso fazemos polling leve. */
export function useNotificacoes(apenasNaoLidas = false, pagina = 0, tamanho = 100) {
  return useQuery({
    queryKey: queryKeys.notificacoes(apenasNaoLidas, pagina, tamanho),
    queryFn: () => api.notificacoes(apenasNaoLidas, pagina, tamanho),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
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

export function useMetas(mes: string) {
  return useQuery({
    queryKey: ['metas', mes] as const,
    queryFn: () => api.metas(mes),
    placeholderData: keepPreviousData,
  })
}

export function useSalvarMetas(mes: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (metas: MetaItem[]) => api.salvarMetas(mes, metas),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metas'] }),
  })
}

export function useReceber(filtros: FiltrosReceber) {
  return useQuery({
    queryKey: ['receber', 'lista', filtros] as const,
    queryFn: () => api.receber(filtros),
    placeholderData: keepPreviousData,
  })
}

export function useReceberResumo() {
  return useQuery({ queryKey: ['receber', 'resumo'] as const, queryFn: () => api.receberResumo() })
}

export function useTituloReceber(id: number) {
  return useQuery({
    queryKey: ['receber', 'detalhe', id] as const,
    queryFn: () => api.titulo(id),
    enabled: Number.isFinite(id),
    retry: false,
  })
}

export function useCriarTitulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: TituloInput) => api.criarTitulo(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receber'] }),
  })
}

export function useBaixarTitulo(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: BaixaInput) => api.baixarTitulo(id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receber'] }),
  })
}

export function useEstornarBaixa(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (baixaId: number) => api.estornarBaixa(id, baixaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receber'] }),
  })
}

export function useCancelarTitulo(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.cancelarTitulo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receber'] }),
  })
}

export function useRegistrarCobranca(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: CobrancaInput) => api.registrarCobranca(id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receber'] }),
  })
}

// ---------------------------------------------------------------- financeiro: a pagar, fluxo de caixa, DRE

const invalidarFinanceiro = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['pagar'] })
  qc.invalidateQueries({ queryKey: ['fornecedores'] })
  qc.invalidateQueries({ queryKey: ['fluxo'] })
  qc.invalidateQueries({ queryKey: ['dre'] })
}

export function useFornecedores(busca: string, incluirInativos = false) {
  return useQuery({
    queryKey: ['fornecedores', { busca, incluirInativos }] as const,
    queryFn: () => api.fornecedores(busca, incluirInativos),
    placeholderData: keepPreviousData,
  })
}

export function useSalvarFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id?: number; dados: FornecedorInput }) => api.salvarFornecedor(id, dados),
    onSuccess: () => invalidarFinanceiro(qc),
  })
}

export function usePagar(filtros: FiltrosPagar) {
  return useQuery({
    queryKey: ['pagar', 'lista', filtros] as const,
    queryFn: () => api.pagar(filtros),
    placeholderData: keepPreviousData,
  })
}

export function usePagarResumo() {
  return useQuery({ queryKey: ['pagar', 'resumo'] as const, queryFn: () => api.pagarResumo() })
}

export function useConta(id: number) {
  return useQuery({
    queryKey: ['pagar', 'detalhe', id] as const,
    queryFn: () => api.conta(id),
    enabled: Number.isFinite(id),
    retry: false,
  })
}

export function useCriarConta() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (d: ContaInput) => api.criarConta(d), onSuccess: () => invalidarFinanceiro(qc) })
}

export function usePagarConta(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: PagamentoInput) => api.pagarConta(id, d),
    onSuccess: () => invalidarFinanceiro(qc),
  })
}

export function useEstornarPagamento(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pagamentoId: number) => api.estornarPagamento(id, pagamentoId),
    onSuccess: () => invalidarFinanceiro(qc),
  })
}

export function useCancelarConta(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => api.cancelarConta(id), onSuccess: () => invalidarFinanceiro(qc) })
}

export function useFluxoCaixa(filtros: FiltrosFluxo) {
  return useQuery({
    queryKey: ['fluxo', filtros] as const,
    queryFn: () => api.fluxoCaixa(filtros),
    placeholderData: keepPreviousData,
  })
}

export function useDre(ano: number) {
  return useQuery({ queryKey: ['dre', ano] as const, queryFn: () => api.dre(ano), placeholderData: keepPreviousData })
}

// ---------------------------------------------------------------- logística

const invalidarLogistica = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['cargas'] })
  qc.invalidateQueries({ queryKey: ['transportadoras'] })
}

export function useTransportadoras(busca: string, incluirInativos = false, habilitado = true) {
  return useQuery({
    queryKey: ['transportadoras', { busca, incluirInativos }] as const,
    queryFn: () => api.transportadoras(busca, incluirInativos),
    placeholderData: keepPreviousData,
    enabled: habilitado,
  })
}

export function useSalvarTransportadora() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id?: number; dados: TransportadoraInput }) => api.salvarTransportadora(id, dados),
    onSuccess: () => invalidarLogistica(qc),
  })
}

export function useCargas(filtros: FiltrosCargas) {
  return useQuery({
    queryKey: ['cargas', 'lista', filtros] as const,
    queryFn: () => api.cargas(filtros),
    placeholderData: keepPreviousData,
  })
}

export function useCargasResumo(sentido?: SentidoCarga) {
  return useQuery({ queryKey: ['cargas', 'resumo', sentido ?? 'TODOS'] as const, queryFn: () => api.cargasResumo(sentido) })
}

export function useCarga(id: number) {
  return useQuery({
    queryKey: ['cargas', 'detalhe', id] as const,
    queryFn: () => api.carga(id),
    enabled: Number.isFinite(id),
    retry: false,
  })
}

export function useCriarCarga() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (d: CargaInput) => api.criarCarga(d), onSuccess: () => invalidarLogistica(qc) })
}

export function useAtualizarCarga(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (d: CargaInput) => api.atualizarCarga(id, d), onSuccess: () => invalidarLogistica(qc) })
}

export function useEventoCarga(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (d: EventoCargaInput) => api.eventoCarga(id, d), onSuccess: () => invalidarLogistica(qc) })
}

export function useResolverOcorrencia(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (eventoId: number) => api.resolverOcorrencia(id, eventoId), onSuccess: () => invalidarLogistica(qc) })
}

export function useCancelarCarga(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (motivo: string) => api.cancelarCarga(id, motivo), onSuccess: () => invalidarLogistica(qc) })
}

// ---------------------------------------------------------------- indicadores

export const useIndicadoresVendas = (meses: number) =>
  useQuery({ queryKey: ['ind-vendas', meses] as const, queryFn: () => api.indicadoresVendas(meses), placeholderData: keepPreviousData })
export const useIndicadoresClientes = (meses: number) =>
  useQuery({ queryKey: ['ind-clientes', meses] as const, queryFn: () => api.indicadoresClientes(meses), placeholderData: keepPreviousData })
export const useIndicadoresFinanceiro = (meses: number) =>
  useQuery({ queryKey: ['ind-financeiro', meses] as const, queryFn: () => api.indicadoresFinanceiro(meses), placeholderData: keepPreviousData })
export const useIndicadoresLogistica = (meses: number) =>
  useQuery({ queryKey: ['ind-logistica', meses] as const, queryFn: () => api.indicadoresLogistica(meses), placeholderData: keepPreviousData })

// ---------------------------------------------------------------- usuários

export const useUsuarios = (busca: string, incluirInativos: boolean) =>
  useQuery({ queryKey: ['usuarios', { busca, incluirInativos }] as const, queryFn: () => api.usuarios(busca, incluirInativos), placeholderData: keepPreviousData })

export const useVendedoresOpcao = (habilitado = true) =>
  useQuery({ queryKey: ['usuarios-vendedores'] as const, queryFn: api.vendedoresOpcao, enabled: habilitado })

export const useEventosSeguranca = () =>
  useQuery({ queryKey: ['usuarios-eventos'] as const, queryFn: api.eventosSeguranca })

function useMutacaoUsuario<T, V>(fn: (v: V) => Promise<T>, silencioso = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: { silencioso },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      qc.invalidateQueries({ queryKey: ['usuarios-vendedores'] })
      qc.invalidateQueries({ queryKey: ['usuarios-eventos'] })
    },
  })
}

export const useCriarUsuario = () => useMutacaoUsuario((d: UsuarioInput) => api.criarUsuario(d), true)
export const useAtualizarUsuario = () => useMutacaoUsuario(({ id, dados }: { id: number; dados: UsuarioInput }) => api.atualizarUsuario(id, dados), true)
export const useDefinirUsuarioAtivo = () => useMutacaoUsuario(({ id, ativo }: { id: number; ativo: boolean }) => api.definirUsuarioAtivo(id, ativo))
export const useRedefinirSenhaUsuario = () => useMutacaoUsuario((id: number) => api.redefinirSenhaUsuario(id))
export const useDesbloquearUsuario = () => useMutacaoUsuario((id: number) => api.desbloquearUsuario(id))
