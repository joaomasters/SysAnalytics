package com.sysanalytics.crm.repository;

/**
 * SQL nativo (PostgreSQL) usado pelo motor analítico.
 * Mantido num único local para ser partilhado entre a API REST e o job do Spring Batch.
 */
public final class ConsultasAnaliticas {

    private ConsultasAnaliticas() {
    }

    /**
     * Situação comercial de cada cliente: última compra, dias de inatividade
     * ({@code CURRENT_DATE - MAX(data_faturamento)}), ticket médio e vendedor responsável.
     */
    public static final String SITUACAO_CLIENTES = """
            SELECT c.id                                   AS cliente_id,
                   c.nome_fantasia                        AS nome_fantasia,
                   c.razao_social                         AS razao_social,
                   c.cnpj                                 AS cnpj,
                   c.contato                              AS contato,
                   c.cidade                               AS cidade,
                   c.uf                                   AS uf,
                   c.segmento                             AS segmento,
                   v.id                                   AS vendedor_id,
                   v.nome                                 AS vendedor_nome,
                   v.email                                AS vendedor_email,
                   v.telefone                             AS vendedor_telefone,
                   v.carteira                             AS carteira,
                   MAX(f.data_faturamento)                AS ultima_compra,
                   (CURRENT_DATE - MAX(f.data_faturamento)) AS dias_inatividade,
                   COUNT(f.id)                            AS total_notas,
                   COALESCE(SUM(f.valor_total), 0)        AS valor_total,
                   COALESCE(AVG(f.valor_total), 0)        AS ticket_medio
              FROM cliente c
              JOIN vendedor v ON v.id = c.vendedor_id
              LEFT JOIN faturamento f ON f.cliente_id = c.id
             GROUP BY c.id, v.id
            """;

    /** Apenas clientes a partir da faixa de Alerta (>= 30 dias ou sem nenhuma compra). Usado pelo job. */
    public static final String CLIENTES_INATIVOS = SITUACAO_CLIENTES + """
            HAVING MAX(f.data_faturamento) IS NULL
                OR (CURRENT_DATE - MAX(f.data_faturamento)) >= 30
             ORDER BY dias_inatividade DESC NULLS FIRST
            """;

    /** Faturamento agregado por período. {@code %s} = expressão de período (ver {@code Granularidade}). */
    public static final String FATURAMENTO_POR_PERIODO = """
            SELECT %s AS periodo,
                   SUM(f.valor_total) AS total,
                   COUNT(*)           AS notas
              FROM faturamento f
             WHERE f.data_faturamento BETWEEN ? AND ?
             GROUP BY 1
            """;

    /** Custos agregados por período, separados em fixos e variáveis. */
    public static final String CUSTOS_POR_PERIODO = """
            SELECT %s AS periodo,
                   SUM(c.valor)                                              AS total,
                   SUM(CASE WHEN c.tipo = 'FIXO' THEN c.valor ELSE 0 END)     AS fixos,
                   SUM(CASE WHEN c.tipo = 'VARIAVEL' THEN c.valor ELSE 0 END) AS variaveis
              FROM custo c
             WHERE c.data_lancamento BETWEEN ? AND ?
             GROUP BY 1
            """;

    /** Ticket médio segmentado por vendedor/carteira no intervalo. */
    public static final String TICKET_POR_VENDEDOR = """
            SELECT v.id                            AS vendedor_id,
                   v.nome                          AS vendedor_nome,
                   v.carteira                      AS carteira,
                   COUNT(f.id)                     AS total_notas,
                   COUNT(DISTINCT f.cliente_id)    AS clientes_atendidos,
                   COALESCE(SUM(f.valor_total), 0) AS faturamento,
                   COALESCE(AVG(f.valor_total), 0) AS ticket_medio
              FROM vendedor v
              LEFT JOIN faturamento f
                     ON f.vendedor_id = v.id
                    AND f.data_faturamento BETWEEN ? AND ?
             GROUP BY v.id
             ORDER BY faturamento DESC
            """;
}
