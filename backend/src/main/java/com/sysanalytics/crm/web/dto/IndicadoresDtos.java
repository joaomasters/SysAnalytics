package com.sysanalytics.crm.web.dto;

import java.math.BigDecimal;
import java.util.List;

/** DTOs dos painéis de indicadores avançados (vendas, clientes, financeiro e logística). Gestor/admin. */
public final class IndicadoresDtos {

    private IndicadoresDtos() {
    }

    public record Rotulo(String rotulo, BigDecimal valor, long quantidade) {
    }

    // ------------------------------------------------------------------ vendas

    public record VendaMes(String mes, BigDecimal faturamento, long notas, BigDecimal ticketMedio, long clientes) {
    }

    public record VendedorDesempenho(
            Long id, String nome, BigDecimal faturamento, long notas, BigDecimal ticketMedio, long clientes,
            BigDecimal participacaoPct, BigDecimal metaMes, BigDecimal realizadoMes, BigDecimal atingimentoPct) {
    }

    public record FunilIndicadores(
            long criadas, long ganhas, long perdidas, long abertas,
            /** Ganhas / (ganhas + perdidas) fechadas no período, em %. */
            BigDecimal taxaConversaoPct,
            BigDecimal cicloMedioDias, BigDecimal ticketMedioGanho,
            BigDecimal valorGanho, BigDecimal valorPerdido, BigDecimal pipelineAberto, BigDecimal previsaoPonderada,
            List<Rotulo> perdasPorMotivo) {
    }

    public record PropostasIndicadores(
            long enviadas, long aceitas, long recusadas,
            /** Aceitas / (aceitas + recusadas), em %. */
            BigDecimal taxaAceitePct, BigDecimal descontoMedioPct, BigDecimal valorAceito, List<ProdutoCotado> topProdutos) {
    }

    public record ProdutoCotado(String descricao, BigDecimal quantidade, BigDecimal valor, long propostas) {
    }

    public record IndicadoresVendas(
            int meses, BigDecimal faturamento, BigDecimal faturamentoAnterior, BigDecimal variacaoPct,
            long notas, BigDecimal ticketMedio, long clientesAtendidos,
            List<VendaMes> serie, List<VendedorDesempenho> vendedores, FunilIndicadores funil, PropostasIndicadores propostas) {
    }

    // ------------------------------------------------------------------ clientes

    public record ClasseAbc(String classe, long clientes, BigDecimal clientesPct, BigDecimal faturamento, BigDecimal participacaoPct) {
    }

    public record RetencaoMes(String mes, long ativos, long recorrentes, BigDecimal retencaoPct) {
    }

    public record IndicadoresClientes(
            int meses, long totalClientes, long ativos90d, long inativos90d, BigDecimal taxaAtividadePct, long novosNoPeriodo,
            BigDecimal ticketMedioPorCliente, BigDecimal frequenciaMediaDias, BigDecimal recompraPct, BigDecimal concentracaoTop10Pct,
            List<Rotulo> faixasInatividade, List<ClasseAbc> curvaAbc, List<RetencaoMes> retencao,
            List<Rotulo> porSegmento, List<Rotulo> porUf, List<Rotulo> topClientes) {
    }

    // ------------------------------------------------------------------ financeiro

    public record FinanceiroMes(
            String mes, BigDecimal recebido, BigDecimal pago, BigDecimal saldo, BigDecimal receita,
            BigDecimal margemBrutaPct, BigDecimal resultadoPct) {
    }

    public record IndicadoresFinanceiro(
            int meses, BigDecimal prazoMedioRecebimentoDias, BigDecimal prazoMedioPagamentoDias, BigDecimal diferencaPrazoDias,
            BigDecimal inadimplenciaPct, BigDecimal pontualidadeRecebimentoPct, BigDecimal atrasoMedioRecebidosDias,
            BigDecimal aReceberAberto, BigDecimal aPagarAberto, BigDecimal posicaoLiquida,
            List<FinanceiroMes> serie, List<Rotulo> concentracaoRecebiveis, BigDecimal concentracaoTop5Pct) {
    }

    // ------------------------------------------------------------------ logística

    public record LogisticaMes(String mes, long entregues, BigDecimal pontualidadePct, BigDecimal prazoMedioDias, long ocorrencias, BigDecimal fretePct) {
    }

    public record LogisticaGrupo(
            String rotulo, long entregues, BigDecimal pontualidadePct, BigDecimal prazoMedioDias, BigDecimal atrasoMedioDias,
            BigDecimal ocorrenciasPor100, BigDecimal fretePct, BigDecimal freteTotal) {
    }

    public record IndicadoresLogistica(
            int meses, long cargas, long entregues, BigDecimal pontualidadePct, BigDecimal prazoMedioDias, BigDecimal atrasoMedioDias,
            BigDecimal fretePct, BigDecimal ocorrenciasPor100,
            List<LogisticaMes> serie, List<LogisticaGrupo> porSentido, List<LogisticaGrupo> porTransportadora,
            List<LogisticaGrupo> porUfDestino, List<LogisticaGrupo> porFornecedor) {
    }
}
