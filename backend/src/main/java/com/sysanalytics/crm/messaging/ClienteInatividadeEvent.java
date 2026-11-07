package com.sysanalytics.crm.messaging;

import com.sysanalytics.crm.domain.NivelRisco;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Evento publicado em {@code crm.cliente.events} quando um cliente atinge uma faixa de inatividade. */
public record ClienteInatividadeEvent(
        UUID eventoId,
        Long clienteId,
        String clienteNome,
        String clienteCnpj,
        Long vendedorId,
        String vendedorNome,
        String vendedorEmail,
        String vendedorTelefone,
        LocalDate ultimaCompra,
        Integer diasInatividade,
        NivelRisco nivel,
        LocalDate dataReferencia,
        OffsetDateTime geradoEm
) {

    public String mensagem() {
        if (ultimaCompra == null) {
            return "Cliente %s não possui faturamento registado. Nível: %s"
                    .formatted(clienteNome, nivel.getDescricao());
        }
        return "Cliente %s está há %d dias sem faturar. Nível: %s"
                .formatted(clienteNome, diasInatividade, nivel.getDescricao());
    }
}
