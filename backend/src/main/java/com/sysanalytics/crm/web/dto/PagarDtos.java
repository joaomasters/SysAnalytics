package com.sysanalytics.crm.web.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** DTOs do módulo financeiro: fornecedores, contas a pagar, fluxo de caixa e DRE. */
public final class PagarDtos {

    private PagarDtos() {
    }

    // ------------------------------------------------------------------ fornecedores

    public record FornecedorRequest(
            @NotBlank(message = "Nome é obrigatório") @Size(max = 160, message = "Nome: máximo de 160 caracteres") String nome,
            @Size(max = 18, message = "Documento: máximo de 18 caracteres") String documento,
            @Size(max = 120, message = "Contato: máximo de 120 caracteres") String contato,
            @Email(message = "E-mail inválido") @Size(max = 160, message = "E-mail: máximo de 160 caracteres") String email,
            @Size(max = 20, message = "Telefone: máximo de 20 caracteres") String telefone,
            /** Opcional: em branco mantém (edição) ou ativa (criação). */
            Boolean ativo
    ) {
    }

    public record FornecedorResponse(
            Long id,
            String nome,
            String documento,
            String contato,
            String email,
            String telefone,
            boolean ativo,
            BigDecimal totalAberto,
            BigDecimal totalVencido
    ) {
    }

    // ------------------------------------------------------------------ contas a pagar

    public record ContaRequest(
            @NotNull(message = "Fornecedor é obrigatório") Long fornecedorId,
            @NotBlank(message = "Número do documento é obrigatório")
            @Size(max = 40, message = "Documento: máximo de 40 caracteres") String numeroDocumento,
            @Size(max = 200, message = "Descrição: máximo de 200 caracteres") String descricao,
            @NotBlank(message = "Categoria é obrigatória") String categoria,
            @NotNull(message = "Data de emissão é obrigatória") LocalDate dataEmissao,
            @NotNull(message = "Primeiro vencimento é obrigatório") LocalDate primeiroVencimento,
            @NotNull(message = "Valor é obrigatório")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
            @Digits(integer = 13, fraction = 2, message = "Valor inválido") BigDecimal valorTotal,
            @Min(value = 1, message = "Mínimo de 1 parcela") @Max(value = 60, message = "Máximo de 60 parcelas") Integer parcelas,
            @Min(value = 1, message = "Intervalo mínimo de 1 dia") @Max(value = 365, message = "Intervalo máximo de 365 dias") Integer intervaloDias
    ) {
    }

    public record PagamentoRequest(
            @NotNull(message = "Data do pagamento é obrigatória") LocalDate dataPagamento,
            @NotNull(message = "Valor é obrigatório")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
            @Digits(integer = 13, fraction = 2, message = "Valor inválido") BigDecimal valor,
            @NotBlank(message = "Forma de pagamento é obrigatória") String formaPagamento,
            @Size(max = 300, message = "Observação: máximo de 300 caracteres") String observacao
    ) {
    }

    public record ContaResumo(
            Long id,
            Long fornecedorId,
            String fornecedorNome,
            String numeroDocumento,
            int parcela,
            int totalParcelas,
            String descricao,
            String categoria,
            LocalDate dataEmissao,
            LocalDate dataVencimento,
            BigDecimal valor,
            BigDecimal valorPago,
            BigDecimal saldo,
            /** Status gravado: ABERTO, PARCIAL, PAGO ou CANCELADO. */
            String status,
            /** Situação calculada: A_VENCER, VENCIDO, PAGO ou CANCELADO. */
            String situacao,
            int diasAtraso
    ) {
    }

    public record PagamentoItem(
            Long id,
            LocalDate dataPagamento,
            BigDecimal valor,
            String formaPagamento,
            String observacao,
            String usuarioNome,
            OffsetDateTime criadaEm
    ) {
    }

    public record ContaDetalhe(ContaResumo conta, List<PagamentoItem> pagamentos) {
    }

    public record FaixaAging(String faixa, BigDecimal valor, long quantidade) {
    }

    public record CategoriaValor(String categoria, BigDecimal valor) {
    }

    public record FornecedorSaldo(Long fornecedorId, String fornecedorNome, BigDecimal aberto, BigDecimal vencido) {
    }

    public record ResumoPagar(
            BigDecimal totalAberto,
            BigDecimal aVencer,
            BigDecimal vence7Dias,
            BigDecimal vencido,
            long contasAbertas,
            long contasVencidas,
            BigDecimal pagoNoMes,
            List<FaixaAging> aging,
            List<CategoriaValor> abertoPorCategoria,
            List<FornecedorSaldo> maioresFornecedores
    ) {
    }

    // ------------------------------------------------------------------ fluxo de caixa

    public record FluxoSemana(
            LocalDate inicio,
            LocalDate fim,
            BigDecimal entradas,
            BigDecimal saidas,
            BigDecimal saldo,
            BigDecimal saldoAcumulado
    ) {
    }

    public record FluxoHistorico(String mes, BigDecimal recebido, BigDecimal pago) {
    }

    public record FluxoCaixa(
            LocalDate hoje,
            BigDecimal saldoInicial,
            /** Receber vencido (fora da projeção, a menos que incluído) e pagar vencido (sempre na 1ª semana). */
            BigDecimal receberAtrasado,
            BigDecimal pagarAtrasado,
            boolean incluiReceberAtrasado,
            List<FluxoSemana> semanas,
            BigDecimal totalEntradas,
            BigDecimal totalSaidas,
            BigDecimal saldoFinalProjetado,
            BigDecimal menorSaldo,
            LocalDate semanaMenorSaldo,
            List<FluxoHistorico> historico
    ) {
    }

    // ------------------------------------------------------------------ DRE / margem

    public record DreMes(
            int mes,
            BigDecimal receitaBruta,
            BigDecimal cmv,
            BigDecimal margemBruta,
            BigDecimal custosVariaveis,
            BigDecimal margemContribuicao,
            BigDecimal custosFixos,
            BigDecimal resultadoOperacional,
            BigDecimal margemBrutaPct,
            BigDecimal margemContribuicaoPct,
            BigDecimal resultadoPct
    ) {
    }

    public record DreCategoria(String tipo, String categoria, BigDecimal valor) {
    }

    public record Dre(int ano, List<DreMes> meses, DreMes total, List<DreCategoria> categorias) {
    }
}
