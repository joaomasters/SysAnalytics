package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.LogisticaService;
import com.sysanalytics.crm.web.dto.LogisticaDtos.TransportadoraRequest;
import com.sysanalytics.crm.web.dto.LogisticaDtos.TransportadoraResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Logística - transportadoras", description = "Cadastro e desempenho (gestor/admin)")
@RestController
@RequestMapping("/api/v1/transportadoras")
@PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
@RequiredArgsConstructor
public class TransportadoraController {

    private final LogisticaService service;

    @Operation(summary = "Lista transportadoras com pontualidade, ocorrências e frete dos últimos 90 dias")
    @GetMapping
    public List<TransportadoraResponse> listar(@RequestParam(required = false) String busca,
                                               @RequestParam(defaultValue = "false") boolean incluirInativos) {
        return service.transportadoras(busca, incluirInativos);
    }

    @Operation(summary = "Cadastra uma transportadora")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransportadoraResponse criar(@Valid @RequestBody TransportadoraRequest request) {
        return service.salvarTransportadora(null, request);
    }

    @Operation(summary = "Edita (ou inativa) uma transportadora")
    @PutMapping("/{id}")
    public TransportadoraResponse atualizar(@PathVariable Long id, @Valid @RequestBody TransportadoraRequest request) {
        return service.salvarTransportadora(id, request);
    }
}
