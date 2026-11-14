package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.FornecedorService;
import com.sysanalytics.crm.web.dto.PagarDtos.FornecedorRequest;
import com.sysanalytics.crm.web.dto.PagarDtos.FornecedorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Financeiro - fornecedores", description = "Cadastro de fornecedores (gestor/admin)")
@RestController
@RequestMapping("/api/v1/financeiro/fornecedores")
@PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
@RequiredArgsConstructor
public class FornecedorController {

    private final FornecedorService service;

    @Operation(summary = "Lista fornecedores com saldo em aberto e vencido")
    @GetMapping
    public List<FornecedorResponse> listar(@RequestParam(required = false) String busca,
                                           @RequestParam(defaultValue = "false") boolean incluirInativos) {
        return service.listar(busca, incluirInativos);
    }

    @Operation(summary = "Cadastra um fornecedor")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FornecedorResponse criar(@Valid @RequestBody FornecedorRequest request) {
        return service.criar(request);
    }

    @Operation(summary = "Edita (ou inativa) um fornecedor")
    @PutMapping("/{id}")
    public FornecedorResponse atualizar(@PathVariable Long id, @Valid @RequestBody FornecedorRequest request) {
        return service.atualizar(id, request);
    }
}
