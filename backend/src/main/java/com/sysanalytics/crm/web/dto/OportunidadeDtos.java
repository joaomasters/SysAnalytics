package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.EtapaOportunidade;
import com.sysanalytics.crm.domain.MotivoPerda;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class OportunidadeDtos {

    private OportunidadeDtos() {
    }

    public record OportunidadeRequest(
            @NotNull(message = "Cliente é obrigatório") Long clienteId,
            @NotBlank(message = "Título é obrigatório") @Size(max = 160, message = "Título: no máximo 160 caracteres") String titulo,
            @Size(max = 1000, message = "Descrição: no máximo 1000 caracteres") String descricao,
            @NotNull(message = "Valor estimado é obrigatório")
            @DecimalMin(value = "0.00", message = "Valor estimado não pode ser negativo")
            @Digits(integer = 13, fraction = 2, message = "Valor estimado inválido") BigDecimal valorEstimado,
            LocalDate dataPrevistaFechamento,
            /** Opcional: padrão é o próprio usuário. Vendedor só pode atribuir a si mesmo. */
            Long responsavelId
    ) {
    }

    public record OportunidadeEdicao(
            @NotBlank(message = "Título é obrigatório") @Size(max = 160, message = "Título: no máximo 160 caracteres") String titulo,
            @Size(max = 1000, message = "Descrição: no máximo 1000 caracteres") String descricao,
            @NotNull(message = "Valor estimado é obrigatório")
            @DecimalMin(value = "0.00", message = "Valor estimado não pode ser negativo")
            @Digits(integer = 13, fraction = 2, message = "Valor estimado inválido") BigDecimal valorEstimado,
            LocalDate dataPrevistaFechamento,
            @Min(value = 0, message = "Probabilidade entre 0 e 100") @Max(value = 100, message = "Probabilidade entre 0 e 100") Integer probabilidade,
            /** Só gestor/admin podem trocar o responsável. */
            Long responsavelId
    ) {
    }

    public record MoverRequest(
            @NotNull(message = "Etapa é obrigatória") EtapaOportunidade etapa,
            /** Obrigatório ao marcar como PERDIDA. */
            MotivoPerda motivoPerda,
            /** Opcional nas etapas abertas; padrão é o da etapa. */
            @Min(value = 0, message = "Probabilidade entre 0 e 100") @Max(value = 100, message = "Probabilidade entre 0 e 100") Integer probabilidade
    ) {
    }

    public record OportunidadeResponse(
            Long id,
            Long clienteId,
            String clienteNome,
            Long responsavelId,
            String responsavelNome,
            String titulo,
            String descricao,
            BigDecimal valorEstimado,
            int probabilidade,
            EtapaOportunidade etapa,
            LocalDate dataPrevistaFechamento,
            boolean atrasada,
            MotivoPerda motivoPerda,
            OffsetDateTime fechadaEm,
            OffsetDateTime criadaEm
    ) {
    }

    public record EtapaResumo(EtapaOportunidade etapa, long quantidade, BigDecimal valor, BigDecimal valorPonderado) {
    }

    public record FunilResumoResponse(
            List<EtapaResumo> etapas,
            BigDecimal pipelineAberto,
            /** Soma de valor x probabilidade das oportunidades abertas: a previsão de receita. */
            BigDecimal previsaoPonderada,
            long ganhasNoMes,
            BigDecimal valorGanhoNoMes,
            /** Ganhas / (ganhas + perdidas) nos últimos 90 dias, em %. Nulo se nada foi encerrado. */
            BigDecimal taxaConversao90d
    ) {
    }
}
