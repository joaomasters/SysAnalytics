package com.sysanalytics.crm.messaging;

import com.sysanalytics.crm.config.RabbitMqConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consome apenas inatividades críticas ({@code cliente.inatividade.critico}).
 * No piloto, simula o disparo de e-mail/WhatsApp prioritário ao vendedor escrevendo no log.
 * Em produção, aqui entraria a integração com o gateway de e-mail (SES, SendGrid...) ou WhatsApp Business API.
 */
@Slf4j
@Component
public class EmailVendedorConsumer {

    @RabbitListener(queues = RabbitMqConfig.QUEUE_EMAIL_VENDEDOR)
    public void onInatividadeCritica(ClienteInatividadeEvent event) {
        if (event.vendedorEmail() == null || event.vendedorEmail().isBlank()) {
            throw new AmqpRejectAndDontRequeueException("Vendedor sem e-mail para o cliente " + event.clienteId());
        }

        log.warn("""

                ==================== [SIMULAÇÃO] AVISO PRIORITÁRIO ====================
                Para:      {} <{}>
                WhatsApp:  {}
                Assunto:   [CRÍTICO] {} sem faturar há {} dias
                Mensagem:  {}
                           Última compra: {}. Recomenda-se contacto imediato.
                ======================================================================""",
                event.vendedorNome(), event.vendedorEmail(), event.vendedorTelefone(),
                event.clienteNome(), event.diasInatividade(),
                event.mensagem(), event.ultimaCompra() != null ? event.ultimaCompra() : "sem registo");
    }
}
