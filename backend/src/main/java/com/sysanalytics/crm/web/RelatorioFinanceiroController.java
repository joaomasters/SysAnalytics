package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.RelatorioFinanceiroService;
import com.sysanalytics.crm.web.dto.PagarDtos.Dre;
import com.sysanalytics.crm.web.dto.PagarDtos.FluxoCaixa;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@Tag(name = "Financeiro - relatórios", description = "Fluxo de caixa projetado e DRE (gestor/admin)")
@RestController
@RequestMapping("/api/v1/financeiro")
@PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
@RequiredArgsConstructor
public class RelatorioFinanceiroController {

    private final RelatorioFinanceiroService service;

    @Operation(summary = "Fluxo de caixa projetado por semana (a receber x a pagar) e histórico realizado")
    @GetMapping("/fluxo-caixa")
    public FluxoCaixa fluxoCaixa(@RequestParam(defaultValue = "13") int semanas,
                                 @RequestParam(required = false) BigDecimal saldoInicial,
                                 @RequestParam(defaultValue = "false") boolean incluirReceberAtrasado) {
        return service.fluxoCaixa(semanas, saldoInicial, incluirReceberAtrasado);
    }

    @Operation(summary = "DRE gerencial e margens do ano, mês a mês")
    @GetMapping("/dre")
    public Dre dre(@RequestParam(required = false) Integer ano) {
        return service.dre(ano);
    }
}
