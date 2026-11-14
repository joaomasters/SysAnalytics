package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.EtapaOportunidade;
import com.sysanalytics.crm.domain.MotivoPerda;
import jakarta.validation.Valid;
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
            /** Opcional quando há itens do catálogo (nesse caso o valor é a soma dos itens). */
            @DecimalMin(value = "0.00", message = "Valor estimado não pode ser negativo")
            @Digits(integer = 13, fraction = 2, message = "Valor estimado inválido") BigDecimal valorEstimado,
            LocalDate dataPrevistaFechamento,
            /** Opcional: padrão é o próprio usuário. Vendedor só pode atribuir a si mesmo. */
            Long responsavelId,
            /** Produtos de interesse escolhidos do catálogo. */
            @Valid List<ItemRequest> itens
    ) {
    }

    public record ItemRequest(
            @NotNull(message = "Produto é obrigatório") Long produtoId,
            @NotNull(message = "Quantidade é obrigatória")
            @DecimalMin(value = "0.001", message = "Quantidade deve ser maior que zero")
            @Digits(integer = 9, fraction = 3, message = "Quantidade inválida") BigDecimal quantidade
    ) {
    }

    public record ItensRequest(@Valid @NotNull(message = "Itens são obrigatórios") List<ItemRequest> itens) {
    }

    public record ItemResponse(
            Long id,
            Long produtoId,
            String descricao,
            String unidade,
            BigDecimal quantidade,
            BigDecimal precoUnitario,
            BigDecimal total
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
