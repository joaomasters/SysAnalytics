package com.sysanalytics.crm.domain;

/** Perfil de acesso do usuário dentro da sua empresa. */
public enum Perfil {
    /** Administra usuários e configurações; enxerga todos os dados da empresa. */
    ADMIN,
    /** Enxerga todos os dados da empresa (financeiro, equipe, carteiras). */
    GESTOR,
    /** Enxerga apenas a própria carteira de clientes e os próprios alertas. */
    VENDEDOR
}
