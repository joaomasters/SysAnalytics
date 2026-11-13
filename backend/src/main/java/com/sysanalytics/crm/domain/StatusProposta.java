package com.sysanalytics.crm.domain;

/** Ciclo da proposta: RASCUNHO -> ENVIADA -> ACEITA/RECUSADA (ENVIADA pode voltar a RASCUNHO para revisão). */
public enum StatusProposta {
    RASCUNHO, ENVIADA, ACEITA, RECUSADA
}
