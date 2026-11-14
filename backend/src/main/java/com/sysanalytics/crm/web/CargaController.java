package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.LogisticaService;
import com.sysanalytics.crm.web.dto.LogisticaDtos.*;
import com.sysanalytics.crm.web.dto.PaginaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Logística - cargas", description = "Follow-up de cargas de entrada e saída")
@RestController
@RequestMapping("/api/v1/cargas")
@RequiredArgsConstructor
public class CargaController {

    private final LogisticaService service;

    @Operation(summary = "Lista cargas (situação: TODAS, ATIVAS, ATRASADAS, COM_OCORRENCIA, ENTREGUES, CANCELADAS). Vendedor vê só as saídas da carteira")
    @GetMapping
    public PaginaResponse<CargaResumo> listar(
            @RequestParam(required = false) String sentido,
            @RequestParam(required = false) String situacao,
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) Long transportadoraId,
            @RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho) {
        return service.listar(sentido, situacao, clienteId, transportadoraId, busca, pagina, tamanho);
    }

    @Operation(summary = "Indicadores: andamento, atrasos, pontualidade, prazo médio, frete, ranking e ocorrências")
    @GetMapping("/resumo")
    public ResumoCargas resumo(@RequestParam(required = false) String sentido) {
        return service.resumo(sentido);
    }

    @Operation(summary = "Carga com a linha do tempo de eventos")
    @GetMapping("/{id}")
    public CargaDetalhe detalhe(@PathVariable Long id) {
        return service.detalhe(id);
    }

    @Operation(summary = "Cadastra uma carga de entrada (compra) ou de saída (entrega) (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CargaDetalhe criar(@Valid @RequestBody CargaRequest request) {
        return service.criar(request);
    }

    @Operation(summary = "Edita uma carga em andamento (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PutMapping("/{id}")
    public CargaDetalhe atualizar(@PathVariable Long id, @Valid @RequestBody CargaRequest request) {
        return service.atualizar(id, request);
    }

    @Operation(summary = "Registra embarque, atualização de rota, ocorrência, entrega ou observação (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PostMapping("/{id}/eventos")
    public CargaDetalhe evento(@PathVariable Long id, @Valid @RequestBody EventoRequest request) {
        return service.registrarEvento(id, request);
    }

    @Operation(summary = "Marca uma ocorrência como resolvida (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PostMapping("/{id}/eventos/{eventoId}/resolver")
    public CargaDetalhe resolver(@PathVariable Long id, @PathVariable Long eventoId) {
        return service.resolverOcorrencia(id, eventoId);
    }

    @Operation(summary = "Cancela uma carga em andamento, com motivo (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PostMapping("/{id}/cancelar")
    public CargaDetalhe cancelar(@PathVariable Long id, @Valid @RequestBody CancelamentoRequest request) {
        return service.cancelar(id, request);
    }
}
