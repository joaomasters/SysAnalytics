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
 * Demonstração da logística: transportadoras, cargas de saída (uma por nota faturada nos últimos 45 dias) e cargas de
 * entrada (uma por compra de mercadoria dos últimos 60 dias), com linha do tempo, atrasos e ocorrências.
 * Só roda se ainda não houver transportadoras.
 */
@Slf4j
@Component
@Order(4)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "crm.seed.enabled", havingValue = "true", matchIfMissing = true)
public class LogisticaSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    @Transactional
    public void run(String... args) {
        Long existentes = jdbc.queryForObject("SELECT COUNT(*) FROM transportadora", Long.class);
        Long notas = jdbc.queryForObject("SELECT COUNT(*) FROM faturamento", Long.class);
        if ((existentes != null && existentes > 0) || notas == null || notas == 0) {
            return;
        }

        jdbc.update("""
                INSERT INTO transportadora (empresa_id, nome, documento, contato, email, telefone)
                SELECT e.id, v.nome, v.doc, v.contato, v.email, v.tel
                  FROM (SELECT MIN(id) AS id FROM empresa) e
                 CROSS JOIN (VALUES
                    ('Rápido Sul Transportes', '44.555.666/0001-54', 'Carla Dias', 'operacao@rapidosul.example', '(51) 4002-2001'),
                    ('TransBrasil Cargas', '12.345.678/0001-90', 'Rogério Matos', 'despacho@transbrasil.example', '(11) 4002-2002'),
                    ('Jadlog Express (parceiro)', '09.876.543/0001-21', 'Atendimento', 'sac@expresso.example', '(31) 4002-2003'),
                    ('Mar & Terra Logística', '21.987.654/0001-10', 'Helena Prado', 'contato@marterra.example', '(21) 4002-2004')
                 ) AS v(nome, doc, contato, email, tel)
                """);

        // Saídas: uma entrega por nota faturada recente.
        jdbc.update("""
                INSERT INTO carga (empresa_id, sentido, codigo, status, transportadora_id, cliente_id, numero_documento, origem, destino,
                                   codigo_rastreio, data_embarque, previsao_entrega, data_entrega, peso_kg, volumes, valor_mercadoria,
                                   valor_frete, criado_por_id, criada_em)
                SELECT y.empresa_id, 'SAIDA', 'SAI-F' || lpad(y.id::text, 6, '0'), y.status, y.transp, y.cliente_id, y.numero_nota,
                       'Centro de distribuição', COALESCE(y.cidade || '/' || y.uf, 'Destino não informado'),
                       'BR' || lpad(((y.id * 7919) % 1000000000)::text, 9, '0') || 'SY',
                       CASE WHEN y.status <> 'AGUARDANDO' THEN y.data_faturamento + 1 END, y.previsao,
                       CASE WHEN y.status = 'ENTREGUE' THEN LEAST(CURRENT_DATE, y.previsao + CASE WHEN y.id % 7 = 0 THEN 2
                                                                                                  WHEN y.id % 11 = 0 THEN 1
                                                                                                  ELSE -(y.id % 2)::int END) END,
                       80 + (y.id % 60) * 15, 1 + (y.id % 14)::int, y.valor_total, ROUND(y.valor_total * 0.03, 2),
                       y.usuario_id, y.data_faturamento + interval '9 hours'
                  FROM (SELECT x.*,
                               CASE WHEN x.id % 9 = 0 AND x.idade BETWEEN 3 AND 14 THEN 'EM_TRANSITO'
                                    WHEN x.idade >= 7 THEN 'ENTREGUE'
                                    WHEN x.idade >= 2 THEN 'EM_TRANSITO'
                                    ELSE 'AGUARDANDO' END AS status
                          FROM (SELECT f.id, f.empresa_id, f.numero_nota, f.cliente_id, f.valor_total, f.data_faturamento, cl.cidade, cl.uf,
                                       (CURRENT_DATE - f.data_faturamento) AS idade,
                                       f.data_faturamento + 2 + (f.id % 4)::int AS previsao,
                                       (SELECT t.id FROM transportadora t WHERE t.empresa_id = f.empresa_id ORDER BY t.id OFFSET (f.id % 4) LIMIT 1) AS transp,
                                       (SELECT MIN(u.id) FROM usuario u WHERE u.empresa_id = f.empresa_id) AS usuario_id
                                  FROM faturamento f JOIN cliente cl ON cl.id = f.cliente_id
                                 WHERE f.data_faturamento >= CURRENT_DATE - 45) x) y
                """);

        // Entradas: uma carga por compra de mercadoria (contas a pagar), se o contas a pagar já foi semeado.
        jdbc.update("""
                INSERT INTO carga (empresa_id, sentido, codigo, status, transportadora_id, fornecedor_id, numero_documento, origem, destino,
                                   codigo_rastreio, data_embarque, previsao_entrega, data_entrega, peso_kg, volumes, valor_mercadoria,
                                   valor_frete, criado_por_id, criada_em)
                SELECT y.empresa_id, 'ENTRADA', 'ENT-C' || lpad(y.id::text, 6, '0'), y.status, y.transp, y.fornecedor_id, y.numero_documento,
                       y.fornecedor_nome, 'Centro de distribuição', 'EN' || lpad(((y.id * 104729) % 1000000000)::text, 9, '0') || 'BR',
                       CASE WHEN y.status <> 'AGUARDANDO' THEN y.data_emissao + 3 END, y.previsao,
                       CASE WHEN y.status = 'ENTREGUE' THEN LEAST(CURRENT_DATE, y.previsao + CASE WHEN y.id % 5 = 0 THEN 3
                                                                                                  WHEN y.id % 7 = 0 THEN 1 ELSE 0 END) END,
                       2000 + (y.id % 30) * 400, 20 + (y.id % 60)::int, y.valor, ROUND(y.valor * 0.02, 2),
                       y.criado_por_id, y.data_emissao + interval '10 hours'
                  FROM (SELECT x.*,
                               CASE WHEN x.previsao < CURRENT_DATE - 1 THEN 'ENTREGUE'
                                    WHEN x.data_emissao + 3 <= CURRENT_DATE THEN 'EM_TRANSITO'
                                    ELSE 'AGUARDANDO' END AS status
                          FROM (SELECT c.id, c.empresa_id, c.fornecedor_id, fo.nome AS fornecedor_nome, c.numero_documento, c.valor,
                                       c.data_emissao, c.criado_por_id,
                                       c.data_emissao + 10 + (c.id % 6)::int AS previsao,
                                       (SELECT t.id FROM transportadora t WHERE t.empresa_id = c.empresa_id ORDER BY t.id OFFSET (c.id % 4) LIMIT 1) AS transp
                                  FROM conta_pagar c JOIN fornecedor fo ON fo.id = c.fornecedor_id
                                 WHERE c.categoria = 'MERCADORIA' AND c.status <> 'CANCELADO'
                                   AND c.data_emissao >= CURRENT_DATE - 60) x) y
                """);

        // Linha do tempo.
        jdbc.update("""
                INSERT INTO carga_evento (empresa_id, carga_id, tipo, descricao, ocorrido_em, usuario_id)
                SELECT c.empresa_id, c.id, 'CRIADA', 'Carga cadastrada', c.criada_em, c.criado_por_id FROM carga c
                """);
        jdbc.update("""
                INSERT INTO carga_evento (empresa_id, carga_id, tipo, descricao, local, ocorrido_em, usuario_id)
                SELECT c.empresa_id, c.id, 'EMBARCADA', 'Carga coletada pela transportadora', c.origem, c.data_embarque + time '14:00', c.criado_por_id
                  FROM carga c WHERE c.data_embarque IS NOT NULL
                """);
        jdbc.update("""
                INSERT INTO carga_evento (empresa_id, carga_id, tipo, descricao, local, ocorrido_em, usuario_id)
                SELECT c.empresa_id, c.id, 'ATUALIZACAO', 'Passou pelo centro de triagem regional', 'Triagem regional',
                       c.data_embarque + interval '1 day 9 hours', c.criado_por_id
                  FROM carga c
                 WHERE c.data_embarque IS NOT NULL AND c.data_embarque + 1 <= CURRENT_DATE
                   AND (c.data_entrega IS NULL OR c.data_entrega > c.data_embarque)
                """);
        jdbc.update("""
                INSERT INTO carga_evento (empresa_id, carga_id, tipo, categoria, descricao, local, ocorrido_em, resolvida, resolvida_em, usuario_id)
                SELECT c.empresa_id, c.id, 'OCORRENCIA',
                       CASE WHEN c.status = 'EM_TRANSITO' THEN 'ATRASO' ELSE (ARRAY['AVARIA', 'ENDERECO', 'DOCUMENTO'])[1 + (c.id % 3)::int] END,
                       CASE WHEN c.status = 'EM_TRANSITO' THEN 'Atraso informado pela transportadora (veículo parado)'
                            ELSE 'Ocorrência tratada com a transportadora e liberada para entrega' END,
                       'Em rota', c.data_embarque + interval '2 days 10 hours', c.status = 'ENTREGUE',
                       CASE WHEN c.status = 'ENTREGUE' THEN c.data_entrega + time '09:00' END, c.criado_por_id
                  FROM carga c
                 WHERE c.data_embarque IS NOT NULL
                   AND ((c.status = 'EM_TRANSITO' AND c.previsao_entrega < CURRENT_DATE AND c.id % 2 = 0)
                        OR (c.status = 'ENTREGUE' AND c.id % 13 = 0))
                """);
        jdbc.update("""
                INSERT INTO carga_evento (empresa_id, carga_id, tipo, descricao, local, ocorrido_em, usuario_id)
                SELECT c.empresa_id, c.id, 'ENTREGUE',
                       CASE WHEN c.sentido = 'SAIDA' THEN 'Entrega confirmada pelo cliente' ELSE 'Recebido no centro de distribuição' END,
                       c.destino, c.data_entrega + time '15:00', c.criado_por_id
                  FROM carga c WHERE c.status = 'ENTREGUE'
                """);

        log.info("Logística (demo): {} transportadoras e {} cargas geradas",
                jdbc.queryForObject("SELECT COUNT(*) FROM transportadora", Long.class),
                jdbc.queryForObject("SELECT COUNT(*) FROM carga", Long.class));
    }
}
