package com.sysanalytics.crm.service;

import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.LogisticaDtos.*;
import com.sysanalytics.crm.web.dto.PaginaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;

/**
 * Follow-up de cargas de entrada (compras) e de saída (entregas a clientes). Gestor/admin lançam e atualizam;
 * o vendedor só acompanha as cargas de saída dos clientes da própria carteira (sem ver o frete).
 */
@Service
@RequiredArgsConstructor
public class LogisticaService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo"); // mesmo fuso do application.yml
    private static final Set<String> SENTIDOS = Set.of("ENTRADA", "SAIDA");
    private static final Set<String> CATEGORIAS = Set.of("AVARIA", "ATRASO", "EXTRAVIO", "RECUSA", "ENDERECO", "DOCUMENTO", "OUTRO");
    private static final Set<String> TIPOS_MANUAIS = Set.of("EMBARCADA", "ATUALIZACAO", "OCORRENCIA", "ENTREGUE", "OBSERVACAO");
    private static final String ATIVA = "c.status IN ('AGUARDANDO', 'EM_TRANSITO')";
    private static final String OCORRENCIA_ABERTA =
            "EXISTS (SELECT 1 FROM carga_evento e WHERE e.carga_id = c.id AND e.tipo = 'OCORRENCIA' AND NOT e.resolvida)";

    private static final String FROM_CARGA = """
              FROM carga c
              LEFT JOIN transportadora t ON t.id = c.transportadora_id
              LEFT JOIN cliente cl ON cl.id = c.cliente_id
              LEFT JOIN fornecedor f ON f.id = c.fornecedor_id
            """;

    private static final String SELECT_CARGA = """
            SELECT c.id, c.sentido, c.codigo, c.status, c.transportadora_id, t.nome AS transportadora_nome,
                   COALESCE(c.cliente_id, c.fornecedor_id) AS parceiro_id, COALESCE(cl.nome_fantasia, f.nome) AS parceiro_nome,
                   c.numero_documento, c.origem, c.destino, c.codigo_rastreio, c.data_embarque, c.previsao_entrega,
                   c.data_entrega, c.peso_kg, c.volumes, c.valor_mercadoria, c.valor_frete, c.observacao,
                   (SELECT COUNT(*) FROM carga_evento e WHERE e.carga_id = c.id AND e.tipo = 'OCORRENCIA' AND NOT e.resolvida) AS ocorrencias_abertas
            """ + FROM_CARGA;

    /** Empresa + escopo: vendedor só enxerga SAÍDA de clientes da própria carteira. */
    private static final String ESCOPO = " WHERE c.empresa_id = :empresa AND (CAST(:vend AS bigint) IS NULL "
            + "OR (c.sentido = 'SAIDA' AND cl.vendedor_id = CAST(:vend AS bigint)))";

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    // ------------------------------------------------------------------ transportadoras (gestor/admin)

    @Transactional(readOnly = true)
    public List<TransportadoraResponse> transportadoras(String busca, boolean incluirInativos) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        String termo = "%" + (busca == null ? "" : busca.trim().toLowerCase(Locale.ROOT)) + "%";
        return named.query("""
                        SELECT t.id, t.nome, t.documento, t.contato, t.email, t.telefone, t.ativo,
                               COUNT(c.id) FILTER (WHERE c.status IN ('AGUARDANDO', 'EM_TRANSITO')) AS ativas,
                               COUNT(c.id) FILTER (WHERE c.status = 'ENTREGUE' AND c.data_entrega >= :d90) AS entregues,
                               COUNT(c.id) FILTER (WHERE c.status = 'ENTREGUE' AND c.data_entrega >= :d90
                                                     AND c.data_entrega <= c.previsao_entrega) AS no_prazo,
                               COALESCE(SUM(oc.n) FILTER (WHERE c.status <> 'CANCELADA'
                                                            AND COALESCE(c.data_embarque, c.criada_em::date) >= :d90), 0) AS ocorrencias,
                               COALESCE(SUM(c.valor_frete) FILTER (WHERE c.status <> 'CANCELADA'
                                                            AND COALESCE(c.data_embarque, c.criada_em::date) >= :d90), 0) AS frete
                          FROM transportadora t
                          LEFT JOIN carga c ON c.transportadora_id = t.id
                          LEFT JOIN LATERAL (SELECT COUNT(*) AS n FROM carga_evento e
                                              WHERE e.carga_id = c.id AND e.tipo = 'OCORRENCIA') oc ON TRUE
                         WHERE t.empresa_id = :empresa AND (:todos OR t.ativo)
                           AND (LOWER(t.nome) LIKE :termo OR LOWER(COALESCE(t.documento, '')) LIKE :termo)
                         GROUP BY t.id ORDER BY t.nome
                        """,
                new MapSqlParameterSource("d90", Date.valueOf(hoje.minusDays(90))).addValue("empresa", u.empresaId())
                        .addValue("todos", incluirInativos).addValue("termo", termo),
                (rs, i) -> {
                    long entregues = rs.getLong("entregues");
                    return new TransportadoraResponse(rs.getLong("id"), rs.getString("nome"), rs.getString("documento"),
                            rs.getString("contato"), rs.getString("email"), rs.getString("telefone"), rs.getBoolean("ativo"),
                            rs.getLong("ativas"), entregues, pct(rs.getLong("no_prazo"), entregues), rs.getLong("ocorrencias"),
                            dinheiro(rs.getBigDecimal("frete")));
                });
    }

    @Transactional
    public TransportadoraResponse salvarTransportadora(Long id, TransportadoraRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        String documento = limpar(req.documento());
        if (documento != null) {
            Integer n = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM transportadora WHERE empresa_id = ? AND documento = ? AND (? IS NULL OR id <> ?)",
                    Integer.class, u.empresaId(), documento, id, id);
            if (n != null && n > 0) {
                throw new IllegalArgumentException("Já existe transportadora com o documento " + documento);
            }
        }
        Long salvoId = id;
        if (id == null) {
            salvoId = jdbc.queryForObject("""
                            INSERT INTO transportadora (empresa_id, nome, documento, contato, email, telefone, ativo)
                            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
                            """, Long.class, u.empresaId(), req.nome().trim(), documento, limpar(req.contato()),
                    limpar(req.email()), limpar(req.telefone()), req.ativo() == null || req.ativo());
        } else {
            int n = jdbc.update("""
                            UPDATE transportadora SET nome = ?, documento = ?, contato = ?, email = ?, telefone = ?,
                                                      ativo = COALESCE(?, ativo)
                             WHERE id = ? AND empresa_id = ?
                            """, req.nome().trim(), documento, limpar(req.contato()), limpar(req.email()),
                    limpar(req.telefone()), req.ativo(), id, u.empresaId());
            if (n == 0) {
                throw new NoSuchElementException("Transportadora não encontrada: " + id);
            }
        }
        final Long alvo = salvoId;
        return transportadoras(null, true).stream().filter(t -> t.id().equals(alvo)).findFirst()
                .orElseThrow(() -> new NoSuchElementException("Transportadora não encontrada: " + alvo));
    }

    // ------------------------------------------------------------------ consultas de cargas

    @Transactional(readOnly = true)
    public PaginaResponse<CargaResumo> listar(String sentido, String situacao, Long clienteId, Long transportadoraId,
                                              String busca, int pagina, int tamanho) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        int tam = Math.min(Math.max(tamanho, 1), 100);
        int pag = Math.max(pagina, 0);

        MapSqlParameterSource p = escopo(u);
        StringBuilder where = new StringBuilder(ESCOPO);
        if (sentido != null && !sentido.isBlank()) {
            where.append(" AND c.sentido = :sentido");
            p.addValue("sentido", sentidoValido(sentido));
        }
        if (clienteId != null) {
            where.append(" AND c.cliente_id = :cliente");
            p.addValue("cliente", clienteId);
        }
        if (transportadoraId != null) {
            where.append(" AND c.transportadora_id = :transp");
            p.addValue("transp", transportadoraId);
        }
        if (busca != null && !busca.isBlank()) {
            where.append(" AND (LOWER(c.codigo) LIKE :busca OR LOWER(COALESCE(c.numero_documento, '')) LIKE :busca"
                    + " OR LOWER(COALESCE(c.codigo_rastreio, '')) LIKE :busca OR LOWER(COALESCE(cl.nome_fantasia, f.nome, '')) LIKE :busca)");
            p.addValue("busca", "%" + busca.trim().toLowerCase(Locale.ROOT) + "%");
        }
        String sit = situacao == null || situacao.isBlank() ? "TODAS" : situacao.trim().toUpperCase(Locale.ROOT);
        switch (sit) {
            case "TODAS" -> {
            }
            case "ATIVAS" -> where.append(" AND ").append(ATIVA);
            case "ATRASADAS" -> {
                where.append(" AND ").append(ATIVA).append(" AND c.previsao_entrega < :hoje");
                p.addValue("hoje", Date.valueOf(hoje));
            }
            case "COM_OCORRENCIA" -> where.append(" AND ").append(ATIVA).append(" AND ").append(OCORRENCIA_ABERTA);
            case "ENTREGUES" -> where.append(" AND c.status = 'ENTREGUE'");
            case "CANCELADAS" -> where.append(" AND c.status = 'CANCELADA'");
            default -> throw new IllegalArgumentException("Situação inválida: " + situacao);
        }

        Long total = named.queryForObject("SELECT COUNT(*)" + FROM_CARGA + where, p, Long.class);
        String ordem = sit.equals("ENTREGUES") || sit.equals("CANCELADAS")
                ? " ORDER BY COALESCE(c.data_entrega, c.previsao_entrega) DESC, c.id DESC"
                : " ORDER BY c.previsao_entrega ASC, c.id ASC";
        p.addValue("limite", tam).addValue("deslocamento", (long) pag * tam);
        boolean oculta = u.restritoAoVendedor();
        List<CargaResumo> itens = named.query(SELECT_CARGA + where + ordem + " LIMIT :limite OFFSET :deslocamento", p,
                (rs, i) -> mapear(rs, hoje, oculta));

        long totalElementos = total == null ? 0 : total;
        return new PaginaResponse<>(itens, pag, tam, totalElementos, (int) Math.ceil(totalElementos / (double) tam));
    }

    @Transactional(readOnly = true)
    public CargaDetalhe detalhe(Long id) {
        return montarDetalhe(UsuarioLogado.atual(), id);
    }

    @Transactional(readOnly = true)
    public ResumoCargas resumo(String sentido) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        MapSqlParameterSource p = escopo(u)
                .addValue("hoje", Date.valueOf(hoje))
                .addValue("mes", Date.valueOf(hoje.withDayOfMonth(1)))
                .addValue("d90", Date.valueOf(hoje.minusDays(90)));
        String filtro = ESCOPO;
        if (sentido != null && !sentido.isBlank()) {
            filtro += " AND c.sentido = :sentido";
            p.addValue("sentido", sentidoValido(sentido));
        }

        record Totais(long aguardando, long emTransito, long atrasadas, long comOcorrencia, long entreguesMes,
                      long entregues90, long noPrazo90, BigDecimal prazoMedio, BigDecimal freteMes, BigDecimal mercadoriaMes) {
        }
        Totais t = named.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE c.status = 'AGUARDANDO') AS aguardando,
                       COUNT(*) FILTER (WHERE c.status = 'EM_TRANSITO') AS em_transito,
                       COUNT(*) FILTER (WHERE c.status IN ('AGUARDANDO', 'EM_TRANSITO') AND c.previsao_entrega < :hoje) AS atrasadas,
                       COUNT(*) FILTER (WHERE c.status IN ('AGUARDANDO', 'EM_TRANSITO') AND EXISTS (
                            SELECT 1 FROM carga_evento e WHERE e.carga_id = c.id AND e.tipo = 'OCORRENCIA' AND NOT e.resolvida)) AS com_ocorrencia,
                       COUNT(*) FILTER (WHERE c.status = 'ENTREGUE' AND c.data_entrega >= :mes) AS entregues_mes,
                       COUNT(*) FILTER (WHERE c.status = 'ENTREGUE' AND c.data_entrega >= :d90) AS entregues_90,
                       COUNT(*) FILTER (WHERE c.status = 'ENTREGUE' AND c.data_entrega >= :d90
                                          AND c.data_entrega <= c.previsao_entrega) AS no_prazo_90,
                       AVG(c.data_entrega - c.data_embarque) FILTER (WHERE c.status = 'ENTREGUE' AND c.data_entrega >= :d90
                                                                       AND c.data_embarque IS NOT NULL) AS prazo_medio,
                       COALESCE(SUM(c.valor_frete) FILTER (WHERE c.status <> 'CANCELADA'
                                    AND COALESCE(c.data_embarque, c.criada_em::date) >= :mes), 0) AS frete_mes,
                       COALESCE(SUM(c.valor_mercadoria) FILTER (WHERE c.status <> 'CANCELADA' AND c.valor_frete IS NOT NULL
                                    AND COALESCE(c.data_embarque, c.criada_em::date) >= :mes), 0) AS mercadoria_mes
                """ + FROM_CARGA + filtro, p,
                (rs, i) -> new Totais(rs.getLong("aguardando"), rs.getLong("em_transito"), rs.getLong("atrasadas"),
                        rs.getLong("com_ocorrencia"), rs.getLong("entregues_mes"), rs.getLong("entregues_90"),
                        rs.getLong("no_prazo_90"), rs.getBigDecimal("prazo_medio"), rs.getBigDecimal("frete_mes"),
                        rs.getBigDecimal("mercadoria_mes")));

        List<OcorrenciaCategoria> ocorrencias = named.query("""
                        SELECT e.categoria, COUNT(*) AS total, COUNT(*) FILTER (WHERE NOT e.resolvida) AS abertas
                          FROM carga_evento e JOIN carga c ON c.id = e.carga_id
                          LEFT JOIN cliente cl ON cl.id = c.cliente_id
                        """ + filtro + " AND e.tipo = 'OCORRENCIA' AND e.ocorrido_em >= :d90 GROUP BY e.categoria ORDER BY total DESC", p,
                (rs, i) -> new OcorrenciaCategoria(rs.getString("categoria"), rs.getLong("total"), rs.getLong("abertas")));

        boolean gestao = !u.restritoAoVendedor();
        List<RankingTransportadora> ranking = gestao
                ? transportadoras(null, false).stream().filter(x -> x.entregues90d() > 0)
                .sorted((a, b) -> Long.compare(b.entregues90d(), a.entregues90d())).limit(6)
                .map(x -> new RankingTransportadora(x.id(), x.nome(), x.entregues90d(), x.pontualidadePct90d(), x.ocorrencias90d()))
                .toList()
                : List.of();

        return new ResumoCargas(t.aguardando(), t.emTransito(), t.atrasadas(), t.comOcorrencia(), t.entreguesMes(),
                pct(t.noPrazo90(), t.entregues90()),
                t.prazoMedio() == null ? null : t.prazoMedio().setScale(1, RoundingMode.HALF_UP),
                gestao ? dinheiro(t.freteMes()) : null,
                gestao && t.mercadoriaMes().signum() > 0
                        ? t.freteMes().multiply(BigDecimal.valueOf(100)).divide(t.mercadoriaMes(), 1, RoundingMode.HALF_UP) : null,
                ranking, ocorrencias);
    }

    // ------------------------------------------------------------------ lançamentos (gestor/admin)

    @Transactional
    public CargaDetalhe criar(CargaRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        String sentido = sentidoValido(req.sentido());
        if (sentido.equals("SAIDA") && req.clienteId() == null) {
            throw new IllegalArgumentException("Informe o cliente da carga de saída");
        }
        if (sentido.equals("ENTRADA") && req.fornecedorId() == null) {
            throw new IllegalArgumentException("Informe o fornecedor da carga de entrada");
        }
        if (sentido.equals("SAIDA")) {
            existe("SELECT COUNT(*) FROM cliente WHERE id = ? AND empresa_id = ?", req.clienteId(), u.empresaId(), "Cliente não encontrado");
        } else {
            existe("SELECT COUNT(*) FROM fornecedor WHERE id = ? AND empresa_id = ?", req.fornecedorId(), u.empresaId(), "Fornecedor não encontrado");
        }
        validarTransportadora(u, req.transportadoraId());

        Long id = jdbc.queryForObject("""
                        INSERT INTO carga (empresa_id, sentido, codigo, status, transportadora_id, fornecedor_id, cliente_id, numero_documento,
                                           origem, destino, codigo_rastreio, previsao_entrega, peso_kg, volumes, valor_mercadoria, valor_frete,
                                           observacao, criado_por_id)
                        VALUES (?, ?, ?, 'AGUARDANDO', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """, Long.class,
                u.empresaId(), sentido, "TMP" + System.nanoTime(), req.transportadoraId(),
                sentido.equals("ENTRADA") ? req.fornecedorId() : null, sentido.equals("SAIDA") ? req.clienteId() : null,
                limpar(req.numeroDocumento()), limpar(req.origem()), limpar(req.destino()), limpar(req.codigoRastreio()),
                Date.valueOf(req.previsaoEntrega()), req.pesoKg(), req.volumes(), req.valorMercadoria(), req.valorFrete(),
                limpar(req.observacao()), u.usuarioId());
        jdbc.update("UPDATE carga SET codigo = ? WHERE id = ?",
                (sentido.equals("ENTRADA") ? "ENT-" : "SAI-") + String.format("%06d", id), id);
        evento(u, id, "CRIADA", null, "Carga cadastrada", null);
        return montarDetalhe(u, id);
    }

    @Transactional
    public CargaDetalhe atualizar(Long id, CargaRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        Linha c = travar(u, id);
        if (!c.ativa()) {
            throw new IllegalArgumentException("Só é possível editar carga aguardando ou em trânsito");
        }
        validarTransportadora(u, req.transportadoraId());
        jdbc.update("""
                        UPDATE carga SET transportadora_id = ?, numero_documento = ?, origem = ?, destino = ?, codigo_rastreio = ?,
                                         previsao_entrega = ?, peso_kg = ?, volumes = ?, valor_mercadoria = ?, valor_frete = ?, observacao = ?
                         WHERE id = ? AND empresa_id = ?
                        """,
                req.transportadoraId(), limpar(req.numeroDocumento()), limpar(req.origem()), limpar(req.destino()),
                limpar(req.codigoRastreio()), Date.valueOf(req.previsaoEntrega()), req.pesoKg(), req.volumes(),
                req.valorMercadoria(), req.valorFrete(), limpar(req.observacao()), id, u.empresaId());
        if (!c.previsao().equals(req.previsaoEntrega())) {
            evento(u, id, "OBSERVACAO", null, "Previsão de entrega alterada de " + c.previsao() + " para " + req.previsaoEntrega(), null);
        }
        return montarDetalhe(u, id);
    }

    @Transactional
    public CargaDetalhe registrarEvento(Long id, EventoRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        String tipo = req.tipo().trim().toUpperCase(Locale.ROOT);
        if (!TIPOS_MANUAIS.contains(tipo)) {
            throw new IllegalArgumentException("Tipo de evento inválido: " + req.tipo());
        }
        Linha c = travar(u, id);
        if (c.status().equals("CANCELADA") || (c.status().equals("ENTREGUE") && !tipo.equals("OBSERVACAO"))) {
            throw new IllegalArgumentException("Carga já encerrada: só é possível registrar observações");
        }
        LocalDate data = req.data() == null ? hoje : req.data();
        String categoria = null;
        switch (tipo) {
            case "EMBARCADA" -> {
                if (!c.status().equals("AGUARDANDO")) {
                    throw new IllegalArgumentException("A carga já foi embarcada");
                }
                if (data.isAfter(hoje)) {
                    throw new IllegalArgumentException("A data do embarque não pode ser futura");
                }
                jdbc.update("UPDATE carga SET status = 'EM_TRANSITO', data_embarque = ? WHERE id = ? AND empresa_id = ?",
                        Date.valueOf(data), id, u.empresaId());
            }
            case "ENTREGUE" -> {
                if (data.isAfter(hoje)) {
                    throw new IllegalArgumentException("A data da entrega não pode ser futura");
                }
                if (c.embarque() != null && data.isBefore(c.embarque())) {
                    throw new IllegalArgumentException("A entrega não pode ser anterior ao embarque (" + c.embarque() + ")");
                }
                jdbc.update("""
                        UPDATE carga SET status = 'ENTREGUE', data_entrega = ?, data_embarque = COALESCE(data_embarque, ?)
                         WHERE id = ? AND empresa_id = ?
                        """, Date.valueOf(data), Date.valueOf(data), id, u.empresaId());
                jdbc.update("UPDATE carga_evento SET resolvida = TRUE, resolvida_em = now() WHERE carga_id = ? AND tipo = 'OCORRENCIA' AND NOT resolvida", id);
            }
            case "OCORRENCIA" -> {
                categoria = req.categoria() == null ? "" : req.categoria().trim().toUpperCase(Locale.ROOT);
                if (!CATEGORIAS.contains(categoria)) {
                    throw new IllegalArgumentException("Informe a categoria da ocorrência");
                }
            }
            default -> {
            }
        }
        evento(u, id, tipo, categoria, req.descricao().trim(), limpar(req.local()));
        return montarDetalhe(u, id);
    }

    @Transactional
    public CargaDetalhe resolverOcorrencia(Long id, Long eventoId) {
        UsuarioLogado u = UsuarioLogado.atual();
        travar(u, id);
        int n = jdbc.update("""
                UPDATE carga_evento SET resolvida = TRUE, resolvida_em = now()
                 WHERE id = ? AND carga_id = ? AND empresa_id = ? AND tipo = 'OCORRENCIA' AND NOT resolvida
                """, eventoId, id, u.empresaId());
        if (n == 0) {
            throw new NoSuchElementException("Ocorrência aberta não encontrada: " + eventoId);
        }
        return montarDetalhe(u, id);
    }

    @Transactional
    public CargaDetalhe cancelar(Long id, CancelamentoRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        Linha c = travar(u, id);
        if (!c.ativa()) {
            throw new IllegalArgumentException("Só é possível cancelar carga aguardando ou em trânsito");
        }
        jdbc.update("UPDATE carga SET status = 'CANCELADA' WHERE id = ? AND empresa_id = ?", id, u.empresaId());
        evento(u, id, "CANCELADA", null, req.motivo().trim(), null);
        return montarDetalhe(u, id);
    }

    // ------------------------------------------------------------------ internos

    private record Linha(String status, LocalDate previsao, LocalDate embarque) {
        boolean ativa() {
            return status.equals("AGUARDANDO") || status.equals("EM_TRANSITO");
        }
    }

    /** Trava a carga (FOR UPDATE) para que atualizações simultâneas não se atropelem. Gestor/admin apenas. */
    private Linha travar(UsuarioLogado u, Long id) {
        List<Linha> l = jdbc.query("SELECT status, previsao_entrega, data_embarque FROM carga WHERE id = ? AND empresa_id = ? FOR UPDATE",
                (rs, i) -> new Linha(rs.getString("status"), rs.getDate("previsao_entrega").toLocalDate(),
                        rs.getDate("data_embarque") == null ? null : rs.getDate("data_embarque").toLocalDate()),
                id, u.empresaId());
        if (l.isEmpty()) {
            throw new NoSuchElementException("Carga não encontrada: " + id);
        }
        return l.get(0);
    }

    private void evento(UsuarioLogado u, Long cargaId, String tipo, String categoria, String descricao, String local) {
        jdbc.update("""
                INSERT INTO carga_evento (empresa_id, carga_id, tipo, categoria, descricao, local, usuario_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, u.empresaId(), cargaId, tipo, categoria, descricao, local, u.usuarioId());
    }

    private CargaDetalhe montarDetalhe(UsuarioLogado u, Long id) {
        LocalDate hoje = LocalDate.now(FUSO);
        boolean oculta = u.restritoAoVendedor();
        List<CargaResumo> r = named.query(SELECT_CARGA + ESCOPO + " AND c.id = :id", escopo(u).addValue("id", id),
                (rs, i) -> mapear(rs, hoje, oculta));
        if (r.isEmpty()) {
            throw new NoSuchElementException("Carga não encontrada: " + id);
        }
        List<EventoItem> eventos = jdbc.query("""
                        SELECT e.id, e.tipo, e.categoria, e.descricao, e.local, e.ocorrido_em, e.resolvida, e.resolvida_em, us.nome AS usuario_nome
                          FROM carga_evento e JOIN usuario us ON us.id = e.usuario_id
                         WHERE e.carga_id = ? AND e.empresa_id = ?
                         ORDER BY e.ocorrido_em DESC, e.id DESC
                        """,
                (rs, i) -> new EventoItem(rs.getLong("id"), rs.getString("tipo"), rs.getString("categoria"), rs.getString("descricao"),
                        rs.getString("local"), instante(rs.getTimestamp("ocorrido_em")), rs.getBoolean("resolvida"),
                        instante(rs.getTimestamp("resolvida_em")), rs.getString("usuario_nome")),
                id, u.empresaId());
        return new CargaDetalhe(r.get(0), eventos);
    }

    private static CargaResumo mapear(ResultSet rs, LocalDate hoje, boolean ocultaFrete) throws SQLException {
        String status = rs.getString("status");
        LocalDate previsao = rs.getDate("previsao_entrega").toLocalDate();
        Date entrega = rs.getDate("data_entrega");
        Date embarque = rs.getDate("data_embarque");
        boolean ativa = status.equals("AGUARDANDO") || status.equals("EM_TRANSITO");
        boolean atrasada = ativa && previsao.isBefore(hoje);
        String situacao = atrasada ? "ATRASADA" : status;
        int atraso = 0;
        Boolean noPrazo = null;
        if (atrasada) {
            atraso = (int) ChronoUnit.DAYS.between(previsao, hoje);
        } else if (status.equals("ENTREGUE") && entrega != null) {
            noPrazo = !entrega.toLocalDate().isAfter(previsao);
            atraso = noPrazo ? 0 : (int) ChronoUnit.DAYS.between(previsao, entrega.toLocalDate());
        }
        return new CargaResumo(rs.getLong("id"), rs.getString("sentido"), rs.getString("codigo"), status, situacao,
                (Long) rs.getObject("transportadora_id"), rs.getString("transportadora_nome"),
                rs.getLong("parceiro_id"), rs.getString("parceiro_nome"), rs.getString("numero_documento"),
                rs.getString("origem"), rs.getString("destino"), rs.getString("codigo_rastreio"),
                embarque == null ? null : embarque.toLocalDate(), previsao, entrega == null ? null : entrega.toLocalDate(),
                atraso, noPrazo, rs.getBigDecimal("peso_kg"), (Integer) rs.getObject("volumes"),
                rs.getBigDecimal("valor_mercadoria"), ocultaFrete ? null : rs.getBigDecimal("valor_frete"),
                rs.getString("observacao"), rs.getInt("ocorrencias_abertas"));
    }

    private static MapSqlParameterSource escopo(UsuarioLogado u) {
        return new MapSqlParameterSource("empresa", u.empresaId()).addValue("vend", u.vendedorIdEscopo());
    }

    private void validarTransportadora(UsuarioLogado u, Long transportadoraId) {
        if (transportadoraId == null) return;
        existe("SELECT COUNT(*) FROM transportadora WHERE id = ? AND empresa_id = ? AND ativo", transportadoraId, u.empresaId(),
                "Transportadora não encontrada ou inativa");
    }

    private void existe(String sql, Long id, Long empresaId, String mensagem) {
        Integer n = jdbc.queryForObject(sql, Integer.class, id, empresaId);
        if (n == null || n == 0) {
            throw new IllegalArgumentException(mensagem);
        }
    }

    private static String sentidoValido(String sentido) {
        String s = sentido == null ? "" : sentido.trim().toUpperCase(Locale.ROOT);
        if (!SENTIDOS.contains(s)) {
            throw new IllegalArgumentException("Sentido inválido (use ENTRADA ou SAIDA)");
        }
        return s;
    }

    private static BigDecimal pct(long parte, long total) {
        return total == 0 ? null
                : BigDecimal.valueOf(parte).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP);
    }

    private static OffsetDateTime instante(Timestamp ts) {
        return ts == null ? null : OffsetDateTime.ofInstant(ts.toInstant(), FUSO);
    }

    private static BigDecimal dinheiro(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }

    private static String limpar(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
