package com.sysanalytics.crm.web;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.service.ClienteAnaliticoService;
import com.sysanalytics.crm.web.dto.ClienteRiscoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Clientes", description = "Carteira de clientes e régua de churn")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteAnaliticoService service;

    @Operation(summary = "Lista todos os clientes com dias de inatividade, ticket médio e nível de risco")
    @GetMapping("/clientes")
    public List<ClienteRiscoResponse> clientes(
            @RequestParam(required = false) List<NivelRisco> nivel,
            @RequestParam(required = false) String busca) {
        return service.listar(nivel, busca, false);
    }

    @Operation(summary = "Lista apenas clientes em risco de churn (30+ dias sem faturar)")
    @GetMapping("/clientes-inativos")
    public List<ClienteRiscoResponse> clientesInativos(
            @RequestParam(required = false) List<NivelRisco> nivel,
            @RequestParam(required = false) String busca) {
        return service.listar(nivel, busca, true);
    }
}
