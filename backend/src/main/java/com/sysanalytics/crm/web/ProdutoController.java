package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.ProdutoService;
import com.sysanalytics.crm.web.dto.ProdutoDtos.ProdutoRequest;
import com.sysanalytics.crm.web.dto.ProdutoDtos.ProdutoResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Catálogo", description = "Produtos e serviços usados nas propostas")
@RestController
@RequestMapping("/api/v1/produtos")
@RequiredArgsConstructor
public class ProdutoController {

    private final ProdutoService service;

    @Operation(summary = "Lista o catálogo (por padrão só os ativos)")
    @GetMapping
    public List<ProdutoResponse> listar(@RequestParam(required = false) String busca,
                                        @RequestParam(defaultValue = "false") boolean incluirInativos) {
        return service.listar(busca, incluirInativos);
    }

    @Operation(summary = "Cadastra um produto (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProdutoResponse criar(@Valid @RequestBody ProdutoRequest request) {
        return service.criar(request);
    }

    @Operation(summary = "Atualiza ou inativa um produto (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PutMapping("/{id}")
    public ProdutoResponse atualizar(@PathVariable Long id, @Valid @RequestBody ProdutoRequest request) {
        return service.atualizar(id, request);
    }
}
