package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.repository.ClienteSituacao;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ClienteRiscoResponse(
        Long id,
        String nomeFantasia,
        String razaoSocial,
        String cnpj,
        String contato,
        String cidade,
        String uf,
        String segmento,
        Long vendedorId,
        String vendedorNome,
        String carteira,
        LocalDate ultimaCompra,
        Integer diasInatividade,
        long totalNotas,
        BigDecimal valorTotal,
        BigDecimal ticketMedio,
        NivelRisco nivelRisco,
        String nivelDescricao
) {

    public static ClienteRiscoResponse from(ClienteSituacao s) {
        return new ClienteRiscoResponse(
                s.clienteId(), s.nomeFantasia(), s.razaoSocial(), s.cnpj(), s.contato(),
                s.cidade(), s.uf(), s.segmento(),
                s.vendedorId(), s.vendedorNome(), s.carteira(),
                s.ultimaCompra(), s.diasInatividade(), s.totalNotas(),
                s.valorTotal(), s.ticketMedio(),
                s.nivel(), s.nivel().getDescricao());
    }
}
