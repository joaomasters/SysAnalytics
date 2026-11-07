package com.sysanalytics.crm.web.dto;

import com.sysanalytics.crm.domain.NivelRisco;

import java.time.LocalDateTime;
import java.util.Map;

public record ExecucaoJobResponse(
        Long jobExecutionId,
        String status,
        LocalDateTime inicio,
        LocalDateTime fim,
        long duracaoMs,
        long clientesEmRiscoLidos,
        long eventosPublicados,
        Map<NivelRisco, Integer> eventosPorNivel,
        String erro
) {
}
