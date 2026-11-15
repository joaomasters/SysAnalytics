package com.sysanalytics.crm.service;

import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.IndicadoresDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Indicadores avançados de vendas, clientes, financeiro e logística. Todos calculados por consulta sobre os dados já
 * existentes, para a empresa do usuário logado. Somente gestor/admin (garantido no controller).
 */
@Service
@RequiredArgsConstructor
public class IndicadoresService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    private final NamedParameterJdbcTemplate named;

    // ------------------------------------------------------------------ contexto de período

    private record Periodo(int meses, LocalDate hoje, LocalDate inicio, LocalDate inicioAnterior, List<String> rotulos) {
    }

    private static Periodo periodo(int mesesPedido) {
        int meses = Math.min(Math.max(mesesPedido, 3), 24);
        LocalDate hoje = LocalDate.now(FUSO);
        YearMonth atual = YearMonth.from(hoje);
        LocalDate inicio = atual.minusMonths(meses - 1L).atDay(1);
        List<String> rotulos = new ArrayList<>();
        for (int i = meses - 1; i >= 0; i--) {
            rotulos.add(atual.minusMonths(i).toString());
        }
        return new Periodo(meses, hoje, inicio, inicio.minusMonths(meses), rotulos);
    }

    private static MapSqlParameterSource base(UsuarioLogado u, Periodo p) {
        return new MapSqlParameterSource("e", u.empresaId())
                .addValue("ini", Date.valueOf(p.inicio()))
                .addValue("antIni", Date.valueOf(p.inicioAnterior()))
                .addValue("hoje", Date.valueOf(p.hoje()))
                .addValue("mes", Date.valueOf(p.hoje().withDayOfMonth(1)))
                .addValue("d90", Date.valueOf(p.hoje().minusDays(90)));
    }

    // ------------------------------------------------------------------ vendas

    @Transactional(readOnly = true)
    public IndicadoresVendas vendas(int mesesPedido) {
        UsuarioLogado u = UsuarioLogado.atual();
        Periodo p = periodo(mesesPedido);
        MapSqlParameterSource args = base(u, p);

        Map<String, VendaMes> porMes = new HashMap<>();
        named.query("""
                SELECT to_char(date_trunc('month', data_faturamento), 'YYYY-MM') AS mes, SUM(valor_total) AS fat,
                       COUNT(*) AS notas, COUNT(DISTINCT cliente_id) AS clientes
                  FROM faturamento WHERE empresa_id = :e AND data_faturamento >= :ini GROUP BY 1
                """, args, rs -> {
            BigDecimal fat = dinheiro(rs.getBigDecimal("fat"));
            long notas = rs.getLong("notas");
            porMes.put(rs.getString("mes"), new VendaMes(rs.getString("mes"), fat, notas, media(fat, notas), rs.getLong("clientes")));
        });
        List<VendaMes> serie = new ArrayList<>();
        for (String m : p.rotulos()) {
            serie.add(porMes.getOrDefault(m, new VendaMes(m, dinheiro(null), 0, dinheiro(null), 0)));
        }

        record Totais(BigDecimal fat, long notas, long clientes) {
        }
        Totais t = named.queryForObject("""
                SELECT COALESCE(SUM(valor_total), 0) AS fat, COUNT(*) AS notas, COUNT(DISTINCT cliente_id) AS clientes
                  FROM faturamento WHERE empresa_id = :e AND data_faturamento >= :ini
                """, args, (rs, i) -> new Totais(rs.getBigDecimal("fat"), rs.getLong("notas"), rs.getLong("clientes")));
        BigDecimal anterior = named.queryForObject("""
                SELECT COALESCE(SUM(valor_total), 0) FROM faturamento
                 WHERE empresa_id = :e AND data_faturamento >= :antIni AND data_faturamento < :ini
                """, args, BigDecimal.class);

        List<VendedorDesempenho> vendedores = named.query("""
                SELECT v.id, v.nome, COALESCE(SUM(f.valor_total), 0) AS fat, COUNT(f.id) AS notas,
                       COUNT(DISTINCT f.cliente_id) AS clientes,
                       (SELECT m.valor_meta FROM meta m WHERE m.vendedor_id = v.id AND m.competencia = :mes) AS meta,
                       COALESCE(SUM(f.valor_total) FILTER (WHERE f.data_faturamento >= :mes), 0) AS realizado
                  FROM vendedor v
                  LEFT JOIN faturamento f ON f.vendedor_id = v.id AND f.data_faturamento >= :ini
                 WHERE v.empresa_id = :e
                 GROUP BY v.id, v.nome ORDER BY fat DESC
                """, args, (rs, i) -> {
            BigDecimal fat = dinheiro(rs.getBigDecimal("fat"));
            long notas = rs.getLong("notas");
            BigDecimal meta = rs.getBigDecimal("meta");
            BigDecimal realizado = dinheiro(rs.getBigDecimal("realizado"));
            return new VendedorDesempenho(rs.getLong("id"), rs.getString("nome"), fat, notas, media(fat, notas),
                    rs.getLong("clientes"), pct(fat, t.fat()), meta == null ? null : dinheiro(meta), realizado,
                    meta == null || meta.signum() == 0 ? null : pct(realizado, meta));
        });

        return new IndicadoresVendas(p.meses(), dinheiro(t.fat()), dinheiro(anterior), variacao(t.fat(), anterior), t.notas(),
                media(t.fat(), t.notas()), t.clientes(), serie, vendedores, funil(args), propostas(args));
    }

    private FunilIndicadores funil(MapSqlParameterSource args) {
        record F(long criadas, long ganhas, long perdidas, long abertas, BigDecimal ciclo, BigDecimal vGanho, BigDecimal vPerdido,
                 BigDecimal pipeline, BigDecimal ponderado) {
        }
        F f = named.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE criada_em >= :ini) AS criadas,
                       COUNT(*) FILTER (WHERE etapa = 'GANHA' AND fechada_em >= :ini) AS ganhas,
                       COUNT(*) FILTER (WHERE etapa = 'PERDIDA' AND fechada_em >= :ini) AS perdidas,
                       COUNT(*) FILTER (WHERE etapa NOT IN ('GANHA', 'PERDIDA')) AS abertas,
                       AVG(fechada_em::date - criada_em::date) FILTER (WHERE etapa = 'GANHA' AND fechada_em >= :ini) AS ciclo,
                       COALESCE(SUM(valor_estimado) FILTER (WHERE etapa = 'GANHA' AND fechada_em >= :ini), 0) AS v_ganho,
                       COALESCE(SUM(valor_estimado) FILTER (WHERE etapa = 'PERDIDA' AND fechada_em >= :ini), 0) AS v_perdido,
                       COALESCE(SUM(valor_estimado) FILTER (WHERE etapa NOT IN ('GANHA', 'PERDIDA')), 0) AS pipeline,
                       COALESCE(SUM(valor_estimado * probabilidade / 100.0) FILTER (WHERE etapa NOT IN ('GANHA', 'PERDIDA')), 0) AS ponderado
                  FROM oportunidade WHERE empresa_id = :e
                """, args, (rs, i) -> new F(rs.getLong("criadas"), rs.getLong("ganhas"), rs.getLong("perdidas"), rs.getLong("abertas"),
                rs.getBigDecimal("ciclo"), rs.getBigDecimal("v_ganho"), rs.getBigDecimal("v_perdido"), rs.getBigDecimal("pipeline"),
                rs.getBigDecimal("ponderado")));
        List<Rotulo> motivos = named.query("""
                SELECT motivo_perda, COUNT(*) AS qtd, COALESCE(SUM(valor_estimado), 0) AS valor
                  FROM oportunidade WHERE empresa_id = :e AND etapa = 'PERDIDA' AND fechada_em >= :ini
                 GROUP BY motivo_perda ORDER BY qtd DESC
                """, args, (rs, i) -> new Rotulo(rs.getString("motivo_perda"), dinheiro(rs.getBigDecimal("valor")), rs.getLong("qtd")));
        long fechadas = f.ganhas() + f.perdidas();
        return new FunilIndicadores(f.criadas(), f.ganhas(), f.perdidas(), f.abertas(),
                fechadas == 0 ? null : pct(BigDecimal.valueOf(f.ganhas()), BigDecimal.valueOf(fechadas)),
                f.ciclo() == null ? null : f.ciclo().setScale(1, RoundingMode.HALF_UP), media(f.vGanho(), f.ganhas()),
                dinheiro(f.vGanho()), dinheiro(f.vPerdido()), dinheiro(f.pipeline()), dinheiro(f.ponderado()), motivos);
    }

    private PropostasIndicadores propostas(MapSqlParameterSource args) {
        record P(long enviadas, long aceitas, long recusadas) {
        }
        P p = named.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE status IN ('ENVIADA', 'ACEITA', 'RECUSADA')) AS enviadas,
                       COUNT(*) FILTER (WHERE status = 'ACEITA') AS aceitas,
                       COUNT(*) FILTER (WHERE status = 'RECUSADA') AS recusadas
                  FROM proposta WHERE empresa_id = :e AND criada_em >= :ini
                """, args, (rs, i) -> new P(rs.getLong("enviadas"), rs.getLong("aceitas"), rs.getLong("recusadas")));
        record D(BigDecimal desconto, BigDecimal aceito) {
        }
        D d = named.queryForObject("""
                SELECT SUM(i.quantidade * i.preco_unitario * i.desconto_percentual / 100.0) * 100.0
                         / NULLIF(SUM(i.quantidade * i.preco_unitario), 0) AS desconto,
                       COALESCE(SUM(i.quantidade * i.preco_unitario * (1 - i.desconto_percentual / 100.0)) FILTER (WHERE p.status = 'ACEITA'), 0) AS aceito
                  FROM proposta_item i JOIN proposta p ON p.id = i.proposta_id
                 WHERE p.empresa_id = :e AND p.criada_em >= :ini AND p.status <> 'RASCUNHO'
                """, args, (rs, i) -> new D(rs.getBigDecimal("desconto"), rs.getBigDecimal("aceito")));
        List<ProdutoCotado> top = named.query("""
                SELECT i.descricao, SUM(i.quantidade) AS qtd,
                       SUM(i.quantidade * i.preco_unitario * (1 - i.desconto_percentual / 100.0)) AS valor,
                       COUNT(DISTINCT p.id) AS propostas
                  FROM proposta_item i JOIN proposta p ON p.id = i.proposta_id
                 WHERE p.empresa_id = :e AND p.criada_em >= :ini AND p.status <> 'RASCUNHO'
                 GROUP BY i.descricao ORDER BY valor DESC LIMIT 8
                """, args, (rs, i) -> new ProdutoCotado(rs.getString("descricao"), rs.getBigDecimal("qtd"),
                dinheiro(rs.getBigDecimal("valor")), rs.getLong("propostas")));
        long decididas = p.aceitas() + p.recusadas();
        return new PropostasIndicadores(p.enviadas(), p.aceitas(), p.recusadas(),
                decididas == 0 ? null : pct(BigDecimal.valueOf(p.aceitas()), BigDecimal.valueOf(decididas)),
                d.desconto() == null ? null : d.desconto().setScale(1, RoundingMode.HALF_UP), dinheiro(d.aceito()), top);
    }

    // ------------------------------------------------------------------ clientes

    @Transactional(readOnly = true)
    public IndicadoresClientes clientes(int mesesPedido) {
        UsuarioLogado u = UsuarioLogado.atual();
        Periodo p = periodo(mesesPedido);
        MapSqlParameterSource args = base(u, p);

        // Inatividade: dias desde a última compra de cada cliente.
        long[] faixas = new long[6]; // 0-30, 31-60, 61-90, 91-180, 180+, nunca
        long[] total = {0};
        named.query("""
                SELECT c.id, MAX(f.data_faturamento) AS ultima FROM cliente c
                  LEFT JOIN faturamento f ON f.cliente_id = c.id WHERE c.empresa_id = :e GROUP BY c.id
                """, args, rs -> {
            total[0]++;
            Date ultima = rs.getDate("ultima");
            if (ultima == null) {
                faixas[5]++;
                return;
            }
            long dias = ChronoUnit.DAYS.between(ultima.toLocalDate(), p.hoje());
            faixas[dias <= 30 ? 0 : dias <= 60 ? 1 : dias <= 90 ? 2 : dias <= 180 ? 3 : 4]++;
        });
        long ativos = faixas[0] + faixas[1] + faixas[2];
        List<Rotulo> inatividade = List.of(
                new Rotulo("Comprou há até 30 dias", null, faixas[0]), new Rotulo("31 a 60 dias", null, faixas[1]),
                new Rotulo("61 a 90 dias", null, faixas[2]), new Rotulo("91 a 180 dias", null, faixas[3]),
                new Rotulo("Mais de 180 dias", null, faixas[4]), new Rotulo("Nunca comprou", null, faixas[5]));

        Long novos = named.queryForObject("SELECT COUNT(*) FROM cliente WHERE empresa_id = :e AND data_cadastro >= :ini", args, Long.class);

        // Faturamento por cliente no período (base da curva ABC, concentração, segmento e UF).
        record Cli(String nome, String segmento, String uf, BigDecimal valor, long notas) {
        }
        List<Cli> clientes = named.query("""
                SELECT c.nome_fantasia, c.segmento, c.uf, SUM(f.valor_total) AS valor, COUNT(*) AS notas
                  FROM faturamento f JOIN cliente c ON c.id = f.cliente_id
                 WHERE f.empresa_id = :e AND f.data_faturamento >= :ini
                 GROUP BY c.id, c.nome_fantasia, c.segmento, c.uf ORDER BY valor DESC
                """, args, (rs, i) -> new Cli(rs.getString("nome_fantasia"), rs.getString("segmento"), rs.getString("uf"),
                rs.getBigDecimal("valor"), rs.getLong("notas")));
        BigDecimal soma = clientes.stream().map(Cli::valor).reduce(BigDecimal.ZERO, BigDecimal::add);
        long n = clientes.size();

        // Curva ABC: A até 80% do faturamento acumulado, B até 95%, C o restante.
        long[] qtd = new long[3];
        BigDecimal[] val = {BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO};
        BigDecimal acumulado = BigDecimal.ZERO;
        BigDecimal top10 = BigDecimal.ZERO;
        int pos = 0;
        for (Cli c : clientes) {
            BigDecimal antes = soma.signum() == 0 ? BigDecimal.ZERO : acumulado.multiply(CEM).divide(soma, 4, RoundingMode.HALF_UP);
            int classe = antes.compareTo(BigDecimal.valueOf(80)) < 0 ? 0 : antes.compareTo(BigDecimal.valueOf(95)) < 0 ? 1 : 2;
            qtd[classe]++;
            val[classe] = val[classe].add(c.valor());
            acumulado = acumulado.add(c.valor());
            if (++pos <= 10) top10 = top10.add(c.valor());
        }
        String[] nomes = {"A", "B", "C"};
        List<ClasseAbc> abc = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            abc.add(new ClasseAbc(nomes[i], qtd[i], n == 0 ? null : pct(BigDecimal.valueOf(qtd[i]), BigDecimal.valueOf(n)),
                    dinheiro(val[i]), soma.signum() == 0 ? null : pct(val[i], soma)));
        }
        long recorrentes = clientes.stream().filter(c -> c.notas() >= 2).count();

        BigDecimal frequencia = named.queryForObject("""
                SELECT AVG(d) FROM (SELECT data_faturamento - LAG(data_faturamento) OVER (PARTITION BY cliente_id ORDER BY data_faturamento) AS d
                                      FROM faturamento WHERE empresa_id = :e AND data_faturamento >= :ini) x WHERE d IS NOT NULL
                """, args, BigDecimal.class);

        // Retenção: dos clientes que compraram no mês anterior, quantos compraram também neste.
        Map<String, Set<Long>> compradores = new HashMap<>();
        args.addValue("iniMenos1", Date.valueOf(p.inicio().minusMonths(1)));
        named.query("""
                SELECT DISTINCT to_char(date_trunc('month', data_faturamento), 'YYYY-MM') AS mes, cliente_id
                  FROM faturamento WHERE empresa_id = :e AND data_faturamento >= :iniMenos1
                """, args, rs -> {
            compradores.computeIfAbsent(rs.getString("mes"), k -> new HashSet<>()).add(rs.getLong("cliente_id"));
        });
        List<RetencaoMes> retencao = new ArrayList<>();
        for (String mes : p.rotulos()) {
            Set<Long> atual = compradores.getOrDefault(mes, Set.of());
            Set<Long> anterior = compradores.getOrDefault(YearMonth.parse(mes).minusMonths(1).toString(), Set.of());
            long rec = atual.stream().filter(anterior::contains).count();
            retencao.add(new RetencaoMes(mes, atual.size(), rec,
                    anterior.isEmpty() ? null : pct(BigDecimal.valueOf(rec), BigDecimal.valueOf(anterior.size()))));
        }

        List<Rotulo> topClientes = clientes.stream().limit(8).map(c -> new Rotulo(c.nome(), dinheiro(c.valor()), c.notas())).toList();

        return new IndicadoresClientes(p.meses(), total[0], ativos, total[0] - ativos,
                total[0] == 0 ? null : pct(BigDecimal.valueOf(ativos), BigDecimal.valueOf(total[0])), novos == null ? 0 : novos,
                media(soma, n), frequencia == null ? null : frequencia.setScale(1, RoundingMode.HALF_UP),
                n == 0 ? null : pct(BigDecimal.valueOf(recorrentes), BigDecimal.valueOf(n)),
                soma.signum() == 0 ? null : pct(top10, soma), inatividade, abc, retencao,
                agrupar(clientes.stream().map(c -> new Object[]{c.segmento(), c.valor()}).toList(), 8, "Sem segmento"),
                agrupar(clientes.stream().map(c -> new Object[]{c.uf(), c.valor()}).toList(), 8, "Sem UF"), topClientes);
    }

    /** Soma valor e conta clientes por rótulo, do maior para o menor. */
    private static List<Rotulo> agrupar(List<Object[]> linhas, int limite, String vazio) {
        Map<String, BigDecimal> valores = new HashMap<>();
        Map<String, Long> contagem = new HashMap<>();
        for (Object[] l : linhas) {
            String chave = l[0] == null || l[0].toString().isBlank() ? vazio : l[0].toString();
            valores.merge(chave, (BigDecimal) l[1], BigDecimal::add);
            contagem.merge(chave, 1L, Long::sum);
        }
        return valores.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue())).limit(limite)
                .map(e -> new Rotulo(e.getKey(), dinheiro(e.getValue()), contagem.get(e.getKey()))).toList();
    }

    // ------------------------------------------------------------------ financeiro

    @Transactional(readOnly = true)
    public IndicadoresFinanceiro financeiro(int mesesPedido) {
        UsuarioLogado u = UsuarioLogado.atual();
        Periodo p = periodo(mesesPedido);
        MapSqlParameterSource args = base(u, p);

        BigDecimal pmr = named.queryForObject("""
                SELECT AVG(data_quitacao - data_emissao) FROM titulo_receber
                 WHERE empresa_id = :e AND status = 'PAGO' AND data_quitacao >= :d90
                """, args, BigDecimal.class);
        BigDecimal pmp = named.queryForObject("""
                SELECT AVG(data_quitacao - data_emissao) FROM conta_pagar
                 WHERE empresa_id = :e AND status = 'PAGO' AND data_quitacao >= :d90
                """, args, BigDecimal.class);

        record R(BigDecimal aberto, BigDecimal vencido, long pagos, long noPrazo, BigDecimal atraso) {
        }
        R r = named.queryForObject("""
                SELECT COALESCE(SUM(valor - valor_pago) FILTER (WHERE status IN ('ABERTO', 'PARCIAL')), 0) AS aberto,
                       COALESCE(SUM(valor - valor_pago) FILTER (WHERE status IN ('ABERTO', 'PARCIAL') AND data_vencimento < :hoje), 0) AS vencido,
                       COUNT(*) FILTER (WHERE status = 'PAGO' AND data_quitacao >= :d90) AS pagos,
                       COUNT(*) FILTER (WHERE status = 'PAGO' AND data_quitacao >= :d90 AND data_quitacao <= data_vencimento) AS no_prazo,
                       AVG(data_quitacao - data_vencimento) FILTER (WHERE status = 'PAGO' AND data_quitacao >= :d90
                                                                      AND data_quitacao > data_vencimento) AS atraso
                  FROM titulo_receber WHERE empresa_id = :e
                """, args, (rs, i) -> new R(rs.getBigDecimal("aberto"), rs.getBigDecimal("vencido"), rs.getLong("pagos"),
                rs.getLong("no_prazo"), rs.getBigDecimal("atraso")));
        BigDecimal aPagar = named.queryForObject("""
                SELECT COALESCE(SUM(valor - valor_pago), 0) FROM conta_pagar WHERE empresa_id = :e AND status IN ('ABERTO', 'PARCIAL')
                """, args, BigDecimal.class);

        Map<String, BigDecimal> recebido = mensal(args, "SELECT to_char(date_trunc('month', data_baixa), 'YYYY-MM') AS mes, SUM(valor) AS v"
                + " FROM baixa_receber WHERE empresa_id = :e AND data_baixa >= :ini GROUP BY 1");
        Map<String, BigDecimal> pago = mensal(args, "SELECT to_char(date_trunc('month', data_pagamento), 'YYYY-MM') AS mes, SUM(valor) AS v"
                + " FROM baixa_pagar WHERE empresa_id = :e AND data_pagamento >= :ini GROUP BY 1");
        Map<String, BigDecimal> receita = mensal(args, "SELECT to_char(date_trunc('month', data_faturamento), 'YYYY-MM') AS mes, SUM(valor_total) AS v"
                + " FROM faturamento WHERE empresa_id = :e AND data_faturamento >= :ini GROUP BY 1");
        Map<String, BigDecimal> cmv = mensal(args, "SELECT to_char(date_trunc('month', data_emissao), 'YYYY-MM') AS mes, SUM(valor) AS v"
                + " FROM conta_pagar WHERE empresa_id = :e AND categoria = 'MERCADORIA' AND status <> 'CANCELADO' AND data_emissao >= :ini GROUP BY 1");
        Map<String, BigDecimal> custos = mensal(args, "SELECT to_char(date_trunc('month', data_lancamento), 'YYYY-MM') AS mes, SUM(valor) AS v"
                + " FROM custo WHERE empresa_id = :e AND data_lancamento >= :ini GROUP BY 1");

        List<FinanceiroMes> serie = new ArrayList<>();
        for (String m : p.rotulos()) {
            BigDecimal rec = recebido.getOrDefault(m, BigDecimal.ZERO);
            BigDecimal pg = pago.getOrDefault(m, BigDecimal.ZERO);
            BigDecimal rc = receita.getOrDefault(m, BigDecimal.ZERO);
            BigDecimal mb = rc.subtract(cmv.getOrDefault(m, BigDecimal.ZERO));
            BigDecimal res = mb.subtract(custos.getOrDefault(m, BigDecimal.ZERO));
            serie.add(new FinanceiroMes(m, dinheiro(rec), dinheiro(pg), dinheiro(rec.subtract(pg)), dinheiro(rc),
                    rc.signum() == 0 ? null : pct(mb, rc), rc.signum() == 0 ? null : pct(res, rc)));
        }

        List<Rotulo> concentracao = named.query("""
                SELECT c.nome_fantasia, SUM(t.valor - t.valor_pago) AS valor, COUNT(*) AS titulos
                  FROM titulo_receber t JOIN cliente c ON c.id = t.cliente_id
                 WHERE t.empresa_id = :e AND t.status IN ('ABERTO', 'PARCIAL')
                 GROUP BY c.id, c.nome_fantasia ORDER BY valor DESC LIMIT 5
                """, args, (rs, i) -> new Rotulo(rs.getString("nome_fantasia"), dinheiro(rs.getBigDecimal("valor")), rs.getLong("titulos")));
        BigDecimal top5 = concentracao.stream().map(Rotulo::valor).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal pmr1 = pmr == null ? null : pmr.setScale(1, RoundingMode.HALF_UP);
        BigDecimal pmp1 = pmp == null ? null : pmp.setScale(1, RoundingMode.HALF_UP);
        return new IndicadoresFinanceiro(p.meses(), pmr1, pmp1, pmr1 == null || pmp1 == null ? null : pmr1.subtract(pmp1),
                r.aberto().signum() == 0 ? null : pct(r.vencido(), r.aberto()),
                r.pagos() == 0 ? null : pct(BigDecimal.valueOf(r.noPrazo()), BigDecimal.valueOf(r.pagos())),
                r.atraso() == null ? null : r.atraso().setScale(1, RoundingMode.HALF_UP),
                dinheiro(r.aberto()), dinheiro(aPagar), dinheiro(r.aberto().subtract(aPagar)), serie, concentracao,
                r.aberto().signum() == 0 ? null : pct(top5, r.aberto()));
    }

    private Map<String, BigDecimal> mensal(MapSqlParameterSource args, String sql) {
        Map<String, BigDecimal> m = new HashMap<>();
        named.query(sql, args, rs -> {
            m.put(rs.getString("mes"), rs.getBigDecimal("v"));
        });
        return m;
    }

    // ------------------------------------------------------------------ logística

    private static final String PERIODO_CARGA = "c.status <> 'CANCELADA' AND COALESCE(c.data_embarque, c.criada_em::date) >= :ini";
    private static final String ENTREGUE_NO_PERIODO = "c.status = 'ENTREGUE' AND c.data_entrega >= :ini";

    @Transactional(readOnly = true)
    public IndicadoresLogistica logistica(int mesesPedido) {
        UsuarioLogado u = UsuarioLogado.atual();
        Periodo p = periodo(mesesPedido);
        MapSqlParameterSource args = base(u, p);

        List<LogisticaGrupo> total = grupos("'Total'", "", args, 1);
        LogisticaGrupo g = total.isEmpty() ? null : total.get(0);
        Long cargas = named.queryForObject("SELECT COUNT(*) FROM carga c WHERE c.empresa_id = :e AND " + PERIODO_CARGA, args, Long.class);

        record M(long entregues, long noPrazo, BigDecimal prazo, BigDecimal frete, BigDecimal merc) {
        }
        Map<String, M> porMes = new HashMap<>();
        named.query("""
                SELECT to_char(date_trunc('month', c.data_entrega), 'YYYY-MM') AS mes, COUNT(*) AS entregues,
                       COUNT(*) FILTER (WHERE c.data_entrega <= c.previsao_entrega) AS no_prazo,
                       AVG(c.data_entrega - c.data_embarque) FILTER (WHERE c.data_embarque IS NOT NULL) AS prazo,
                       SUM(c.valor_frete) AS frete, SUM(c.valor_mercadoria) FILTER (WHERE c.valor_frete IS NOT NULL) AS merc
                  FROM carga c WHERE c.empresa_id = :e""" + " AND " + ENTREGUE_NO_PERIODO + " GROUP BY 1", args,
                rs -> {
                    porMes.put(rs.getString("mes"), new M(rs.getLong("entregues"), rs.getLong("no_prazo"), rs.getBigDecimal("prazo"),
                            rs.getBigDecimal("frete"), rs.getBigDecimal("merc")));
                });
        Map<String, Long> ocorrencias = new HashMap<>();
        named.query("""
                SELECT to_char(date_trunc('month', e.ocorrido_em), 'YYYY-MM') AS mes, COUNT(*) AS n
                  FROM carga_evento e WHERE e.empresa_id = :e AND e.tipo = 'OCORRENCIA' AND e.ocorrido_em >= :ini GROUP BY 1
                """, args, rs -> {
            ocorrencias.put(rs.getString("mes"), rs.getLong("n"));
        });
        List<LogisticaMes> serie = new ArrayList<>();
        for (String mes : p.rotulos()) {
            M m = porMes.get(mes);
            long entregues = m == null ? 0 : m.entregues();
            serie.add(new LogisticaMes(mes, entregues,
                    m == null ? null : pct(BigDecimal.valueOf(m.noPrazo()), BigDecimal.valueOf(m.entregues())),
                    m == null || m.prazo() == null ? null : m.prazo().setScale(1, RoundingMode.HALF_UP),
                    ocorrencias.getOrDefault(mes, 0L),
                    m == null || m.merc() == null || m.merc().signum() == 0 || m.frete() == null ? null : pct(m.frete(), m.merc())));
        }

        return new IndicadoresLogistica(p.meses(), cargas == null ? 0 : cargas, g == null ? 0 : g.entregues(),
                g == null ? null : g.pontualidadePct(), g == null ? null : g.prazoMedioDias(), g == null ? null : g.atrasoMedioDias(),
                g == null ? null : g.fretePct(), g == null ? null : g.ocorrenciasPor100(), serie,
                grupos("INITCAP(c.sentido)", "", args, 4),
                grupos("COALESCE(t.nome, 'Sem transportadora')", "", args, 8),
                grupos("COALESCE(NULLIF(UPPER(TRIM(split_part(c.destino, '/', 2))), ''), 'Sem UF')", " AND c.sentido = 'SAIDA'", args, 8),
                grupos("f.nome", " AND c.sentido = 'ENTRADA' AND f.nome IS NOT NULL", args, 6));
    }

    /** Métricas de entrega agrupadas pelo rótulo (expressão SQL interna, nunca vinda do usuário). */
    private List<LogisticaGrupo> grupos(String rotulo, String filtro, MapSqlParameterSource args, int limite) {
        String sql = "SELECT " + rotulo + " AS rotulo, "
                + "COUNT(*) FILTER (WHERE " + ENTREGUE_NO_PERIODO + ") AS entregues, "
                + "COUNT(*) FILTER (WHERE " + ENTREGUE_NO_PERIODO + " AND c.data_entrega <= c.previsao_entrega) AS no_prazo, "
                + "AVG(c.data_entrega - c.data_embarque) FILTER (WHERE " + ENTREGUE_NO_PERIODO + " AND c.data_embarque IS NOT NULL) AS prazo, "
                + "AVG(c.data_entrega - c.previsao_entrega) FILTER (WHERE " + ENTREGUE_NO_PERIODO + " AND c.data_entrega > c.previsao_entrega) AS atraso, "
                + "COALESCE(SUM(oc.n) FILTER (WHERE " + PERIODO_CARGA + "), 0) AS ocorrencias, "
                + "COUNT(*) FILTER (WHERE " + PERIODO_CARGA + ") AS cargas, "
                + "COALESCE(SUM(c.valor_frete) FILTER (WHERE " + PERIODO_CARGA + "), 0) AS frete, "
                + "COALESCE(SUM(c.valor_mercadoria) FILTER (WHERE " + PERIODO_CARGA + " AND c.valor_frete IS NOT NULL), 0) AS merc "
                + "FROM carga c "
                + "LEFT JOIN transportadora t ON t.id = c.transportadora_id "
                + "LEFT JOIN fornecedor f ON f.id = c.fornecedor_id "
                + "LEFT JOIN LATERAL (SELECT COUNT(*) AS n FROM carga_evento e WHERE e.carga_id = c.id AND e.tipo = 'OCORRENCIA') oc ON TRUE "
                + "WHERE c.empresa_id = :e" + filtro + " GROUP BY 1 "
                + "HAVING COUNT(*) FILTER (WHERE " + ENTREGUE_NO_PERIODO + ") > 0 ORDER BY entregues DESC LIMIT " + limite;
        return named.query(sql, args, (rs, i) -> {
            long entregues = rs.getLong("entregues");
            long cargas = rs.getLong("cargas");
            BigDecimal prazo = rs.getBigDecimal("prazo");
            BigDecimal atraso = rs.getBigDecimal("atraso");
            BigDecimal merc = rs.getBigDecimal("merc");
            BigDecimal frete = rs.getBigDecimal("frete");
            return new LogisticaGrupo(rs.getString("rotulo"), entregues,
                    pct(BigDecimal.valueOf(rs.getLong("no_prazo")), BigDecimal.valueOf(entregues)),
                    prazo == null ? null : prazo.setScale(1, RoundingMode.HALF_UP),
                    atraso == null ? null : atraso.setScale(1, RoundingMode.HALF_UP),
                    cargas == 0 ? null : pct(BigDecimal.valueOf(rs.getLong("ocorrencias")), BigDecimal.valueOf(cargas)),
                    merc.signum() == 0 ? null : pct(frete, merc), dinheiro(frete));
        });
    }

    // ------------------------------------------------------------------ utilidades

    private static BigDecimal pct(BigDecimal parte, BigDecimal base) {
        return base == null || base.signum() == 0 ? null : parte.multiply(CEM).divide(base, 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal variacao(BigDecimal atual, BigDecimal anterior) {
        return anterior == null || anterior.signum() == 0 ? null
                : atual.subtract(anterior).multiply(CEM).divide(anterior, 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal media(BigDecimal total, long n) {
        return n == 0 ? dinheiro(null) : dinheiro(total).divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal dinheiro(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }
}
