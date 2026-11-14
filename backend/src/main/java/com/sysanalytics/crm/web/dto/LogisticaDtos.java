package com.sysanalytics.crm.web.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** DTOs do módulo de logística: transportadoras e follow-up de cargas. */
public final class LogisticaDtos {

    private LogisticaDtos() {
    }

    // ------------------------------------------------------------------ transportadoras

    public record TransportadoraRequest(
            @NotBlank(message = "Nome é obrigatório") @Size(max = 160, message = "Nome: máximo de 160 caracteres") String nome,
            @Size(max = 18, message = "Documento: máximo de 18 caracteres") String documento,
            @Size(max = 120, message = "Contato: máximo de 120 caracteres") String contato,
            @Email(message = "E-mail inválido") @Size(max = 160, message = "E-mail: máximo de 160 caracteres") String email,
            @Size(max = 20, message = "Telefone: máximo de 20 caracteres") String telefone,
            Boolean ativo
    ) {
    }

    public record TransportadoraResponse(
            Long id,
            String nome,
            String documento,
            String contato,
            String email,
            String telefone,
            boolean ativo,
            long cargasAtivas,
            long entregues90d,
            /** Entregas no prazo / entregas, últimos 90 dias, em %. Nulo sem entregas. */
            BigDecimal pontualidadePct90d,
            long ocorrencias90d,
            BigDecimal freteTotal90d
    ) {
    }

    // ------------------------------------------------------------------ cargas

    public record CargaRequest(
            /** Só na criação: ENTRADA ou SAIDA. */
            String sentido,
            Long transportadoraId,
            /** Obrigatório em carga de ENTRADA. */
            Long fornecedorId,
            /** Obrigatório em carga de SAIDA. */
            Long clienteId,
            @Size(max = 40, message = "Documento: máximo de 40 caracteres") String numeroDocumento,
            @Size(max = 120, message = "Origem: máximo de 120 caracteres") String origem,
            @Size(max = 120, message = "Destino: máximo de 120 caracteres") String destino,
            @Size(max = 60, message = "Rastreio: máximo de 60 caracteres") String codigoRastreio,
            @NotNull(message = "Previsão de entrega é obrigatória") LocalDate previsaoEntrega,
            @DecimalMin(value = "0.00", message = "Peso não pode ser negativo")
            @Digits(integer = 9, fraction = 3, message = "Peso inválido") BigDecimal pesoKg,
            @Min(value = 0, message = "Volumes não pode ser negativo") @Max(value = 100000, message = "Volumes inválido") Integer volumes,
            @DecimalMin(value = "0.00", message = "Valor da mercadoria não pode ser negativo")
            @Digits(integer = 13, fraction = 2, message = "Valor da mercadoria inválido") BigDecimal valorMercadoria,
            @DecimalMin(value = "0.00", message = "Frete não pode ser negativo")
            @Digits(integer = 13, fraction = 2, message = "Frete inválido") BigDecimal valorFrete,
            @Size(max = 500, message = "Observação: máximo de 500 caracteres") String observacao
    ) {
    }

    public record EventoRequest(
            @NotBlank(message = "Tipo é obrigatório") String tipo,
            /** Obrigatória em OCORRENCIA. */
            String categoria,
            @NotBlank(message = "Descreva o evento") @Size(max = 500, message = "Descrição: máximo de 500 caracteres") String descricao,
            @Size(max = 120, message = "Local: máximo de 120 caracteres") String local,
            /** Data do embarque/entrega (padrão: hoje). */
            LocalDate data
    ) {
    }

    public record CancelamentoRequest(
            @NotBlank(message = "Informe o motivo do cancelamento") @Size(max = 500, message = "Motivo: máximo de 500 caracteres") String motivo
    ) {
    }

    public record CargaResumo(
            Long id,
            String sentido,
            String codigo,
            /** Status gravado: AGUARDANDO, EM_TRANSITO, ENTREGUE ou CANCELADA. */
            String status,
            /** Situação calculada: AGUARDANDO, EM_TRANSITO, ATRASADA, ENTREGUE ou CANCELADA. */
            String situacao,
            Long transportadoraId,
            String transportadoraNome,
            Long parceiroId,
            String parceiroNome,
            String numeroDocumento,
            String origem,
            String destino,
            String codigoRastreio,
            LocalDate dataEmbarque,
            LocalDate previsaoEntrega,
            LocalDate dataEntrega,
            int diasAtraso,
            /** Só para cargas entregues: entregou até a previsão. */
            Boolean noPrazo,
            BigDecimal pesoKg,
            Integer volumes,
            BigDecimal valorMercadoria,
            /** Oculto (nulo) para vendedor. */
            BigDecimal valorFrete,
            String observacao,
            int ocorrenciasAbertas
    ) {
    }

    public record EventoItem(
            Long id,
            String tipo,
            String categoria,
            String descricao,
            String local,
            OffsetDateTime ocorridoEm,
            boolean resolvida,
            OffsetDateTime resolvidaEm,
            String usuarioNome
    ) {
    }

    public record CargaDetalhe(CargaResumo carga, List<EventoItem> eventos) {
    }

    public record RankingTransportadora(
            Long id,
            String nome,
            long entregues,
            BigDecimal pontualidadePct,
            long ocorrencias
    ) {
    }

    public record OcorrenciaCategoria(String categoria, long total, long abertas) {
    }

    public record ResumoCargas(
            long aguardando,
            long emTransito,
            long atrasadas,
            long comOcorrencia,
            long entreguesNoMes,
            /** Entregas no prazo / entregas, 90 dias, em %. */
            BigDecimal pontualidadePct90d,
            /** Média de dias entre embarque e entrega, 90 dias. */
            BigDecimal prazoMedioDias,
            /** Nulos para vendedor (frete é custo da empresa). */
            BigDecimal freteNoMes,
            BigDecimal fretePctMercadoria,
            List<RankingTransportadora> ranking,
            List<OcorrenciaCategoria> ocorrencias
    ) {
    }
}
