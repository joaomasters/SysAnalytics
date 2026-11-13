package com.sysanalytics.crm.service;

import com.sysanalytics.crm.domain.*;
import com.sysanalytics.crm.repository.OportunidadeRepository;
import com.sysanalytics.crm.repository.UsuarioRepository;
import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.OportunidadeDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Funil de vendas. Vendedor enxerga e altera só as oportunidades em que é responsável;
 * gestor e admin enxergam as da empresa toda. Fora do escopo, responde 404.
 */
@Service
@RequiredArgsConstructor
public class OportunidadeService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo"); // mesmo fuso do application.yml

    private static final String SELECT = """
            SELECT o.id, o.cliente_id, c.nome_fantasia AS cliente_nome,
                   o.responsavel_id, u.nome AS responsavel_nome,
                   o.titulo, o.descricao, o.valor_estimado, o.probabilidade, o.etapa,
                   o.data_prevista_fechamento, o.motivo_perda, o.fechada_em, o.criada_em
              FROM oportunidade o
              JOIN cliente c ON c.id = o.cliente_id
              JOIN usuario u ON u.id = o.responsavel_id
            """;

    /** Parâmetros: empresa, situacao x2, responsavel (ou NULL) x2, cliente (ou NULL) x2. */
    private static final String LISTAR = SELECT + """
             WHERE o.empresa_id = ?
               AND CASE WHEN ? = 'ABERTA' THEN o.etapa NOT IN ('GANHA', 'PERDIDA') ELSE o.etapa = ? END
               AND (CAST(? AS bigint) IS NULL OR o.responsavel_id = CAST(? AS bigint))
               AND (CAST(? AS bigint) IS NULL OR o.cliente_id = CAST(? AS bigint))
             ORDER BY o.fechada_em DESC NULLS LAST, o.data_prevista_fechamento ASC NULLS LAST,
                      o.valor_estimado DESC, o.id
             LIMIT 300
            """;

    private static final String POR_ID = SELECT + " WHERE o.empresa_id = ? AND o.id = ?";

    /** Parâmetros: empresa, responsavel (ou NULL) x2. Só etapas abertas. */
    private static final String RESUMO_ABERTAS = """
            SELECT o.etapa,
                   COUNT(*)                                           AS quantidade,
                   COALESCE(SUM(o.valor_estimado), 0)                 AS valor,
                   COALESCE(SUM(o.valor_estimado * o.probabilidade / 100.0), 0) AS ponderado
              FROM oportunidade o
             WHERE o.empresa_id = ?
               AND (CAST(? AS bigint) IS NULL OR o.responsavel_id = CAST(? AS bigint))
               AND o.etapa NOT IN ('GANHA', 'PERDIDA')
             GROUP BY o.etapa
            """;

    /** Parâmetros: inicioMes x2, inicio90 x2, empresa, responsavel (ou NULL) x2. */
    private static final String RESUMO_ENCERRADAS = """
            SELECT COUNT(*) FILTER (WHERE o.etapa = 'GANHA' AND o.fechada_em >= ?) AS ganhas_mes,
                   COALESCE(SUM(o.valor_estimado) FILTER (WHERE o.etapa = 'GANHA' AND o.fechada_em >= ?), 0) AS valor_ganho_mes,
                   COUNT(*) FILTER (WHERE o.etapa = 'GANHA' AND o.fechada_em >= ?)   AS ganhas_90,
                   COUNT(*) FILTER (WHERE o.etapa = 'PERDIDA' AND o.fechada_em >= ?) AS perdidas_90
              FROM oportunidade o
             WHERE o.empresa_id = ?
               AND (CAST(? AS bigint) IS NULL OR o.responsavel_id = CAST(? AS bigint))
            """;

    private static final RowMapper<OportunidadeResponse> MAPPER = (rs, i) -> {
        EtapaOportunidade etapa = EtapaOportunidade.valueOf(rs.getString("etapa"));
        var prevista = rs.getDate("data_prevista_fechamento");
        LocalDate dataPrevista = prevista == null ? null : prevista.toLocalDate();
        String motivo = rs.getString("motivo_perda");
        return new OportunidadeResponse(
                rs.getLong("id"),
                rs.getLong("cliente_id"),
                rs.getString("cliente_nome"),
                rs.getLong("responsavel_id"),
                rs.getString("responsavel_nome"),
                rs.getString("titulo"),
                rs.getString("descricao"),
                rs.getBigDecimal("valor_estimado").setScale(2, RoundingMode.HALF_UP),
                rs.getInt("probabilidade"),
                etapa,
                dataPrevista,
                !etapa.encerrada() && dataPrevista != null && dataPrevista.isBefore(LocalDate.now()),
                motivo == null ? null : MotivoPerda.valueOf(motivo),
                rs.getObject("fechada_em", OffsetDateTime.class),
                rs.getObject("criada_em", OffsetDateTime.class));
    };

    private final JdbcTemplate jdbcTemplate;
    private final OportunidadeRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final ClienteAcesso clienteAcesso;
    private final OportunidadeAcesso oportunidadeAcesso;

    @Transactional(readOnly = true)
    public List<OportunidadeResponse> listar(SituacaoOportunidade situacao, boolean somenteMinhas, Long clienteId) {
        UsuarioLogado u = UsuarioLogado.atual();
        Long responsavel = escopoResponsavel(u, somenteMinhas);
        return jdbcTemplate.query(LISTAR, MAPPER, u.empresaId(), situacao.name(), situacao.name(),
                responsavel, responsavel, clienteId, clienteId);
    }

    @Transactional(readOnly = true)
    public OportunidadeResponse obter(Long id) {
        UsuarioLogado u = UsuarioLogado.atual();
        oportunidadeAcesso.exigir(u, id);
        return resposta(u.empresaId(), id);
    }

    @Transactional
    public OportunidadeResponse criar(OportunidadeRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        clienteAcesso.exigir(u, req.clienteId());
        Long responsavelId = resolverResponsavel(u, req.responsavelId(), u.usuarioId());
        OffsetDateTime agora = OffsetDateTime.now();
        Oportunidade o = repository.save(Oportunidade.builder()
                .empresaId(u.empresaId())
                .clienteId(req.clienteId())
                .responsavelId(responsavelId)
                .criadaPorId(u.usuarioId())
                .titulo(req.titulo().trim())
                .descricao(limpar(req.descricao()))
                .valorEstimado(req.valorEstimado())
                .etapa(EtapaOportunidade.PROSPECCAO)
                .probabilidade(EtapaOportunidade.PROSPECCAO.getProbabilidadePadrao())
                .dataPrevistaFechamento(req.dataPrevistaFechamento())
                .criadaEm(agora)
                .atualizadaEm(agora)
                .build());
        return resposta(u.empresaId(), o.getId());
    }

    @Transactional
    public OportunidadeResponse atualizar(Long id, OportunidadeEdicao req) {
        UsuarioLogado u = UsuarioLogado.atual();
        Oportunidade o = aberta(u, id);
        o.setTitulo(req.titulo().trim());
        o.setDescricao(limpar(req.descricao()));
        o.setValorEstimado(req.valorEstimado());
        o.setDataPrevistaFechamento(req.dataPrevistaFechamento());
        if (req.probabilidade() != null) {
            o.setProbabilidade(req.probabilidade());
        }
        if (req.responsavelId() != null && !req.responsavelId().equals(o.getResponsavelId())) {
            o.setResponsavelId(resolverResponsavel(u, req.responsavelId(), o.getResponsavelId()));
        }
        o.setAtualizadaEm(OffsetDateTime.now());
        repository.flush();
        return resposta(u.empresaId(), id);
    }

    @Transactional
    public OportunidadeResponse mover(Long id, MoverRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        Oportunidade o = aberta(u, id);
        EtapaOportunidade destino = req.etapa();
        OffsetDateTime agora = OffsetDateTime.now();

        switch (destino) {
            case PERDIDA -> {
                if (req.motivoPerda() == null) {
                    throw new IllegalArgumentException("Informe o motivo da perda");
                }
                o.setMotivoPerda(req.motivoPerda());
                o.setProbabilidade(0);
                o.setFechadaEm(agora);
            }
            case GANHA -> {
                o.setProbabilidade(100);
                o.setFechadaEm(agora);
            }
            default -> o.setProbabilidade(req.probabilidade() != null
                    ? req.probabilidade() : destino.getProbabilidadePadrao());
        }
        o.setEtapa(destino);
        o.setAtualizadaEm(agora);
        repository.flush();
        return resposta(u.empresaId(), id);
    }

    @Transactional(readOnly = true)
    public FunilResumoResponse resumo(boolean somenteMinhas) {
        UsuarioLogado u = UsuarioLogado.atual();
        Long responsavel = escopoResponsavel(u, somenteMinhas);

        Map<EtapaOportunidade, EtapaResumo> porEtapa = new EnumMap<>(EtapaOportunidade.class);
        jdbcTemplate.query(RESUMO_ABERTAS, rs -> {
            EtapaOportunidade etapa = EtapaOportunidade.valueOf(rs.getString("etapa"));
            porEtapa.put(etapa, new EtapaResumo(etapa, rs.getLong("quantidade"),
                    dinheiro(rs.getBigDecimal("valor")), dinheiro(rs.getBigDecimal("ponderado"))));
        }, u.empresaId(), responsavel, responsavel);

        List<EtapaResumo> etapas = new ArrayList<>();
        BigDecimal pipeline = BigDecimal.ZERO;
        BigDecimal ponderado = BigDecimal.ZERO;
        for (EtapaOportunidade etapa : EtapaOportunidade.values()) {
            if (etapa.encerrada()) continue;
            EtapaResumo r = porEtapa.getOrDefault(etapa,
                    new EtapaResumo(etapa, 0, dinheiro(BigDecimal.ZERO), dinheiro(BigDecimal.ZERO)));
            etapas.add(r);
            pipeline = pipeline.add(r.valor());
            ponderado = ponderado.add(r.valorPonderado());
        }

        LocalDate hoje = LocalDate.now(FUSO);
        Timestamp inicioMes = Timestamp.from(hoje.withDayOfMonth(1).atStartOfDay(FUSO).toInstant());
        Timestamp inicio90 = Timestamp.from(hoje.minusDays(90).atStartOfDay(FUSO).toInstant());

        record Encerradas(long ganhasMes, BigDecimal valorMes, long ganhas90, long perdidas90) {
        }
        Encerradas e = jdbcTemplate.queryForObject(RESUMO_ENCERRADAS,
                (rs, i) -> new Encerradas(rs.getLong("ganhas_mes"), rs.getBigDecimal("valor_ganho_mes"),
                        rs.getLong("ganhas_90"), rs.getLong("perdidas_90")),
                inicioMes, inicioMes, inicio90, inicio90, u.empresaId(), responsavel, responsavel);

        long fechadas = e.ganhas90() + e.perdidas90();
        BigDecimal conversao = fechadas == 0 ? null
                : BigDecimal.valueOf(e.ganhas90()).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(fechadas), 1, RoundingMode.HALF_UP);

        return new FunilResumoResponse(etapas, dinheiro(pipeline), dinheiro(ponderado),
                e.ganhasMes(), dinheiro(e.valorMes()), conversao);
    }

    // ------------------------------------------------------------------

    /** Vendedor sempre só as suas; gestor/admin escolhem entre as suas e as da empresa toda. */
    private static Long escopoResponsavel(UsuarioLogado u, boolean somenteMinhas) {
        return (u.restritoAoVendedor() || somenteMinhas) ? u.usuarioId() : null;
    }

    private Long resolverResponsavel(UsuarioLogado u, Long pedido, Long padrao) {
        if (pedido == null || pedido.equals(padrao)) {
            return padrao;
        }
        if (u.restritoAoVendedor()) {
            throw new IllegalArgumentException("Vendedor não pode atribuir a oportunidade a outra pessoa");
        }
        return usuarioRepository.findByIdAndEmpresaIdAndAtivoTrue(pedido, u.empresaId())
                .map(Usuario::getId)
                .orElseThrow(() -> new IllegalArgumentException("Responsável não encontrado nesta empresa"));
    }

    private Oportunidade aberta(UsuarioLogado u, Long id) {
        Oportunidade o = repository.findByIdAndEmpresaId(id, u.empresaId())
                .filter(x -> !u.restritoAoVendedor() || x.getResponsavelId().equals(u.usuarioId()))
                .orElseThrow(() -> new NoSuchElementException("Oportunidade não encontrada: " + id));
        if (o.getEtapa().encerrada()) {
            throw new IllegalArgumentException("A oportunidade já foi encerrada (" + o.getEtapa() + ")");
        }
        return o;
    }

    private OportunidadeResponse resposta(Long empresaId, Long id) {
        return jdbcTemplate.query(POR_ID, MAPPER, empresaId, id).stream().findFirst()
                .orElseThrow(() -> new NoSuchElementException("Oportunidade não encontrada: " + id));
    }

    private static BigDecimal dinheiro(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }

    private static String limpar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
