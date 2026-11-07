package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.NivelRisco;
import com.sysanalytics.crm.repository.ConsultasAnaliticas;
import com.sysanalytics.crm.web.dto.KpiDashboardResponse;
import com.sysanalytics.crm.web.dto.KpiDashboardResponse.PontoSerie;
import com.sysanalytics.crm.web.dto.KpiDashboardResponse.Resumo;
import com.sysanalytics.crm.web.dto.KpiDashboardResponse.TicketVendedor;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Agregações temporais e KPIs financeiros (faturamento, custos, margem, fluxo de caixa, ticket médio). */
@Service
@RequiredArgsConstructor
public class KpiService {

    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    private final JdbcTemplate jdbcTemplate;
    private final ClienteAnaliticoService clienteAnaliticoService;

    private record FatPeriodo(BigDecimal total, long notas) {
    }

    private record CustoPeriodo(BigDecimal total, BigDecimal fixos, BigDecimal variaveis) {
    }

    public KpiDashboardResponse calcular(Granularidade granularidade, LocalDate inicio, LocalDate fim) {
        LocalDate dataFim = fim != null ? fim : LocalDate.now();
        LocalDate dataInicio = granularidade.inicioDoPeriodo(
                inicio != null ? inicio : granularidade.inicioPadrao(dataFim));
        if (dataInicio.isAfter(dataFim)) {
            throw new IllegalArgumentException("A data de início deve ser anterior à data de fim");
        }

        Map<LocalDate, FatPeriodo> faturamento = faturamentoPorPeriodo(granularidade, dataInicio, dataFim);
        Map<LocalDate, CustoPeriodo> custos = custosPorPeriodo(granularidade, dataInicio, dataFim);

        // Série contínua (períodos sem movimento aparecem com zero)
        List<PontoSerie> serie = new ArrayList<>();
        BigDecimal fatTotal = BigDecimal.ZERO, custoTotal = BigDecimal.ZERO,
                custoFixo = BigDecimal.ZERO, custoVariavel = BigDecimal.ZERO, acumulado = BigDecimal.ZERO;
        long notasTotal = 0;

        for (LocalDate p = dataInicio; !p.isAfter(dataFim); p = granularidade.proximoPeriodo(p)) {
            FatPeriodo f = faturamento.getOrDefault(p, new FatPeriodo(BigDecimal.ZERO, 0));
            CustoPeriodo c = custos.getOrDefault(p, new CustoPeriodo(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
            BigDecimal saldo = f.total().subtract(c.total());
            acumulado = acumulado.add(saldo);

            serie.add(new PontoSerie(p, granularidade.rotulo(p),
                    money(f.total()), money(c.total()), money(c.fixos()), money(c.variaveis()),
                    money(saldo), money(acumulado), percentual(saldo, f.total()), f.notas()));

            fatTotal = fatTotal.add(f.total());
            custoTotal = custoTotal.add(c.total());
            custoFixo = custoFixo.add(c.fixos());
            custoVariavel = custoVariavel.add(c.variaveis());
            notasTotal += f.notas();
        }

        Map<NivelRisco, Long> porNivel = clienteAnaliticoService.contagemPorNivel();
        long totalClientes = porNivel.values().stream().mapToLong(Long::longValue).sum();
        long emRisco = totalClientes - porNivel.getOrDefault(NivelRisco.SEM_RISCO, 0L);
        BigDecimal saldoTotal = fatTotal.subtract(custoTotal);

        Resumo resumo = new Resumo(
                money(fatTotal), money(custoTotal), money(custoFixo), money(custoVariavel),
                money(saldoTotal), percentual(saldoTotal, fatTotal),
                notasTotal == 0 ? money(BigDecimal.ZERO) : fatTotal.divide(BigDecimal.valueOf(notasTotal), 2, RoundingMode.HALF_UP),
                notasTotal, totalClientes, emRisco, porNivel);

        return new KpiDashboardResponse(granularidade, dataInicio, dataFim, resumo, serie,
                ticketPorVendedor(dataInicio, dataFim));
    }

    private Map<LocalDate, FatPeriodo> faturamentoPorPeriodo(Granularidade g, LocalDate inicio, LocalDate fim) {
        String sql = ConsultasAnaliticas.FATURAMENTO_POR_PERIODO.formatted(g.expressaoSql("f.data_faturamento"));
        Map<LocalDate, FatPeriodo> mapa = new HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            mapa.put(rs.getDate("periodo").toLocalDate(),
                    new FatPeriodo(rs.getBigDecimal("total"), rs.getLong("notas")));
        }, inicio, fim);
        return mapa;
    }

    private Map<LocalDate, CustoPeriodo> custosPorPeriodo(Granularidade g, LocalDate inicio, LocalDate fim) {
        String sql = ConsultasAnaliticas.CUSTOS_POR_PERIODO.formatted(g.expressaoSql("c.data_lancamento"));
        Map<LocalDate, CustoPeriodo> mapa = new HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            mapa.put(rs.getDate("periodo").toLocalDate(),
                    new CustoPeriodo(rs.getBigDecimal("total"), rs.getBigDecimal("fixos"), rs.getBigDecimal("variaveis")));
        }, inicio, fim);
        return mapa;
    }

    private List<TicketVendedor> ticketPorVendedor(LocalDate inicio, LocalDate fim) {
        return jdbcTemplate.query(ConsultasAnaliticas.TICKET_POR_VENDEDOR, (rs, i) -> new TicketVendedor(
                rs.getLong("vendedor_id"),
                rs.getString("vendedor_nome"),
                rs.getString("carteira"),
                rs.getLong("total_notas"),
                rs.getLong("clientes_atendidos"),
                money(rs.getBigDecimal("faturamento")),
                money(rs.getBigDecimal("ticket_medio"))
        ), inicio, fim);
    }

    private static BigDecimal money(BigDecimal valor) {
        return (valor == null ? BigDecimal.ZERO : valor).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal percentual(BigDecimal parte, BigDecimal total) {
        if (total == null || total.signum() == 0) return BigDecimal.ZERO.setScale(2);
        return parte.multiply(CEM).divide(total, 2, RoundingMode.HALF_UP);
    }
}
