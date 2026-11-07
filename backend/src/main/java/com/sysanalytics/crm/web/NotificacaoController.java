package com.sysanalytics.crm.web;

import com.sysanalytics.crm.service.NotificacaoService;
import com.sysanalytics.crm.web.dto.NotificacaoResponse;
import com.sysanalytics.crm.web.dto.PaginaResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Notificações", description = "Feed de alertas do vendedor (alimentado pela fila q.notificacao.dashboard)")
@RestController
@RequestMapping("/api/v1/notificacoes")
@RequiredArgsConstructor
public class NotificacaoController {

    private final NotificacaoService service;

    @Operation(summary = "Feed de alertas, do mais recente para o mais antigo")
    @GetMapping
    public PaginaResponse<NotificacaoResponse> listar(
            @RequestParam(defaultValue = "false") boolean apenasNaoLidas,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamanho) {
        return PaginaResponse.of(service.listar(apenasNaoLidas, pagina, tamanho));
    }

    @Operation(summary = "Contador de alertas não lidos (ícone do sino)")
    @GetMapping("/nao-lidas/contagem")
    public Map<String, Long> contarNaoLidas() {
        return Map.of("naoLidas", service.contarNaoLidas());
    }

    @Operation(summary = "Marca um alerta como lido")
    @PatchMapping("/{id}/lida")
    public NotificacaoResponse marcarComoLida(@PathVariable Long id) {
        return service.marcarComoLida(id);
    }

    @Operation(summary = "Marca todos os alertas como lidos")
    @PatchMapping("/marcar-todas-lidas")
    public Map<String, Integer> marcarTodasComoLidas() {
        return Map.of("atualizadas", service.marcarTodasComoLidas());
    }
}
