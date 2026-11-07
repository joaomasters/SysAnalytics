package com.sysanalytics.crm.domain;

/**
 * Régua de inatividade comercial.
 * <ul>
 *     <li>ALERTA: 30 a 59 dias sem faturar</li>
 *     <li>ATENCAO: 60 a 89 dias sem faturar</li>
 *     <li>CRITICO: 90 dias ou mais sem faturar</li>
 * </ul>
 */
public enum NivelRisco {
    SEM_RISCO("Sem risco", null),
    ALERTA("Alerta Leve", "cliente.inatividade.alerta"),
    ATENCAO("Atenção Média", "cliente.inatividade.atencao"),
    CRITICO("Crítico", "cliente.inatividade.critico");

    public static final int LIMITE_ALERTA = 30;
    public static final int LIMITE_ATENCAO = 60;
    public static final int LIMITE_CRITICO = 90;

    private final String descricao;
    private final String routingKey;

    NivelRisco(String descricao, String routingKey) {
        this.descricao = descricao;
        this.routingKey = routingKey;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getRoutingKey() {
        return routingKey;
    }

    public static NivelRisco fromDiasInatividade(Integer dias) {
        if (dias == null) {
            // Cliente sem nenhuma compra registada é tratado como crítico
            return CRITICO;
        }
        if (dias >= LIMITE_CRITICO) return CRITICO;
        if (dias >= LIMITE_ATENCAO) return ATENCAO;
        if (dias >= LIMITE_ALERTA) return ALERTA;
        return SEM_RISCO;
    }
}
