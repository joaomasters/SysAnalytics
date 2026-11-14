package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.Meta;
import com.sysanalytics.crm.domain.SituacaoMeta;
import com.sysanalytics.crm.domain.Vendedor;
import com.sysanalytics.crm.repository.MetaRepository;
import com.sysanalytics.crm.repository.VendedorRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.MetaDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;

/**
 * Metas mensais de faturamento por vendedor, comparadas ao realizado (faturamento do ERP) e à
 * previsão do funil. Gestor/admin veem todos os vendedores; vendedor vê só a própria linha.
 */
@Service
@RequiredArgsConstructor
public class MetaService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo"); // mesmo fuso do application.yml
    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    /** Parâmetros: empresa, início, fim. */
    private static final String REALIZADO = """
            SELECT f.vendedor_id, COALESCE(SUM(f.valor_total), 0) AS valor
              FROM faturamento f
             WHERE f.empresa_id = ? AND f.data_faturamento BETWEEN ? AND ?
             GROUP BY f.vendedor_id
            """;

    /** Parâmetros: empresa, início, fim. O vendedor é o do login responsável pela oportunidade. */
    private static final String PREVISAO = """
            SELECT u.vendedor_id, COALESCE(SUM(o.valor_estimado * o.probabilidade / 100.0), 0) AS valor
              FROM oportunidade o
              JOIN usuario u ON u.id = o.responsavel_id
             WHERE o.empresa_id = ?
               AND o.etapa NOT IN ('GANHA', 'PERDIDA')
               AND o.data_prevista_fechamento BETWEEN ? AND ?
               AND u.vendedor_id IS NOT NULL
             GROUP BY u.vendedor_id
            """;

    private final JdbcTemplate jdbcTemplate;
    private final MetaRepository metaRepository;
    private final VendedorRepository vendedorRepository;

    @Transactional(readOnly = true)
    public MetaMesResponse obter(String mes) {
        UsuarioLogado u = UsuarioLogado.atual();
        return montar(u, parse(mes));
    }

    @Transactional
    public MetaMesResponse salvar(String mes, MetasRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        YearMonth ym = parse(mes);
        LocalDate competencia = ym.atDay(1);

        Set<Long> vendedoresDaEmpresa = new HashSet<>();
        vendedorRepository.findByEmpresaIdOrderByNomeAsc(u.empresaId()).forEach(v -> vendedoresDaEmpresa.add(v.getId()));

        Map<Long, Meta> existentes = new HashMap<>();
        metaRepository.findByEmpresaIdAndCompetencia(u.empresaId(), competencia)
                .forEach(m -> existentes.put(m.getVendedorId(), m));

        Set<Long> vistos = new HashSet<>();
        OffsetDateTime agora = OffsetDateTime.now();
        for (MetaItem item : req.metas()) {
            if (!vistos.add(item.vendedorId())) {
                throw new IllegalArgumentException("Vendedor repetido na lista: " + item.vendedorId());
            }
            if (!vendedoresDaEmpresa.contains(item.vendedorId())) {
                throw new IllegalArgumentException("Vendedor não encontrado nesta empresa: " + item.vendedorId());
            }
            Meta atual = existentes.get(item.vendedorId());
            if (item.valor() == null) {
                if (atual != null) metaRepository.delete(atual);
            } else if (atual != null) {
                atual.setValorMeta(item.valor());
                atual.setAtualizadaPorId(u.usuarioId());
                atual.setAtualizadaEm(agora);
            } else {
                metaRepository.save(Meta.builder()
                        .empresaId(u.empresaId())
                        .vendedorId(item.vendedorId())
                        .competencia(competencia)
                        .valorMeta(item.valor())
                        .atualizadaPorId(u.usuarioId())
                        .atualizadaEm(agora)
                        .build());
            }
        }
        metaRepository.flush();
        return montar(u, ym);
    }

    // ------------------------------------------------------------------

    private MetaMesResponse montar(UsuarioLogado u, YearMonth ym) {
        LocalDate inicio = ym.atDay(1);
        LocalDate fim = ym.atEndOfMonth();
        LocalDate hoje = LocalDate.now(FUSO);
        int diasNoMes = ym.lengthOfMonth();
        int decorridos = YearMonth.from(hoje).equals(ym) ? hoje.getDayOfMonth()
                : ym.isBefore(YearMonth.from(hoje)) ? diasNoMes : 0;

        Long escopo = u.vendedorIdEscopo(); // vendedor: só a própria linha
        List<Vendedor> vendedores = vendedorRepository.findByEmpresaIdOrderByNomeAsc(u.empresaId()).stream()
                .filter(v -> escopo == null || v.getId().equals(escopo))
                .toList();

        Map<Long, BigDecimal> metas = new HashMap<>();
        metaRepository.findByEmpresaIdAndCompetencia(u.empresaId(), inicio)
                .forEach(m -> metas.put(m.getVendedorId(), m.getValorMeta()));
        Map<Long, BigDecimal> realizado = somaPorVendedor(REALIZADO, u.empresaId(), inicio, fim);
        Map<Long, BigDecimal> previsao = somaPorVendedor(PREVISAO, u.empresaId(), inicio, fim);

        List<MetaVendedor> linhas = new ArrayList<>();
        BigDecimal totMeta = BigDecimal.ZERO;
        boolean algumaMeta = false;
        BigDecimal totReal = BigDecimal.ZERO;
        BigDecimal totPrev = BigDecimal.ZERO;
        for (Vendedor v : vendedores) {
            BigDecimal meta = metas.get(v.getId());
            BigDecimal real = dinheiro(realizado.get(v.getId()));
            BigDecimal prev = dinheiro(previsao.get(v.getId()));
            linhas.add(linha(v.getId(), v.getNome(), v.getCarteira(), meta, real, prev, decorridos, diasNoMes, ym, hoje));
            if (meta != null) {
                totMeta = totMeta.add(meta);
                algumaMeta = true;
            }
            totReal = totReal.add(real);
            totPrev = totPrev.add(prev);
        }
        MetaVendedor total = linha(null, "Total", null, algumaMeta ? totMeta : null, totReal, totPrev,
                decorridos, diasNoMes, ym, hoje);
        return new MetaMesResponse(ym.toString(), diasNoMes, decorridos, total, linhas);
    }

    private static MetaVendedor linha(Long id, String nome, String carteira, BigDecimal meta, BigDecimal realizado,
                                      BigDecimal previsao, int decorridos, int diasNoMes, YearMonth ym, LocalDate hoje) {
        boolean temMeta = meta != null;
        boolean metaPositiva = temMeta && meta.signum() > 0;

        BigDecimal atingimento = metaPositiva ? percentual(realizado, meta) : null;
        BigDecimal projetado = metaPositiva ? percentual(realizado.add(previsao), meta) : null;
        BigDecimal ritmo = temMeta
                ? meta.multiply(BigDecimal.valueOf(decorridos)).divide(BigDecimal.valueOf(diasNoMes), 2, RoundingMode.HALF_UP)
                : null;
        BigDecimal falta = temMeta ? meta.subtract(realizado).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP) : null;

        SituacaoMeta situacao;
        if (!temMeta) {
            situacao = SituacaoMeta.SEM_META;
        } else if (realizado.compareTo(meta) >= 0) {
            situacao = SituacaoMeta.ATINGIDA;
        } else if (ym.isAfter(YearMonth.from(hoje))) {
            situacao = SituacaoMeta.PENDENTE;
        } else if (ym.isBefore(YearMonth.from(hoje))) {
            situacao = SituacaoMeta.NAO_ATINGIDA;
        } else {
            situacao = realizado.compareTo(ritmo) >= 0 ? SituacaoMeta.NO_RITMO : SituacaoMeta.ABAIXO_DO_RITMO;
        }
        return new MetaVendedor(id, nome, carteira, meta == null ? null : dinheiro(meta), realizado, atingimento,
                ritmo, falta, previsao, projetado, situacao);
    }

    private Map<Long, BigDecimal> somaPorVendedor(String sql, Long empresaId, LocalDate inicio, LocalDate fim) {
        Map<Long, BigDecimal> mapa = new HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            mapa.put(rs.getLong("vendedor_id"), rs.getBigDecimal("valor"));
        }, empresaId, java.sql.Date.valueOf(inicio), java.sql.Date.valueOf(fim));
        return mapa;
    }

    private static YearMonth parse(String mes) {
        if (mes == null || mes.isBlank()) {
            return YearMonth.now(FUSO);
        }
        try {
            return YearMonth.parse(mes.trim());
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("Mês inválido: use o formato aaaa-MM, por exemplo 2026-11");
        }
    }

    private static BigDecimal percentual(BigDecimal parte, BigDecimal total) {
        return parte.multiply(CEM).divide(total, 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal dinheiro(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }
}
