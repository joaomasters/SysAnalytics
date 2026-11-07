package com.sysanalytics.crm.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI crmOpenApi() {
        return new OpenAPI().info(new Info()
                .title("SysAnalytics CRM API")
                .version("0.1.0-PoC")
                .description("CRM analítico e operacional: KPIs financeiros, régua de inatividade (churn) "
                        + "e alertas assíncronos via RabbitMQ. Dados do piloto gerados pelo DataSeeder."));
    }
}
