package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.OrigemTarefa;
import com.sysanalytics.crm.domain.ResultadoTarefa;
import com.sysanalytics.crm.domain.StatusTarefa;
import com.sysanalytics.crm.domain.TipoInteracao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class TarefaDtos {

    private TarefaDtos() {
    }

    public record TarefaRequest(
            @NotNull(message = "Cliente é obrigatório") Long clienteId,
            @NotBlank(message = "Título é obrigatório") @Size(max = 160, message = "Título: no máximo 160 caracteres") String titulo,
            @Size(max = 1000, message = "Descrição: no máximo 1000 caracteres") String descricao,
            @NotNull(message = "Prazo é obrigatório") LocalDate prazo,
            /** Opcional: padrão é o próprio usuário. Vendedor só pode atribuir a si mesmo. */
            Long responsavelId
    ) {
    }

    public record ConcluirRequest(
            @NotNull(message = "Resultado é obrigatório") ResultadoTarefa resultado,
            /** Opcional: se informado, também é registrado como interação no cliente. */
            @Size(max = 1000, message = "Resumo: no máximo 1000 caracteres") String resumo,
            /** Tipo da interação registrada junto (padrão OUTRO). */
            TipoInteracao tipoInteracao
    ) {
    }

    public record TarefaResponse(
            Long id,
            Long clienteId,
            String clienteNome,
            Long responsavelId,
            String responsavelNome,
            String titulo,
            String descricao,
            LocalDate prazo,
            StatusTarefa status,
            OrigemTarefa origem,
            ResultadoTarefa resultado,
            boolean atrasada,
            OffsetDateTime concluidaEm,
            OffsetDateTime criadaEm
    ) {
    }
}
