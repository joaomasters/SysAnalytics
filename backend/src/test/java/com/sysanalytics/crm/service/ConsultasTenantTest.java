package com.sysanalytics.crm.service;

import com.sysanalytics.crm.repository.ConsultasAnaliticas;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guarda de regressão do isolamento entre empresas: toda consulta analítica precisa filtrar
 * por empresa_id. Não substitui um teste de integração com banco real (ver próximos passos).
 */
class ConsultasTenantTest {

    @Test
    void todasAsConsultasFiltramPorEmpresa() {
        assertThat(ConsultasAnaliticas.SITUACAO_CLIENTES).contains("c.empresa_id = ?");
        assertThat(ConsultasAnaliticas.CLIENTES_INATIVOS).contains("c.empresa_id = ?");
        assertThat(ConsultasAnaliticas.FATURAMENTO_POR_PERIODO).contains("f.empresa_id = ?");
        assertThat(ConsultasAnaliticas.CUSTOS_POR_PERIODO).contains("c.empresa_id = ?");
        assertThat(ConsultasAnaliticas.TICKET_POR_VENDEDOR).contains("v.empresa_id = ?");
    }
}
