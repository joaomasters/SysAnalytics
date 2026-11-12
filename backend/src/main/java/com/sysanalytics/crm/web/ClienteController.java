package com.sysanalytics.crm.web;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.service.ClienteAnaliticoService;
import com.sysanalytics.crm.service.ClienteDetalheService;
import com.sysanalytics.crm.service.ContatoService;
import com.sysanalytics.crm.web.dto.ClienteDetalheResponse;
import com.sysanalytics.crm.web.dto.ContatoDtos.ContatoRequest;
import com.sysanalytics.crm.web.dto.ContatoDtos.ContatoResponse;
import jakarta.validation.Valid;
import com.sysanalytics.crm.web.dto.ClienteRiscoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Clientes", description = "Carteira de clientes e régua de churn")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteAnaliticoService service;
    private final ClienteDetalheService detalheService;
    private final ContatoService contatoService;

    @Operation(summary = "Lista todos os clientes com dias de inatividade, ticket médio e nível de risco")
    @GetMapping("/clientes")
    public List<ClienteRiscoResponse> clientes(
            @RequestParam(required = false) List<NivelRisco> nivel,
            @RequestParam(required = false) String busca) {
        UsuarioLogado u = UsuarioLogado.atual();
        return service.listar(u.empresaId(), u.vendedorIdEscopo(), nivel, busca, false);
    }

    @Operation(summary = "Lista apenas clientes em risco de churn (30+ dias sem faturar)")
    @GetMapping("/clientes-inativos")
    public List<ClienteRiscoResponse> clientesInativos(
            @RequestParam(required = false) List<NivelRisco> nivel,
            @RequestParam(required = false) String busca) {
        UsuarioLogado u = UsuarioLogado.atual();
        return service.listar(u.empresaId(), u.vendedorIdEscopo(), nivel, busca, true);
    }

    @Operation(summary = "Visão 360° do cliente: risco, cadastro, contatos e últimas notas")
    @GetMapping("/clientes/{id}")
    public ClienteDetalheResponse detalhe(@PathVariable Long id) {
        return detalheService.detalhar(id);
    }

    @Operation(summary = "Contatos ativos do cliente (principal primeiro)")
    @GetMapping("/clientes/{id}/contatos")
    public List<ContatoResponse> contatos(@PathVariable Long id) {
        return contatoService.listar(id);
    }

    @Operation(summary = "Cadastra um contato. O primeiro contato do cliente é sempre o principal")
    @PostMapping("/clientes/{id}/contatos")
    @ResponseStatus(HttpStatus.CREATED)
    public ContatoResponse criarContato(@PathVariable Long id, @Valid @RequestBody ContatoRequest request) {
        return contatoService.criar(id, request);
    }

    @Operation(summary = "Atualiza um contato (principal=true troca o contato principal)")
    @PutMapping("/clientes/{id}/contatos/{contatoId}")
    public ContatoResponse atualizarContato(@PathVariable Long id, @PathVariable Long contatoId,
                                            @Valid @RequestBody ContatoRequest request) {
        return contatoService.atualizar(id, contatoId, request);
    }

    @Operation(summary = "Remove um contato (exclusão lógica)")
    @DeleteMapping("/clientes/{id}/contatos/{contatoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removerContato(@PathVariable Long id, @PathVariable Long contatoId) {
        contatoService.remover(id, contatoId);
    }
}
