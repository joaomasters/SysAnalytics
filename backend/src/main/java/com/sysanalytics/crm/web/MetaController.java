package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.MetaService;
import com.sysanalytics.crm.web.dto.MetaDtos.MetaMesResponse;
import com.sysanalytics.crm.web.dto.MetaDtos.MetasRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Metas", description = "Metas mensais de faturamento por vendedor")
@RestController
@RequestMapping("/api/v1/metas")
@RequiredArgsConstructor
public class MetaController {

    private final MetaService service;

    @Operation(summary = "Metas, realizado e previsão do funil por vendedor no mês (aaaa-MM; padrão: mês atual)")
    @GetMapping
    public MetaMesResponse obter(@RequestParam(required = false) String mes) {
        return service.obter(mes);
    }

    @Operation(summary = "Define as metas do mês de vários vendedores de uma vez (gestor/admin). Valor nulo remove a meta")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PutMapping("/{mes}")
    public MetaMesResponse salvar(@PathVariable String mes, @Valid @RequestBody MetasRequest request) {
        return service.salvar(mes, request);
    }
}
