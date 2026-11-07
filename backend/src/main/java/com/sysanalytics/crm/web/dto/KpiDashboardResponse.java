package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.service.Granularidade;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record KpiDashboardResponse(
        Granularidade granularidade,
        LocalDate inicio,
        LocalDate fim,
        Resumo resumo,
        List<PontoSerie> serie,
        List<TicketVendedor> ticketMedioPorVendedor
) {

    public record Resumo(
            BigDecimal faturamentoTotal,
            BigDecimal custoTotal,
            BigDecimal custoFixo,
            BigDecimal custoVariavel,
            BigDecimal saldoOperacional,
            BigDecimal margemPercentual,
            BigDecimal ticketMedioGeral,
            long totalNotas,
            long totalClientes,
            long clientesEmRisco,
            Map<NivelRisco, Long> clientesPorNivel
    ) {
    }

    /** Um ponto da série temporal (dia, semana, mês ou semestre). */
    public record PontoSerie(
            LocalDate periodo,
            String rotulo,
            BigDecimal faturamento,
            BigDecimal custos,
            BigDecimal custosFixos,
            BigDecimal custosVariaveis,
            BigDecimal saldo,
            BigDecimal saldoAcumulado,
            BigDecimal margemPercentual,
            long notas
    ) {
    }

    public record TicketVendedor(
            Long vendedorId,
            String vendedorNome,
            String carteira,
            long totalNotas,
            long clientesAtendidos,
            BigDecimal faturamento,
            BigDecimal ticketMedio
    ) {
    }
}
