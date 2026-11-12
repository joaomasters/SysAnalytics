package com.sysanalytics.crm.web;

import com.sysanalytics.crm.domain.StatusTarefa;
import com.sysanalytics.crm.service.TarefaService;
import com.sysanalytics.crm.web.dto.TarefaDtos.ConcluirRequest;
import com.sysanalytics.crm.web.dto.TarefaDtos.TarefaRequest;
import com.sysanalytics.crm.web.dto.TarefaDtos.TarefaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Tarefas", description = "Próximos passos do time comercial")
@RestController
@RequestMapping("/api/v1/tarefas")
@RequiredArgsConstructor
public class TarefaController {

    private final TarefaService service;

    @Operation(summary = "Lista tarefas. Vendedor vê as próprias; gestor/admin a empresa toda (ou só as suas com somenteMinhas)")
    @GetMapping
    public List<TarefaResponse> listar(
            @RequestParam(defaultValue = "ABERTA") StatusTarefa status,
            @RequestParam(defaultValue = "false") boolean somenteMinhas,
            @RequestParam(required = false) Long clienteId) {
        return service.listar(status, somenteMinhas, clienteId);
    }

    @Operation(summary = "Cria uma tarefa para um cliente")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TarefaResponse criar(@Valid @RequestBody TarefaRequest request) {
        return service.criar(request);
    }

    @Operation(summary = "Conclui a tarefa com um resultado; com resumo, registra também uma interação")
    @PatchMapping("/{id}/concluir")
    public TarefaResponse concluir(@PathVariable Long id, @Valid @RequestBody ConcluirRequest request) {
        return service.concluir(id, request);
    }

    @Operation(summary = "Cancela uma tarefa aberta")
    @PatchMapping("/{id}/cancelar")
    public TarefaResponse cancelar(@PathVariable Long id) {
        return service.cancelar(id);
    }
}
