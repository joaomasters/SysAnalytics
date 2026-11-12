package com.sysanalytics.crm.domain;

/** Etapas fixas do funil. A probabilidade padrão alimenta a previsão ponderada de receita. */
public enum EtapaOportunidade {
    PROSPECCAO(10),
    QUALIFICACAO(25),
    PROPOSTA(50),
    NEGOCIACAO(75),
    GANHA(100),
    PERDIDA(0);

    private final int probabilidadePadrao;

    EtapaOportunidade(int probabilidadePadrao) {
        this.probabilidadePadrao = probabilidadePadrao;
    }

    public int getProbabilidadePadrao() {
        return probabilidadePadrao;
    }

    public boolean encerrada() {
        return this == GANHA || this == PERDIDA;
    }
}
