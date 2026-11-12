package com.sysanalytics.crm.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class NivelRiscoTest {

    @ParameterizedTest(name = "{0} dias -> {1}")
    @CsvSource({
            "0,SEM_RISCO", "29,SEM_RISCO",
            "30,ALERTA", "59,ALERTA",
            "60,ATENCAO", "89,ATENCAO",
            "90,CRITICO", "400,CRITICO"
    })
    void classificaPelaReguaDeInatividade(int dias, NivelRisco esperado) {
        assertThat(NivelRisco.fromDiasInatividade(dias)).isEqualTo(esperado);
    }

    @Test
    void clienteSemNenhumaCompraEhCritico() {
        assertThat(NivelRisco.fromDiasInatividade(null)).isEqualTo(NivelRisco.CRITICO);
    }

    @Test
    void somenteNiveisEmRiscoPossuemRoutingKey() {
        assertThat(NivelRisco.SEM_RISCO.getRoutingKey()).isNull();
        assertThat(NivelRisco.ALERTA.getRoutingKey()).isEqualTo("cliente.inatividade.alerta");
        assertThat(NivelRisco.ATENCAO.getRoutingKey()).isEqualTo("cliente.inatividade.atencao");
        assertThat(NivelRisco.CRITICO.getRoutingKey()).isEqualTo("cliente.inatividade.critico");
    }
}
