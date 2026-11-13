package com.sysanalytics.crm.domain;

/** Situação da meta de um vendedor no mês consultado. */
public enum SituacaoMeta {
    /** Nenhuma meta definida para o mês. */
    SEM_META,
    ATINGIDA,
    /** Mês corrente com realizado igual ou acima do ritmo esperado. */
    NO_RITMO,
    /** Mês corrente com realizado abaixo do ritmo esperado. */
    ABAIXO_DO_RITMO,
    /** Mês já encerrado sem bater a meta. */
    NAO_ATINGIDA,
    /** Mês futuro. */
    PENDENTE
}
