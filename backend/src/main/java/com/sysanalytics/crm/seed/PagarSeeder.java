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
 * Demonstração do contas a pagar: fornecedores, compras de mercadoria (~60% do faturamento de cada mês,
 * que alimentam o CMV do DRE) e contas fixas dos próximos dois meses. Só roda se ainda não houver fornecedores.
 */
@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "crm.seed.enabled", havingValue = "true", matchIfMissing = true)
public class PagarSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    @Transactional
    public void run(String... args) {
        Long fornecedores = jdbc.queryForObject("SELECT COUNT(*) FROM fornecedor", Long.class);
        Long notas = jdbc.queryForObject("SELECT COUNT(*) FROM faturamento", Long.class);
        if ((fornecedores != null && fornecedores > 0) || notas == null || notas == 0) {
            return;
        }

        jdbc.update("""
                INSERT INTO fornecedor (empresa_id, nome, documento, contato, email, telefone)
                SELECT e.id, v.nome, v.doc, v.contato, v.email, v.tel
                  FROM (SELECT MIN(id) AS id FROM empresa) e
                 CROSS JOIN (VALUES
                    ('Distribuidora Atlântico', '11.222.333/0001-81', 'Marcos Lima', 'vendas@atlantico.example', '(11) 4002-1001'),
                    ('Importadora Pacífico', '22.333.444/0001-72', 'Aline Souza', 'comercial@pacifico.example', '(11) 4002-1002'),
                    ('Indústria Norte Sul', '33.444.555/0001-63', 'Paulo Reis', 'pedidos@nortesul.example', '(41) 4002-1003'),
                    ('Transportes Rápido Sul', '44.555.666/0001-54', 'Carla Dias', 'fretes@rapidosul.example', '(51) 4002-1004'),
                    ('Imobiliária Central', '55.666.777/0001-45', 'Jorge Alves', 'contratos@central.example', '(11) 4002-1005'),
                    ('Contabilidade Alfa', '66.777.888/0001-36', 'Renata Cruz', 'contato@alfa.example', '(11) 4002-1006'),
                    ('Energia Brasil', '77.888.999/0001-27', 'Atendimento', 'faturas@energia.example', '0800 000 0000')
                 ) AS v(nome, doc, contato, email, tel)
                """);

        // Compras de mercadoria: 3 notas por mês (18% + 20% + 22% do faturamento do mês), últimos 6 meses.
        jdbc.update("""
                INSERT INTO conta_pagar (empresa_id, fornecedor_id, numero_documento, parcela, total_parcelas, descricao, categoria,
                                         data_emissao, data_vencimento, valor, valor_pago, data_quitacao, status, criado_por_id)
                SELECT b.empresa_id, b.fornecedor_id, 'NF-C-' || to_char(b.mes, 'YYYYMM') || '-' || b.n, 1, 1,
                       'Compra de mercadoria para revenda', 'MERCADORIA', b.emissao, b.venc, b.valor,
                       CASE WHEN b.pago THEN b.valor ELSE 0 END,
                       CASE WHEN b.pago THEN b.venc - (b.n % 3) END,
                       CASE WHEN b.pago THEN 'PAGO' ELSE 'ABERTO' END,
                       b.usuario_id
                  FROM (SELECT x.*, (x.venc <= CURRENT_DATE - 2 AND (EXTRACT(MONTH FROM x.mes)::int + x.n) % 7 <> 0) AS pago
                          FROM (SELECT s.empresa_id, m.mes::date AS mes, k.n,
                                       (m.mes::date + (k.n * 7 - 2)) AS emissao,
                                       (m.mes::date + (k.n * 7 - 2) + 28 + 7 * k.n) AS venc,
                                       ROUND(f.total * (0.16 + 0.02 * k.n), 2) AS valor,
                                       (SELECT fo.id FROM fornecedor fo WHERE fo.empresa_id = s.empresa_id ORDER BY fo.id OFFSET k.n - 1 LIMIT 1) AS fornecedor_id,
                                       (SELECT MIN(u.id) FROM usuario u WHERE u.empresa_id = s.empresa_id) AS usuario_id
                                  FROM (SELECT MIN(id) AS empresa_id FROM empresa) s
                                 CROSS JOIN generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months',
                                                            date_trunc('month', CURRENT_DATE), interval '1 month') AS m(mes)
                                 CROSS JOIN generate_series(1, 3) AS k(n)
                                 CROSS JOIN LATERAL (SELECT COALESCE(SUM(fa.valor_total), 0) AS total FROM faturamento fa
                                                      WHERE fa.empresa_id = s.empresa_id AND fa.data_faturamento >= m.mes
                                                        AND fa.data_faturamento < m.mes + interval '1 month') f) x
                         WHERE x.valor > 0 AND x.emissao <= CURRENT_DATE) b
                """);

        jdbc.update("""
                INSERT INTO baixa_pagar (empresa_id, conta_id, data_pagamento, valor, forma_pagamento, observacao, usuario_id)
                SELECT c.empresa_id, c.id, c.data_quitacao, c.valor, (ARRAY['PIX', 'BOLETO', 'TRANSFERENCIA'])[1 + (c.id % 3)::int],
                       'Pagamento gerado na carga de demonstração', c.criado_por_id
                  FROM conta_pagar c WHERE c.status = 'PAGO'
                """);

        // Contas fixas dos próximos dois meses (uma ainda vencida, para o painel de atrasos).
        jdbc.update("""
                INSERT INTO conta_pagar (empresa_id, fornecedor_id, numero_documento, parcela, total_parcelas, descricao, categoria,
                                         data_emissao, data_vencimento, valor, valor_pago, status, criado_por_id)
                SELECT e.id, (SELECT fo.id FROM fornecedor fo WHERE fo.empresa_id = e.id AND fo.nome = d.fornecedor),
                       d.doc || '-' || c.ciclo, 1, 1, d.descricao, d.categoria,
                       CURRENT_DATE + d.dia + 30 * c.ciclo - 25, CURRENT_DATE + d.dia + 30 * c.ciclo, d.valor, 0, 'ABERTO',
                       (SELECT MIN(u.id) FROM usuario u WHERE u.empresa_id = e.id)
                  FROM (SELECT MIN(id) AS id FROM empresa) e
                 CROSS JOIN generate_series(0, 1) AS c(ciclo)
                 CROSS JOIN (VALUES
                    ('FOLHA', 'Folha de pagamento', 'PESSOAL', 'Contabilidade Alfa', 5, 171500.00),
                    ('ALUG', 'Aluguel do centro de distribuição', 'ALUGUEL', 'Imobiliária Central', 9, 38000.00),
                    ('ENERG', 'Energia elétrica', 'UTILIDADES', 'Energia Brasil', 12, 11800.00),
                    ('HONOR', 'Honorários contábeis', 'SERVICOS', 'Contabilidade Alfa', 15, 4900.00),
                    ('FRETE', 'Fretes do período', 'FRETE', 'Transportes Rápido Sul', 18, 38400.00),
                    ('TRIB', 'Impostos e contribuições', 'IMPOSTOS', 'Contabilidade Alfa', 22, 61500.00),
                    ('FRETE-ATR', 'Frete em atraso (ocorrência)', 'FRETE', 'Transportes Rápido Sul', -6, 7350.00)
                 ) AS d(doc, descricao, categoria, fornecedor, dia, valor)
                 WHERE c.ciclo = 0 OR d.dia > 0
                """);

        log.info("Financeiro a pagar (demo): {} fornecedores e {} contas geradas",
                jdbc.queryForObject("SELECT COUNT(*) FROM fornecedor", Long.class),
                jdbc.queryForObject("SELECT COUNT(*) FROM conta_pagar", Long.class));
    }
}
