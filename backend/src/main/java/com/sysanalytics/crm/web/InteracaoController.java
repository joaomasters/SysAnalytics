package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.InteracaoService;
import com.sysanalytics.crm.web.dto.InteracaoDtos.InteracaoRequest;
import com.sysanalytics.crm.web.dto.InteracaoDtos.InteracaoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Interações", description = "Histórico de relacionamento com o cliente")
@RestController
@RequestMapping("/api/v1/clientes/{clienteId}/interacoes")
@RequiredArgsConstructor
public class InteracaoController {

    private final InteracaoService service;

    @Operation(summary = "Últimas 50 interações do cliente, da mais recente para a mais antiga")
    @GetMapping
    public List<InteracaoResponse> listar(@PathVariable Long clienteId) {
        return service.listar(clienteId);
    }

    @Operation(summary = "Registra uma interação (ligação, visita, e-mail...)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InteracaoResponse registrar(@PathVariable Long clienteId, @Valid @RequestBody InteracaoRequest request) {
        return service.registrar(clienteId, request);
    }
}
