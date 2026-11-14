package com.sysanalytics.crm.service;

import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.PagarDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Fluxo de caixa projetado e DRE gerencial. Somente gestor/admin (garantido no controller). */
@Service
@RequiredArgsConstructor
public class RelatorioFinanceiroService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    private final JdbcTemplate jdbc;

    // ------------------------------------------------------------------ fluxo de caixa

    @Transactional(readOnly = true)
    public FluxoCaixa fluxoCaixa(int semanas, BigDecimal saldoInicial, boolean incluirReceberAtrasado) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        Date dHoje = Date.valueOf(hoje);
        int n = Math.min(Math.max(semanas, 4), 26);
        BigDecimal inicial = dinheiro(saldoInicial);

        BigDecimal[] entradas = porSemana("titulo_receber", u.empresaId(), dHoje, n, incluirReceberAtrasado);
        BigDecimal[] saidas = porSemana("conta_pagar", u.empresaId(), dHoje, n, true);

        BigDecimal receberAtrasado = atrasado("titulo_receber", u.empresaId(), dHoje);
        BigDecimal pagarAtrasado = atrasado("conta_pagar", u.empresaId(), dHoje);

        List<FluxoSemana> lista = new ArrayList<>();
        BigDecimal acumulado = inicial;
        BigDecimal totalEnt = BigDecimal.ZERO;
        BigDecimal totalSai = BigDecimal.ZERO;
        BigDecimal menor = null;
        LocalDate semanaMenor = null;
        for (int i = 0; i < n; i++) {
            BigDecimal saldo = entradas[i].subtract(saidas[i]);
            acumulado = acumulado.add(saldo);
            LocalDate ini = hoje.plusDays(7L * i);
            lista.add(new FluxoSemana(ini, ini.plusDays(6), entradas[i], saidas[i], saldo, acumulado));
            totalEnt = totalEnt.add(entradas[i]);
            totalSai = totalSai.add(saidas[i]);
            if (menor == null || acumulado.compareTo(menor) < 0) {
                menor = acumulado;
                semanaMenor = ini;
            }
        }
        return new FluxoCaixa(hoje, inicial, receberAtrasado, pagarAtrasado, incluirReceberAtrasado, lista,
                totalEnt, totalSai, acumulado, menor, semanaMenor, historico(u.empresaId(), hoje));
    }

    /** Saldo em aberto por semana a partir de hoje. Vencidos caem na semana 0 quando {@code comAtrasados}. */
    private BigDecimal[] porSemana(String tabela, Long empresaId, Date hoje, int n, boolean comAtrasados) {
        BigDecimal[] saida = new BigDecimal[n];
        java.util.Arrays.fill(saida, BigDecimal.ZERO.setScale(2));
        // tabela vem de constante interna (nunca de entrada do usuário)
        jdbc.query("SELECT GREATEST(0, (data_vencimento - ?::date) / 7) AS sem, SUM(valor - valor_pago) AS valor"
                        + " FROM " + tabela
                        + " WHERE empresa_id = ? AND status IN ('ABERTO', 'PARCIAL')"
                        + " AND data_vencimento < ?::date + ? AND (data_vencimento >= ?::date OR ?)"
                        + " GROUP BY 1",
                rs -> {
                    int sem = rs.getInt("sem");
                    if (sem >= 0 && sem < n) {
                        saida[sem] = dinheiro(rs.getBigDecimal("valor"));
                    }
                },
                hoje, empresaId, hoje, 7 * n, hoje, comAtrasados);
        return saida;
    }

    private BigDecimal atrasado(String tabela, Long empresaId, Date hoje) {
        BigDecimal v = jdbc.queryForObject("SELECT COALESCE(SUM(valor - valor_pago), 0) FROM " + tabela
                + " WHERE empresa_id = ? AND status IN ('ABERTO', 'PARCIAL') AND data_vencimento < ?",
                BigDecimal.class, empresaId, hoje);
        return dinheiro(v);
    }

    private List<FluxoHistorico> historico(Long empresaId, LocalDate hoje) {
        YearMonth atual = YearMonth.from(hoje);
        Date desde = Date.valueOf(atual.minusMonths(5).atDay(1));
        Map<String, BigDecimal> recebido = new HashMap<>();
        Map<String, BigDecimal> pago = new HashMap<>();
        jdbc.query("SELECT to_char(data_baixa, 'YYYY-MM') AS mes, SUM(valor) AS valor FROM baixa_receber"
                        + " WHERE empresa_id = ? AND data_baixa >= ? GROUP BY 1",
                rs -> {
                    recebido.put(rs.getString("mes"), rs.getBigDecimal("valor"));
                }, empresaId, desde);
        jdbc.query("SELECT to_char(data_pagamento, 'YYYY-MM') AS mes, SUM(valor) AS valor FROM baixa_pagar"
                        + " WHERE empresa_id = ? AND data_pagamento >= ? GROUP BY 1",
                rs -> {
                    pago.put(rs.getString("mes"), rs.getBigDecimal("valor"));
                }, empresaId, desde);
        List<FluxoHistorico> out = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            String mes = atual.minusMonths(i).toString(); // yyyy-MM
            out.add(new FluxoHistorico(mes, dinheiro(recebido.get(mes)), dinheiro(pago.get(mes))));
        }
        return out;
    }

    // ------------------------------------------------------------------ DRE gerencial

    /**
     * Regime de competência. Receita = notas faturadas; CMV = compras de mercadoria (contas a pagar da categoria
     * MERCADORIA, por data de emissão); custos variáveis e fixos = lançamentos de custo. As demais categorias de
     * contas a pagar são só o fluxo de caixa dessas despesas e não entram aqui, para não contar duas vezes.
     */
    @Transactional(readOnly = true)
    public Dre dre(Integer anoParam) {
        UsuarioLogado u = UsuarioLogado.atual();
        int ano = anoParam == null ? LocalDate.now(FUSO).getYear() : anoParam;
        if (ano < 2000 || ano > 2100) {
            throw new IllegalArgumentException("Ano inválido: " + ano);
        }
        Date ini = Date.valueOf(LocalDate.of(ano, 1, 1));
        Date fim = Date.valueOf(LocalDate.of(ano + 1, 1, 1));

        BigDecimal[] receita = zeros();
        BigDecimal[] cmv = zeros();
        BigDecimal[] variaveis = zeros();
        BigDecimal[] fixos = zeros();
        mensal(receita, "SELECT EXTRACT(MONTH FROM data_faturamento)::int AS m, SUM(valor_total) AS v FROM faturamento"
                + " WHERE empresa_id = ? AND data_faturamento >= ? AND data_faturamento < ? GROUP BY 1", u.empresaId(), ini, fim);
        mensal(cmv, "SELECT EXTRACT(MONTH FROM data_emissao)::int AS m, SUM(valor) AS v FROM conta_pagar"
                + " WHERE empresa_id = ? AND categoria = 'MERCADORIA' AND status <> 'CANCELADO'"
                + " AND data_emissao >= ? AND data_emissao < ? GROUP BY 1", u.empresaId(), ini, fim);
        mensal(variaveis, "SELECT EXTRACT(MONTH FROM data_lancamento)::int AS m, SUM(valor) AS v FROM custo"
                + " WHERE empresa_id = ? AND tipo = 'VARIAVEL' AND data_lancamento >= ? AND data_lancamento < ? GROUP BY 1",
                u.empresaId(), ini, fim);
        mensal(fixos, "SELECT EXTRACT(MONTH FROM data_lancamento)::int AS m, SUM(valor) AS v FROM custo"
                + " WHERE empresa_id = ? AND tipo = 'FIXO' AND data_lancamento >= ? AND data_lancamento < ? GROUP BY 1",
                u.empresaId(), ini, fim);

        List<DreMes> meses = new ArrayList<>();
        BigDecimal tR = BigDecimal.ZERO, tC = BigDecimal.ZERO, tV = BigDecimal.ZERO, tF = BigDecimal.ZERO;
        for (int m = 0; m < 12; m++) {
            meses.add(linha(m + 1, receita[m], cmv[m], variaveis[m], fixos[m]));
            tR = tR.add(receita[m]);
            tC = tC.add(cmv[m]);
            tV = tV.add(variaveis[m]);
            tF = tF.add(fixos[m]);
        }

        List<DreCategoria> categorias = new ArrayList<>();
        categorias.add(new DreCategoria("CMV", "Compras de mercadoria", dinheiro(tC)));
        jdbc.query("SELECT tipo, categoria, SUM(valor) AS v FROM custo WHERE empresa_id = ?"
                        + " AND data_lancamento >= ? AND data_lancamento < ? GROUP BY tipo, categoria ORDER BY tipo DESC, v DESC",
                rs -> {
                    categorias.add(new DreCategoria(rs.getString("tipo"), rs.getString("categoria"), dinheiro(rs.getBigDecimal("v"))));
                }, u.empresaId(), ini, fim);

        return new Dre(ano, meses, linha(0, tR, tC, tV, tF), categorias);
    }

    private static DreMes linha(int mes, BigDecimal receita, BigDecimal cmv, BigDecimal variaveis, BigDecimal fixos) {
        BigDecimal margemBruta = receita.subtract(cmv);
        BigDecimal contribuicao = margemBruta.subtract(variaveis);
        BigDecimal resultado = contribuicao.subtract(fixos);
        return new DreMes(mes, dinheiro(receita), dinheiro(cmv), dinheiro(margemBruta), dinheiro(variaveis),
                dinheiro(contribuicao), dinheiro(fixos), dinheiro(resultado),
                pct(margemBruta, receita), pct(contribuicao, receita), pct(resultado, receita));
    }

    private void mensal(BigDecimal[] destino, String sql, Object... args) {
        jdbc.query(sql, rs -> {
            int m = rs.getInt("m");
            if (m >= 1 && m <= 12) {
                destino[m - 1] = dinheiro(rs.getBigDecimal("v"));
            }
        }, args);
    }

    private static BigDecimal[] zeros() {
        BigDecimal[] a = new BigDecimal[12];
        java.util.Arrays.fill(a, BigDecimal.ZERO.setScale(2));
        return a;
    }

    private static BigDecimal pct(BigDecimal parte, BigDecimal base) {
        return base.signum() == 0 ? null : parte.multiply(CEM).divide(base, 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal dinheiro(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }
}
