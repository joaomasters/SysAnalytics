package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.domain.NotificacaoAlerta;

import java.time.OffsetDateTime;

public record NotificacaoResponse(
        Long id,
        Long clienteId,
        String clienteNome,
        Long vendedorId,
        String vendedorNome,
        NivelRisco nivel,
        String nivelDescricao,
        Integer diasInatividade,
        String mensagem,
        boolean lida,
        OffsetDateTime criadaEm
) {

    public static NotificacaoResponse from(NotificacaoAlerta n) {
        return new NotificacaoResponse(
                n.getId(), n.getClienteId(), n.getClienteNome(),
                n.getVendedorId(), n.getVendedorNome(),
                n.getNivel(), n.getNivel().getDescricao(),
                n.getDiasInatividade(), n.getMensagem(), n.isLida(), n.getCriadaEm());
    }
}
