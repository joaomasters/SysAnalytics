package com.sysanalytics.crm.web;

import com.sysanalytics.crm.batch.AnaliseInatividadeService;
import com.sysanalytics.crm.config.RabbitMqConfig;
import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.messaging.ClienteInatividadeEvent;
import com.sysanalytics.crm.web.dto.ExecucaoJobResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Jobs", description = "Rotinas analíticas (Spring Batch)")
@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final AnaliseInatividadeService analiseInatividadeService;
    private final RabbitTemplate rabbitTemplate;

    @Operation(summary = "Executa manualmente a análise de inatividade",
            description = "Identifica clientes com 30+ dias sem faturar e publica eventos em crm.cliente.events. "
                    + "Os alertas aparecem no feed assim que os consumidores processam as mensagens.")
    @PostMapping("/executar-analise-inatividade")
    public ExecucaoJobResponse executarAnaliseInatividade() {
        return analiseInatividadeService.executar("MANUAL");
    }

    @Operation(summary = "[Demo] Publica um evento inválido para demonstrar a Dead Letter Queue",
            description = "O consumidor rejeita o evento, que é encaminhado para crm.dead-letter.exchange -> "
                    + "q.dead-letter.alertas. Veja em http://localhost:15672.")
    @PostMapping("/simular-falha-mensageria")
    public ResponseEntity<Map<String, String>> simularFalha() {
        var eventoInvalido = new ClienteInatividadeEvent(UUID.randomUUID(), null, "Evento inválido (demo DLQ)",
                null, null, null, null, null, null, 120, NivelRisco.CRITICO, LocalDate.now(), OffsetDateTime.now());
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_CLIENTE_EVENTS,
                NivelRisco.CRITICO.getRoutingKey(), eventoInvalido);
        return ResponseEntity.accepted().body(Map.of(
                "mensagem", "Evento inválido publicado. Deve aparecer em " + RabbitMqConfig.DLQ_ALERTAS));
    }
}
