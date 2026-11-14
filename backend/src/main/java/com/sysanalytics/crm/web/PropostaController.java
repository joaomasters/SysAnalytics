package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.PropostaService;
import com.sysanalytics.crm.web.dto.PropostaDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Propostas", description = "Propostas comerciais ligadas às oportunidades")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PropostaController {

    private final PropostaService service;

    @Operation(summary = "Propostas de uma oportunidade, da mais recente para a mais antiga")
    @GetMapping("/oportunidades/{oportunidadeId}/propostas")
    public List<PropostaResumo> listar(@PathVariable Long oportunidadeId) {
        return service.listar(oportunidadeId);
    }

    @Operation(summary = "Cria uma proposta em rascunho para a oportunidade")
    @PostMapping("/oportunidades/{oportunidadeId}/propostas")
    @ResponseStatus(HttpStatus.CREATED)
    public PropostaDetalhe criar(@PathVariable Long oportunidadeId, @Valid @RequestBody PropostaRequest request) {
        return service.criar(oportunidadeId, request);
    }

    @Operation(summary = "Proposta completa, com itens, totais e dados do cliente (usada também na impressão)")
    @GetMapping("/propostas/{id}")
    public PropostaDetalhe obter(@PathVariable Long id) {
        return service.obter(id);
    }

    @Operation(summary = "Edita uma proposta em rascunho (substitui os itens)")
    @PutMapping("/propostas/{id}")
    public PropostaDetalhe atualizar(@PathVariable Long id, @Valid @RequestBody PropostaRequest request) {
        return service.atualizar(id, request);
    }

    @Operation(summary = "Muda o status. Ao ENVIAR, o valor da oportunidade passa a ser o total da proposta")
    @PatchMapping("/propostas/{id}/status")
    public PropostaDetalhe mudarStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return service.mudarStatus(id, request.status());
    }

    @Operation(summary = "Exclui uma proposta em rascunho")
    @DeleteMapping("/propostas/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}
