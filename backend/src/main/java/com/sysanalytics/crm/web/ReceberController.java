package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.ReceberService;
import com.sysanalytics.crm.web.dto.PaginaResponse;
import com.sysanalytics.crm.web.dto.ReceberDtos.*;
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

@Tag(name = "Financeiro - a receber", description = "Títulos, baixas e cobrança")
@RestController
@RequestMapping("/api/v1/financeiro/receber")
@RequiredArgsConstructor
public class ReceberController {

    private final ReceberService service;

    @Operation(summary = "Lista títulos (situação: TODOS, EM_ABERTO, A_VENCER, VENCIDO, PAGO, CANCELADO)")
    @GetMapping
    public PaginaResponse<TituloResumo> listar(
            @RequestParam(required = false) String situacao,
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate vencimentoDe,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate vencimentoAte,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamanho) {
        return service.listar(situacao, clienteId, busca, vencimentoDe, vencimentoAte, pagina, tamanho);
    }

    @Operation(summary = "Indicadores: carteira, inadimplência, aging, maiores devedores e promessas")
    @GetMapping("/resumo")
    public ResumoReceber resumo() {
        return service.resumo();
    }

    @Operation(summary = "Título com baixas e histórico de cobrança")
    @GetMapping("/{id}")
    public TituloDetalhe detalhe(@PathVariable Long id) {
        return service.detalhe(id);
    }

    @Operation(summary = "Lança um título (ou parcelamento) para um cliente (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<TituloResumo> criar(@Valid @RequestBody TituloRequest request) {
        return service.criar(request);
    }

    @Operation(summary = "Registra uma baixa (pagamento total ou parcial) (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PostMapping("/{id}/baixas")
    public TituloDetalhe baixar(@PathVariable Long id, @Valid @RequestBody BaixaRequest request) {
        return service.baixar(id, request);
    }

    @Operation(summary = "Estorna uma baixa (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @DeleteMapping("/{id}/baixas/{baixaId}")
    public TituloDetalhe estornar(@PathVariable Long id, @PathVariable Long baixaId) {
        return service.estornar(id, baixaId);
    }

    @Operation(summary = "Cancela um título sem baixas (gestor/admin)")
    @PreAuthorize("hasAnyRole('GESTOR', 'ADMIN')")
    @PostMapping("/{id}/cancelar")
    public TituloDetalhe cancelar(@PathVariable Long id) {
        return service.cancelar(id);
    }

    @Operation(summary = "Registra um contato de cobrança, com promessa de pagamento opcional")
    @PostMapping("/{id}/cobrancas")
    public TituloDetalhe registrarCobranca(@PathVariable Long id, @Valid @RequestBody CobrancaRequest request) {
        return service.registrarCobranca(id, request);
    }
}
