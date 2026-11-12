package com.sysanalytics.crm.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class GranularidadeTest {

    // 2026-11-11 é uma quarta-feira
    private static final LocalDate QUARTA = LocalDate.of(2026, 11, 11);

    @Test
    void semanaComecaNaSegundaFeira() {
        assertThat(Granularidade.SEMANAL.inicioDoPeriodo(QUARTA)).isEqualTo(LocalDate.of(2026, 11, 9));
        assertThat(Granularidade.SEMANAL.proximoPeriodo(LocalDate.of(2026, 11, 9))).isEqualTo(LocalDate.of(2026, 11, 16));
    }

    @Test
    void mesComecaNoDiaUm() {
        assertThat(Granularidade.MENSAL.inicioDoPeriodo(QUARTA)).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(Granularidade.MENSAL.proximoPeriodo(LocalDate.of(2026, 12, 1))).isEqualTo(LocalDate.of(2027, 1, 1));
    }

    @Test
    void semestreComecaEmJaneiroOuJulho() {
        assertThat(Granularidade.SEMESTRAL.inicioDoPeriodo(LocalDate.of(2026, 6, 30))).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(Granularidade.SEMESTRAL.inicioDoPeriodo(LocalDate.of(2026, 7, 1))).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(Granularidade.SEMESTRAL.proximoPeriodo(LocalDate.of(2026, 7, 1))).isEqualTo(LocalDate.of(2027, 1, 1));
    }

    @Test
    void janelaPadraoDiariaTem30Dias() {
        LocalDate fim = QUARTA;
        assertThat(Granularidade.DIARIO.inicioPadrao(fim)).isEqualTo(fim.minusDays(29));
    }
}
