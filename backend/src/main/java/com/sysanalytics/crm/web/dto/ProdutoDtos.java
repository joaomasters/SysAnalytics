package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.Produto;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public final class ProdutoDtos {

    private ProdutoDtos() {
    }

    public record ProdutoRequest(
            @NotBlank(message = "Código é obrigatório") @Size(max = 40, message = "Código: no máximo 40 caracteres") String codigo,
            @NotBlank(message = "Nome é obrigatório") @Size(max = 160, message = "Nome: no máximo 160 caracteres") String nome,
            @Size(max = 500, message = "Descrição: no máximo 500 caracteres") String descricao,
            @NotBlank(message = "Unidade é obrigatória") @Size(max = 10, message = "Unidade: no máximo 10 caracteres") String unidade,
            @NotNull(message = "Preço é obrigatório")
            @DecimalMin(value = "0.00", message = "Preço não pode ser negativo")
            @Digits(integer = 13, fraction = 2, message = "Preço inválido") BigDecimal precoUnitario,
            /** Na criação é ignorado (nasce ativo); na edição, nulo mantém o valor atual. */
            Boolean ativo
    ) {
    }

    public record ProdutoResponse(Long id, String codigo, String nome, String descricao, String unidade,
                                  BigDecimal precoUnitario, boolean ativo) {

        public static ProdutoResponse from(Produto p) {
            return new ProdutoResponse(p.getId(), p.getCodigo(), p.getNome(), p.getDescricao(), p.getUnidade(),
                    p.getPrecoUnitario(), p.isAtivo());
        }
    }
}
