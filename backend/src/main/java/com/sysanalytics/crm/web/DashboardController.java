package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.Granularidade;
import com.sysanalytics.crm.service.KpiService;
import com.sysanalytics.crm.web.dto.KpiDashboardResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@Tag(name = "Dashboard", description = "KPIs financeiros e operacionais")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DashboardController {

    private final KpiService kpiService;

    @Operation(summary = "KPIs do dashboard executivo",
            description = "Faturamento, custos, margem, saldo de fluxo de caixa e ticket médio (geral e por vendedor) "
                    + "agregados na granularidade escolhida. Sem datas, usa a janela padrão: "
                    + "30 dias (DIARIO), 12 semanas (SEMANAL), 12 meses (MENSAL) ou 12 meses em semestres (SEMESTRAL).")
    @GetMapping("/kpis")
    public KpiDashboardResponse kpis(
            @RequestParam(defaultValue = "MENSAL") Granularidade granularidade,
            @Parameter(description = "Data inicial (yyyy-MM-dd)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @Parameter(description = "Data final (yyyy-MM-dd), padrão: hoje")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return kpiService.calcular(granularidade, inicio, fim);
    }
}
