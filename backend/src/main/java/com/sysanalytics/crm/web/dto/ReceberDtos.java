package com.sysanalytics.crm.web.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** DTOs do módulo financeiro: contas a receber e cobrança. */
public final class ReceberDtos {

    private ReceberDtos() {
    }

    public record TituloRequest(
            @NotNull(message = "Cliente é obrigatório") Long clienteId,
            @NotBlank(message = "Número do documento é obrigatório")
            @Size(max = 40, message = "Documento: máximo de 40 caracteres") String numeroDocumento,
            @Size(max = 200, message = "Descrição: máximo de 200 caracteres") String descricao,
            @NotNull(message = "Data de emissão é obrigatória") LocalDate dataEmissao,
            @NotNull(message = "Primeiro vencimento é obrigatório") LocalDate primeiroVencimento,
            @NotNull(message = "Valor é obrigatório")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
            @Digits(integer = 13, fraction = 2, message = "Valor inválido") BigDecimal valorTotal,
            @Min(value = 1, message = "Mínimo de 1 parcela") @Max(value = 60, message = "Máximo de 60 parcelas") Integer parcelas,
            @Min(value = 1, message = "Intervalo mínimo de 1 dia") @Max(value = 365, message = "Intervalo máximo de 365 dias") Integer intervaloDias
    ) {
    }

    public record BaixaRequest(
            @NotNull(message = "Data da baixa é obrigatória") LocalDate dataBaixa,
            @NotNull(message = "Valor é obrigatório")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
            @Digits(integer = 13, fraction = 2, message = "Valor inválido") BigDecimal valor,
            @NotBlank(message = "Forma de pagamento é obrigatória") String formaPagamento,
            @Size(max = 300, message = "Observação: máximo de 300 caracteres") String observacao
    ) {
    }

    public record CobrancaRequest(
            @NotBlank(message = "Tipo de contato é obrigatório") String tipo,
            @NotBlank(message = "Resultado é obrigatório") String resultado,
            @NotBlank(message = "Descreva o contato") @Size(max = 500, message = "Resumo: máximo de 500 caracteres") String resumo,
            LocalDate promessaData,
            @DecimalMin(value = "0.01", message = "O valor prometido deve ser maior que zero")
            @Digits(integer = 13, fraction = 2, message = "Valor inválido") BigDecimal promessaValor
    ) {
    }

    public record TituloResumo(
            Long id,
            Long clienteId,
            String clienteNome,
            String vendedorNome,
            String numeroDocumento,
            int parcela,
            int totalParcelas,
            String descricao,
            LocalDate dataEmissao,
            LocalDate dataVencimento,
            BigDecimal valor,
            BigDecimal valorPago,
            BigDecimal saldo,
            /** Status gravado: ABERTO, PARCIAL, PAGO ou CANCELADO. */
            String status,
            /** Situação calculada: A_VENCER, VENCIDO, PAGO ou CANCELADO. */
            String situacao,
            int diasAtraso,
            OffsetDateTime ultimaCobrancaEm,
            /** Próxima promessa de pagamento ainda não vencida, se houver. */
            LocalDate promessaData
    ) {
    }

    public record BaixaItem(
            Long id,
            LocalDate dataBaixa,
            BigDecimal valor,
            String formaPagamento,
            String observacao,
            String usuarioNome,
            OffsetDateTime criadaEm
    ) {
    }

    public record CobrancaItem(
            Long id,
            String tipo,
            String resultado,
            String resumo,
            LocalDate promessaData,
            BigDecimal promessaValor,
            /** PENDENTE, CUMPRIDA ou QUEBRADA (só para promessas). */
            String promessaStatus,
            String usuarioNome,
            OffsetDateTime criadaEm
    ) {
    }

    public record TituloDetalhe(TituloResumo titulo, List<BaixaItem> baixas, List<CobrancaItem> cobrancas) {
    }

    public record FaixaAging(String faixa, BigDecimal valor, long quantidade) {
    }

    public record Devedor(Long clienteId, String clienteNome, BigDecimal vencido, long titulos, int maiorAtraso) {
    }

    public record ResumoReceber(
            BigDecimal totalAberto,
            BigDecimal aVencer,
            BigDecimal vence7Dias,
            BigDecimal vencido,
            long titulosAbertos,
            long titulosVencidos,
            BigDecimal recebidoNoMes,
            /** vencido / total em aberto, em %. Nulo sem carteira em aberto. */
            BigDecimal inadimplenciaPercentual,
            /** Média de dias entre emissão e quitação dos títulos pagos nos últimos 90 dias. */
            BigDecimal prazoMedioRecebimentoDias,
            List<FaixaAging> aging,
            List<Devedor> maioresDevedores,
            long promessasPendentes,
            long promessasQuebradas
    ) {
    }
}
