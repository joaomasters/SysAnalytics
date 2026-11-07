package com.sysanalytics.crm.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Topologia de mensageria do CRM.
 *
 * <pre>
 *  crm.cliente.events (topic)
 *     ├── cliente.inatividade.*        ──► q.notificacao.dashboard       (feed do utilizador)
 *     └── cliente.inatividade.critico  ──► q.notificacao.email-vendedor  (aviso prioritário)
 *
 *  crm.dead-letter.exchange (direct)
 *     └── dead-letter.crm              ──► q.dead-letter.alertas         (retenção de falhas)
 * </pre>
 */
@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_CLIENTE_EVENTS = "crm.cliente.events";
    public static final String QUEUE_DASHBOARD = "q.notificacao.dashboard";
    public static final String QUEUE_EMAIL_VENDEDOR = "q.notificacao.email-vendedor";
    public static final String ROUTING_KEY_INATIVIDADE_TODAS = "cliente.inatividade.*";
    public static final String ROUTING_KEY_INATIVIDADE_CRITICO = "cliente.inatividade.critico";

    public static final String DLX_EXCHANGE = "crm.dead-letter.exchange";
    public static final String DLQ_ALERTAS = "q.dead-letter.alertas";
    public static final String DLX_ROUTING_KEY = "dead-letter.crm";

    // ---------- Exchanges ----------

    @Bean
    public TopicExchange clienteEventsExchange() {
        return ExchangeBuilder.topicExchange(EXCHANGE_CLIENTE_EVENTS).durable(true).build();
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange(DLX_EXCHANGE).durable(true).build();
    }

    // ---------- Queues ----------

    @Bean
    public Queue dashboardQueue() {
        return QueueBuilder.durable(QUEUE_DASHBOARD)
                .deadLetterExchange(DLX_EXCHANGE)
                .deadLetterRoutingKey(DLX_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue emailVendedorQueue() {
        return QueueBuilder.durable(QUEUE_EMAIL_VENDEDOR)
                .deadLetterExchange(DLX_EXCHANGE)
                .deadLetterRoutingKey(DLX_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DLQ_ALERTAS).build();
    }

    // ---------- Bindings ----------

    @Bean
    public Binding dashboardBinding(Queue dashboardQueue, TopicExchange clienteEventsExchange) {
        return BindingBuilder.bind(dashboardQueue).to(clienteEventsExchange).with(ROUTING_KEY_INATIVIDADE_TODAS);
    }

    @Bean
    public Binding emailVendedorBinding(Queue emailVendedorQueue, TopicExchange clienteEventsExchange) {
        return BindingBuilder.bind(emailVendedorQueue).to(clienteEventsExchange).with(ROUTING_KEY_INATIVIDADE_CRITICO);
    }

    @Bean
    public Binding deadLetterBinding(Queue deadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with(DLX_ROUTING_KEY);
    }

    // ---------- Conversão JSON ----------

    /**
     * Conversor JSON partilhado pelo RabbitTemplate e pelos listeners
     * (o Spring Boot aplica automaticamente este bean à listener container factory).
     */
    @Bean
    public MessageConverter jackson2JsonMessageConverter(ObjectMapper objectMapper) {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter(objectMapper);
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTrustedPackages("com.sysanalytics.crm.messaging");
        converter.setJavaTypeMapper(typeMapper);
        return converter;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jackson2JsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jackson2JsonMessageConverter);
        return template;
    }
}
