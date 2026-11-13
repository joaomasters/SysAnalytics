package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.StatusProposta;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class PropostaDtos {

    private PropostaDtos() {
    }

    /** Número de exibição derivado do id: PROP-000123. */
    public static String numero(Long id) {
        return "PROP-%06d".formatted(id);
    }

    public record ItemRequest(
            /** Opcional: item do catálogo (a empresa é validada). Nulo = item avulso. */
            Long produtoId,
            @NotBlank(message = "Descrição do item é obrigatória") @Size(max = 160, message = "Descrição do item: no máximo 160 caracteres") String descricao,
            @NotBlank(message = "Unidade do item é obrigatória") @Size(max = 10, message = "Unidade: no máximo 10 caracteres") String unidade,
            @NotNull(message = "Quantidade é obrigatória")
            @DecimalMin(value = "0.001", message = "Quantidade deve ser maior que zero")
            @Digits(integer = 9, fraction = 3, message = "Quantidade inválida") BigDecimal quantidade,
            @NotNull(message = "Preço unitário é obrigatório")
            @DecimalMin(value = "0.00", message = "Preço unitário não pode ser negativo")
            @Digits(integer = 13, fraction = 2, message = "Preço unitário inválido") BigDecimal precoUnitario,
            @DecimalMin(value = "0.00", message = "Desconto entre 0 e 100")
            @DecimalMax(value = "100.00", message = "Desconto entre 0 e 100")
            @Digits(integer = 3, fraction = 2, message = "Desconto inválido") BigDecimal descontoPercentual
    ) {
    }

    public record PropostaRequest(
            LocalDate validadeAte,
            @Size(max = 200, message = "Condições de pagamento: no máximo 200 caracteres") String condicoesPagamento,
            @Size(max = 1000, message = "Observações: no máximo 1000 caracteres") String observacoes,
            @Valid List<ItemRequest> itens
    ) {
    }

    public record StatusRequest(@NotNull(message = "Status é obrigatório") StatusProposta status) {
    }

    public record ItemResponse(Long id, Long produtoId, String descricao, String unidade, BigDecimal quantidade,
                               BigDecimal precoUnitario, BigDecimal descontoPercentual, BigDecimal total) {
    }

    public record PropostaResumo(Long id, String numero, StatusProposta status, LocalDate validadeAte,
                                 BigDecimal total, String criadaPor, OffsetDateTime criadaEm) {
    }

    public record PropostaDetalhe(
            Long id,
            String numero,
            StatusProposta status,
            Long oportunidadeId,
            String oportunidadeTitulo,
            Long clienteId,
            String clienteNome,
            String clienteRazaoSocial,
            String clienteCnpj,
            String contatoNome,
            String contatoEmail,
            String empresaNome,
            String elaboradaPor,
            LocalDate validadeAte,
            String condicoesPagamento,
            String observacoes,
            List<ItemResponse> itens,
            /** Soma de quantidade x preço, antes dos descontos. */
            BigDecimal subtotal,
            BigDecimal descontoTotal,
            BigDecimal total,
            OffsetDateTime criadaEm,
            OffsetDateTime atualizadaEm
    ) {
    }
}
