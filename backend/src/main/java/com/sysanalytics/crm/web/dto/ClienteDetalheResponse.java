package com.sysanalytics.crm.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Visão 360° de um cliente: situação comercial, cadastro, contatos e últimas notas. */
public record ClienteDetalheResponse(
        ClienteRiscoResponse resumo,
        String email,
        String telefone,
        LocalDate dataCadastro,
        List<ContatoDtos.ContatoResponse> contatos,
        List<NotaResumo> ultimasNotas
) {

    public record NotaResumo(String numeroNota, LocalDate dataFaturamento, BigDecimal valorTotal) {
    }
}
