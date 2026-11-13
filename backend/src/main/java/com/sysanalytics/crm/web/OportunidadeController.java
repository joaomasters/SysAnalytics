package com.sysanalytics.crm.web;

import com.sysanalytics.crm.domain.SituacaoOportunidade;
import com.sysanalytics.crm.service.OportunidadeService;
import com.sysanalytics.crm.web.dto.OportunidadeDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Funil de vendas", description = "Oportunidades, etapas e previsão de receita")
@RestController
@RequestMapping("/api/v1/oportunidades")
@RequiredArgsConstructor
public class OportunidadeController {

    private final OportunidadeService service;

    @Operation(summary = "Lista oportunidades (em andamento, ganhas ou perdidas). Vendedor vê as próprias")
    @GetMapping
    public List<OportunidadeResponse> listar(
            @RequestParam(defaultValue = "ABERTA") SituacaoOportunidade situacao,
            @RequestParam(defaultValue = "false") boolean somenteMinhas,
            @RequestParam(required = false) Long clienteId) {
        return service.listar(situacao, somenteMinhas, clienteId);
    }

    @Operation(summary = "Indicadores do funil: valor por etapa, previsão ponderada, ganhas no mês e conversão 90d")
    @GetMapping("/resumo")
    public FunilResumoResponse resumo(@RequestParam(defaultValue = "false") boolean somenteMinhas) {
        return service.resumo(somenteMinhas);
    }

    @Operation(summary = "Detalhe de uma oportunidade")
    @GetMapping("/{id}")
    public OportunidadeResponse obter(@PathVariable Long id) {
        return service.obter(id);
    }

    @Operation(summary = "Cria uma oportunidade na etapa Prospecção")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OportunidadeResponse criar(@Valid @RequestBody OportunidadeRequest request) {
        return service.criar(request);
    }

    @Operation(summary = "Edita uma oportunidade em andamento")
    @PutMapping("/{id}")
    public OportunidadeResponse atualizar(@PathVariable Long id, @Valid @RequestBody OportunidadeEdicao request) {
        return service.atualizar(id, request);
    }

    @Operation(summary = "Move para outra etapa. PERDIDA exige motivo; GANHA e PERDIDA encerram a oportunidade")
    @PatchMapping("/{id}/etapa")
    public OportunidadeResponse mover(@PathVariable Long id, @Valid @RequestBody MoverRequest request) {
        return service.mover(id, request);
    }
}
