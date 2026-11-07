package com.sysanalytics.crm.web.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** Envelope de paginação estável para a API (evita serializar PageImpl diretamente). */
public record PaginaResponse<T>(
        List<T> conteudo,
        int pagina,
        int tamanho,
        long totalElementos,
        int totalPaginas
) {

    public static <T> PaginaResponse<T> of(Page<T> page) {
        return new PaginaResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
