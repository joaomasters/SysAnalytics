package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.IndicadoresService;
import com.sysanalytics.crm.web.dto.IndicadoresDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Indicadores", description = "Painéis avançados de vendas, clientes, financeiro e logística (gestor/admin)")
@RestController
@RequestMapping("/api/v1/indicadores")
@PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
@RequiredArgsConstructor
public class IndicadoresController {

    private final IndicadoresService service;

    @Operation(summary = "Vendas: série, ranking de vendedores, funil, propostas e produtos mais cotados")
    @GetMapping("/vendas")
    public IndicadoresVendas vendas(@RequestParam(defaultValue = "12") int meses) {
        return service.vendas(meses);
    }

    @Operation(summary = "Clientes: base ativa, curva ABC, retenção, recompra, segmentos e UF")
    @GetMapping("/clientes")
    public IndicadoresClientes clientes(@RequestParam(defaultValue = "12") int meses) {
        return service.clientes(meses);
    }

    @Operation(summary = "Financeiro: prazos de recebimento e pagamento, inadimplência, margens e concentração")
    @GetMapping("/financeiro")
    public IndicadoresFinanceiro financeiro(@RequestParam(defaultValue = "12") int meses) {
        return service.financeiro(meses);
    }

    @Operation(summary = "Logística: pontualidade, prazo, frete e ocorrências por mês, sentido, transportadora, UF e fornecedor")
    @GetMapping("/logistica")
    public IndicadoresLogistica logistica(@RequestParam(defaultValue = "12") int meses) {
        return service.logistica(meses);
    }
}
