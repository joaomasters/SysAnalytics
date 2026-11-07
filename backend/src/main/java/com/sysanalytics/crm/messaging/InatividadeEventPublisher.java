package com.sysanalytics.crm.messaging;

import com.sysanalytics.crm.config.RabbitMqConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InatividadeEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    /** Publica o evento com a routing key contextual da faixa (alerta / atencao / critico). */
    public void publicar(ClienteInatividadeEvent event) {
        String routingKey = event.nivel().getRoutingKey();
        if (routingKey == null) {
            throw new IllegalArgumentException("Nível sem routing key: " + event.nivel());
        }
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_CLIENTE_EVENTS, routingKey, event);
        log.debug("Evento publicado [{}] cliente={} dias={}", routingKey, event.clienteNome(), event.diasInatividade());
    }
}
