package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.SituacaoMeta;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public final class MetaDtos {

    private MetaDtos() {
    }

    public record MetaItem(
            @NotNull(message = "Vendedor é obrigatório") Long vendedorId,
            /** Nulo remove a meta do vendedor naquele mês. */
            @DecimalMin(value = "0.00", message = "A meta não pode ser negativa")
            @Digits(integer = 13, fraction = 2, message = "Valor de meta inválido") BigDecimal valor
    ) {
    }

    public record MetasRequest(@NotNull(message = "Informe as metas") @Valid List<MetaItem> metas) {
    }

    public record MetaVendedor(
            Long vendedorId,
            String vendedorNome,
            String carteira,
            BigDecimal meta,
            BigDecimal realizado,
            /** realizado / meta, em %. Nulo sem meta (ou meta zero). */
            BigDecimal atingimento,
            /** Quanto deveria estar faturado hoje, pelo calendário, para fechar a meta no ritmo. */
            BigDecimal ritmoEsperado,
            BigDecimal faltaParaMeta,
            /** Oportunidades abertas com fechamento previsto no mês, ponderadas pela probabilidade. */
            BigDecimal previsaoFunil,
            /** (realizado + previsão do funil) / meta, em %. */
            BigDecimal atingimentoProjetado,
            SituacaoMeta situacao
    ) {
    }

    public record MetaMesResponse(
            String mes,
            int diasNoMes,
            int diasDecorridos,
            /** Soma de todas as linhas devolvidas (para o vendedor, só a dele). */
            MetaVendedor total,
            List<MetaVendedor> vendedores
    ) {
    }
}
