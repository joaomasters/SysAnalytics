package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.TipoInteracao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public final class InteracaoDtos {

    private InteracaoDtos() {
    }

    public record InteracaoRequest(
            @NotNull(message = "Tipo é obrigatório") TipoInteracao tipo,
            /** Opcional: padrão é agora. */
            OffsetDateTime dataHora,
            @NotBlank(message = "Resumo é obrigatório") @Size(max = 1000, message = "Resumo: no máximo 1000 caracteres") String resumo,
            Long contatoId
    ) {
    }

    public record InteracaoResponse(Long id, TipoInteracao tipo, OffsetDateTime dataHora, String resumo,
                                    Long contatoId, String contatoNome, Long usuarioId, String usuarioNome) {
    }
}
