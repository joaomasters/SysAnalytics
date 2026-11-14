package com.sysanalytics.crm.seed;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gera títulos de demonstração a partir das notas já faturadas (vencimento em 30 dias), com baixas e
 * algumas ações de cobrança. Só roda se ainda não houver nenhum título (seguro para reiniciar).
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "crm.seed.enabled", havingValue = "true", matchIfMissing = true)
public class FinanceiroSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    @Transactional
    public void run(String... args) {
        Long existentes = jdbc.queryForObject("SELECT COUNT(*) FROM titulo_receber", Long.class);
        Long notas = jdbc.queryForObject("SELECT COUNT(*) FROM faturamento", Long.class);
        if ((existentes != null && existentes > 0) || notas == null || notas == 0) {
            return;
        }

        jdbc.update("""
                INSERT INTO titulo_receber (empresa_id, cliente_id, numero_documento, parcela, total_parcelas, descricao,
                                            data_emissao, data_vencimento, valor, valor_pago, data_quitacao, status, criado_por_id)
                SELECT x.empresa_id, x.cliente_id, x.numero_nota, 1, 1, 'Nota fiscal ' || x.numero_nota,
                       x.data_faturamento, x.data_faturamento + 30, x.valor_total,
                       CASE WHEN x.pago THEN x.valor_total ELSE 0 END,
                       CASE WHEN x.pago THEN x.data_faturamento + 5 + (x.id % 25)::int END,
                       CASE WHEN x.pago THEN 'PAGO' ELSE 'ABERTO' END,
                       (SELECT MIN(u.id) FROM usuario u WHERE u.empresa_id = x.empresa_id)
                  FROM (SELECT f.*,
                               (f.data_faturamento + 5 + (f.id % 25)::int <= CURRENT_DATE
                                AND (f.data_faturamento < CURRENT_DATE - 75 OR f.id % 5 <> 0)) AS pago
                          FROM faturamento f
                         WHERE f.data_faturamento >= CURRENT_DATE - 150) x
                """);

        jdbc.update("""
                INSERT INTO baixa_receber (empresa_id, titulo_id, data_baixa, valor, forma_pagamento, observacao, usuario_id)
                SELECT t.empresa_id, t.id, t.data_quitacao, t.valor,
                       (ARRAY['PIX', 'BOLETO', 'TRANSFERENCIA'])[1 + (t.id % 3)::int], 'Baixa gerada na carga de demonstração',
                       t.criado_por_id
                  FROM titulo_receber t
                 WHERE t.status = 'PAGO'
                """);

        jdbc.update("""
                INSERT INTO cobranca_acao (empresa_id, titulo_id, cliente_id, tipo, resultado, resumo, promessa_data, promessa_valor, usuario_id)
                SELECT t.empresa_id, t.id, t.cliente_id, 'LIGACAO',
                       CASE WHEN t.id % 3 = 0 THEN 'PROMESSA' ELSE 'SEM_RETORNO' END,
                       CASE WHEN t.id % 3 = 0 THEN 'Cliente prometeu pagar após o fechamento do caixa.'
                            ELSE 'Ligação sem retorno; tentar novamente.' END,
                       CASE WHEN t.id % 3 = 0 THEN CURRENT_DATE + ((t.id % 9)::int - 3) END,
                       CASE WHEN t.id % 3 = 0 THEN t.valor END,
                       t.criado_por_id
                  FROM titulo_receber t
                 WHERE t.status = 'ABERTO' AND t.data_vencimento < CURRENT_DATE AND t.id % 2 = 0
                """);

        log.info("Financeiro (demo): {} títulos gerados a partir das notas faturadas",
                jdbc.queryForObject("SELECT COUNT(*) FROM titulo_receber", Long.class));
    }
}
