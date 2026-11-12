package com.sysanalytics.crm.messaging;

import com.sysanalytics.crm.config.RabbitMqConfig;
import com.sysanalytics.crm.domain.NotificacaoAlerta;
import com.sysanalytics.crm.repository.NotificacaoAlertaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Consome todas as faixas de inatividade ({@code cliente.inatividade.*})
 * e grava o alerta no feed de notificações do utilizador.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DashboardNotificacaoConsumer {

    private final NotificacaoAlertaRepository repository;

    @Transactional
    @RabbitListener(queues = RabbitMqConfig.QUEUE_DASHBOARD)
    public void onInatividade(ClienteInatividadeEvent event) {
        if (event.empresaId() == null || event.clienteId() == null || event.nivel() == null) {
            // Mensagem inválida: não adianta tentar de novo -> vai direto para a DLX
            throw new AmqpRejectAndDontRequeueException("Evento de inatividade inválido: " + event);
        }

        // Idempotência: o mesmo cliente/nível só gera um alerta por dia de análise
        if (repository.existsByEmpresaIdAndClienteIdAndNivelAndDataReferencia(
                event.empresaId(), event.clienteId(), event.nivel(), event.dataReferencia())) {
            log.debug("Alerta já registado hoje para cliente {} ({}), ignorado", event.clienteId(), event.nivel());
            return;
        }

        repository.save(NotificacaoAlerta.builder()
                .empresaId(event.empresaId())
                .clienteId(event.clienteId())
                .clienteNome(event.clienteNome())
                .vendedorId(event.vendedorId())
                .vendedorNome(event.vendedorNome())
                .nivel(event.nivel())
                .diasInatividade(event.diasInatividade())
                .mensagem(event.mensagem())
                .lida(false)
                .dataReferencia(event.dataReferencia())
                .criadaEm(OffsetDateTime.now())
                .build());

        log.info("[DASHBOARD] {}", event.mensagem());
    }
}
