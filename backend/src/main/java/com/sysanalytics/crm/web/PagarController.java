package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.PagarService;
import com.sysanalytics.crm.web.dto.PaginaResponse;
import com.sysanalytics.crm.web.dto.PagarDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Financeiro - a pagar", description = "Contas a pagar e pagamentos (gestor/admin)")
@RestController
@RequestMapping("/api/v1/financeiro/pagar")
@PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
@RequiredArgsConstructor
public class PagarController {

    private final PagarService service;

    @Operation(summary = "Lista contas (situação: TODOS, EM_ABERTO, A_VENCER, VENCIDO, PAGO, CANCELADO)")
    @GetMapping
    public PaginaResponse<ContaResumo> listar(
            @RequestParam(required = false) String situacao,
            @RequestParam(required = false) Long fornecedorId,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate vencimentoDe,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate vencimentoAte,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho) {
        return service.listar(situacao, fornecedorId, categoria, busca, vencimentoDe, vencimentoAte, pagina, tamanho);
    }

    @Operation(summary = "Indicadores: em aberto, vencido, aging, por categoria e maiores fornecedores")
    @GetMapping("/resumo")
    public ResumoPagar resumo() {
        return service.resumo();
    }

    @Operation(summary = "Conta com pagamentos")
    @GetMapping("/{id}")
    public ContaDetalhe detalhe(@PathVariable Long id) {
        return service.detalhe(id);
    }

    @Operation(summary = "Lança uma conta (ou parcelamento) de um fornecedor")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<ContaResumo> criar(@Valid @RequestBody ContaRequest request) {
        return service.criar(request);
    }

    @Operation(summary = "Registra um pagamento (total ou parcial)")
    @PostMapping("/{id}/pagamentos")
    public ContaDetalhe pagar(@PathVariable Long id, @Valid @RequestBody PagamentoRequest request) {
        return service.pagar(id, request);
    }

    @Operation(summary = "Estorna um pagamento")
    @DeleteMapping("/{id}/pagamentos/{pagamentoId}")
    public ContaDetalhe estornar(@PathVariable Long id, @PathVariable Long pagamentoId) {
        return service.estornar(id, pagamentoId);
    }

    @Operation(summary = "Cancela uma conta sem pagamentos")
    @PostMapping("/{id}/cancelar")
    public ContaDetalhe cancelar(@PathVariable Long id) {
        return service.cancelar(id);
    }
}
