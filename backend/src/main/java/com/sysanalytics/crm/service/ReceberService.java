package com.sysanalytics.crm.service;

import com.sysanalytics.crm.security.UsuarioLogado;
import com.sysanalytics.crm.web.dto.PaginaResponse;
import com.sysanalytics.crm.web.dto.ReceberDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
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
 * Contas a receber e cobrança. Gestor/admin lançam títulos e baixas; o vendedor enxerga e cobra
 * apenas os títulos dos clientes da própria carteira (fora dela: 404).
 */
@Service
@RequiredArgsConstructor
public class ReceberService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo"); // mesmo fuso do application.yml
    private static final String ABERTO = "t.status IN ('ABERTO', 'PARCIAL')";
    private static final Set<String> FORMAS = Set.of("PIX", "BOLETO", "TRANSFERENCIA", "CARTAO", "DINHEIRO", "CHEQUE", "OUTRO");
    private static final Set<String> TIPOS = Set.of("LIGACAO", "WHATSAPP", "EMAIL", "VISITA", "OUTRO");
    private static final Set<String> RESULTADOS = Set.of("SEM_RETORNO", "PROMESSA", "CONTESTACAO", "PAGAMENTO_INFORMADO", "OUTRO");

    /** O primeiro parâmetro é a data de hoje (promessas ainda não vencidas). */
    private static final String SELECT_TITULO = """
            SELECT t.id, t.cliente_id, c.nome_fantasia AS cliente_nome, v.nome AS vendedor_nome,
                   t.numero_documento, t.parcela, t.total_parcelas, t.descricao, t.data_emissao,
                   t.data_vencimento, t.valor, t.valor_pago, t.status,
                   (SELECT MAX(a.criada_em) FROM cobranca_acao a WHERE a.titulo_id = t.id) AS ultima_cobranca_em,
                   (SELECT MIN(a.promessa_data) FROM cobranca_acao a
                     WHERE a.titulo_id = t.id AND a.resultado = 'PROMESSA' AND a.promessa_data >= ?) AS promessa_data
              FROM titulo_receber t
              JOIN cliente c ON c.id = t.cliente_id
              JOIN vendedor v ON v.id = c.vendedor_id
            """;

    private final JdbcTemplate jdbc;
    private final ClienteAcesso clienteAcesso;

    // ------------------------------------------------------------------ consultas

    @Transactional(readOnly = true)
    public PaginaResponse<TituloResumo> listar(String situacao, Long clienteId, String busca,
                                               LocalDate vencimentoDe, LocalDate vencimentoAte, int pagina, int tamanho) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        int tam = Math.min(Math.max(tamanho, 1), 100);
        int pag = Math.max(pagina, 0);

        StringBuilder where = new StringBuilder(" WHERE t.empresa_id = ?");
        List<Object> args = new ArrayList<>();
        args.add(u.empresaId());
        Long escopo = u.vendedorIdEscopo();
        if (escopo != null) {
            where.append(" AND c.vendedor_id = ?");
            args.add(escopo);
        }
        if (clienteId != null) {
            where.append(" AND t.cliente_id = ?");
            args.add(clienteId);
        }
        if (busca != null && !busca.isBlank()) {
            where.append(" AND (LOWER(c.nome_fantasia) LIKE ? OR LOWER(t.numero_documento) LIKE ?)");
            String termo = "%" + busca.trim().toLowerCase(Locale.ROOT) + "%";
            args.add(termo);
            args.add(termo);
        }
        if (vencimentoDe != null) {
            where.append(" AND t.data_vencimento >= ?");
            args.add(Date.valueOf(vencimentoDe));
        }
        if (vencimentoAte != null) {
            where.append(" AND t.data_vencimento <= ?");
            args.add(Date.valueOf(vencimentoAte));
        }
        String sit = situacao == null || situacao.isBlank() ? "TODOS" : situacao.trim().toUpperCase(Locale.ROOT);
        switch (sit) {
            case "TODOS" -> {
            }
            case "EM_ABERTO" -> where.append(" AND ").append(ABERTO);
            case "A_VENCER" -> {
                where.append(" AND ").append(ABERTO).append(" AND t.data_vencimento >= ?");
                args.add(Date.valueOf(hoje));
            }
            case "VENCIDO" -> {
                where.append(" AND ").append(ABERTO).append(" AND t.data_vencimento < ?");
                args.add(Date.valueOf(hoje));
            }
            case "PAGO" -> where.append(" AND t.status = 'PAGO'");
            case "CANCELADO" -> where.append(" AND t.status = 'CANCELADO'");
            default -> throw new IllegalArgumentException("Situação inválida: " + situacao);
        }

        String from = " FROM titulo_receber t JOIN cliente c ON c.id = t.cliente_id";
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + from + where, Long.class, args.toArray());

        String ordem = sit.equals("PAGO") ? " ORDER BY t.data_vencimento DESC, t.id DESC"
                : " ORDER BY t.data_vencimento ASC, t.id ASC";
        List<Object> todos = new ArrayList<>();
        todos.add(Date.valueOf(hoje));
        todos.addAll(args);
        todos.add(tam);
        todos.add((long) pag * tam);
        List<TituloResumo> itens = jdbc.query(SELECT_TITULO + where + ordem + " LIMIT ? OFFSET ?",
                (rs, i) -> mapear(rs, hoje), todos.toArray());

        long totalElementos = total == null ? 0 : total;
        int totalPaginas = (int) Math.ceil(totalElementos / (double) tam);
        return new PaginaResponse<>(itens, pag, tam, totalElementos, totalPaginas);
    }

    @Transactional(readOnly = true)
    public TituloDetalhe detalhe(Long id) {
        UsuarioLogado u = UsuarioLogado.atual();
        return montarDetalhe(u, id, LocalDate.now(FUSO));
    }

    @Transactional(readOnly = true)
    public ResumoReceber resumo() {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        Long escopo = u.vendedorIdEscopo();
        String filtro = " WHERE t.empresa_id = ?" + (escopo != null ? " AND c.vendedor_id = ?" : "");
        String base = " FROM titulo_receber t JOIN cliente c ON c.id = t.cliente_id";

        List<Object> argsBase = new ArrayList<>();
        argsBase.add(u.empresaId());
        if (escopo != null) argsBase.add(escopo);

        // Totais e aging em uma única passada
        int[][] faixas = {{1, 30}, {31, 60}, {61, 90}, {91, 100000}};
        StringBuilder cols = new StringBuilder();
        String saldo = "(t.valor - t.valor_pago)";
        String vencido = ABERTO + " AND t.data_vencimento < p.hoje";
        cols.append("COALESCE(SUM(CASE WHEN ").append(ABERTO).append(" THEN ").append(saldo).append(" END), 0) AS total_aberto, ");
        cols.append("COALESCE(SUM(CASE WHEN ").append(ABERTO).append(" AND t.data_vencimento >= p.hoje THEN ").append(saldo).append(" END), 0) AS a_vencer, ");
        cols.append("COALESCE(SUM(CASE WHEN ").append(ABERTO).append(" AND t.data_vencimento >= p.hoje AND t.data_vencimento <= p.hoje + 7 THEN ").append(saldo).append(" END), 0) AS vence7, ");
        cols.append("COALESCE(SUM(CASE WHEN ").append(vencido).append(" THEN ").append(saldo).append(" END), 0) AS vencido, ");
        cols.append("COUNT(CASE WHEN ").append(ABERTO).append(" THEN 1 END) AS qtd_abertos, ");
        cols.append("COUNT(CASE WHEN ").append(vencido).append(" THEN 1 END) AS qtd_vencidos");
        for (int i = 0; i < faixas.length; i++) {
            String cond = vencido + " AND p.hoje - t.data_vencimento BETWEEN " + faixas[i][0] + " AND " + faixas[i][1];
            cols.append(", COALESCE(SUM(CASE WHEN ").append(cond).append(" THEN ").append(saldo).append(" END), 0) AS ag").append(i).append("_valor");
            cols.append(", COUNT(CASE WHEN ").append(cond).append(" THEN 1 END) AS ag").append(i).append("_qtd");
        }
        String sqlTotais = "WITH p AS (SELECT CAST(? AS date) AS hoje) SELECT " + cols + base + " CROSS JOIN p" + filtro;
        List<Object> argsTotais = new ArrayList<>();
        argsTotais.add(Date.valueOf(hoje));
        argsTotais.addAll(argsBase);

        String[] rotulos = {"1 a 30 dias", "31 a 60 dias", "61 a 90 dias", "Mais de 90 dias"};
        record Totais(BigDecimal totalAberto, BigDecimal aVencer, BigDecimal vence7, BigDecimal vencido,
                      long qtdAbertos, long qtdVencidos, List<FaixaAging> aging) {
        }
        Totais t = jdbc.queryForObject(sqlTotais, (rs, i) -> {
            List<FaixaAging> aging = new ArrayList<>();
            for (int k = 0; k < rotulos.length; k++) {
                aging.add(new FaixaAging(rotulos[k], dinheiro(rs.getBigDecimal("ag" + k + "_valor")), rs.getLong("ag" + k + "_qtd")));
            }
            return new Totais(dinheiro(rs.getBigDecimal("total_aberto")), dinheiro(rs.getBigDecimal("a_vencer")),
                    dinheiro(rs.getBigDecimal("vence7")), dinheiro(rs.getBigDecimal("vencido")),
                    rs.getLong("qtd_abertos"), rs.getLong("qtd_vencidos"), aging);
        }, argsTotais.toArray());

        // Recebido no mês corrente (baixas lançadas no mês)
        List<Object> argsMes = new ArrayList<>(argsBase);
        argsMes.add(Date.valueOf(hoje.withDayOfMonth(1)));
        argsMes.add(Date.valueOf(hoje.withDayOfMonth(hoje.lengthOfMonth())));
        BigDecimal recebido = jdbc.queryForObject(
                "SELECT COALESCE(SUM(b.valor), 0) FROM baixa_receber b JOIN titulo_receber t ON t.id = b.titulo_id"
                        + " JOIN cliente c ON c.id = t.cliente_id" + filtro.replace("t.empresa_id", "b.empresa_id")
                        + " AND b.data_baixa BETWEEN ? AND ?",
                BigDecimal.class, argsMes.toArray());

        // Prazo médio de recebimento (títulos quitados nos últimos 90 dias)
        List<Object> argsPrazo = new ArrayList<>(argsBase);
        argsPrazo.add(Date.valueOf(hoje.minusDays(90)));
        BigDecimal prazo = jdbc.queryForObject(
                "SELECT AVG(t.data_quitacao - t.data_emissao)" + base + filtro
                        + " AND t.status = 'PAGO' AND t.data_quitacao >= ?",
                BigDecimal.class, argsPrazo.toArray());

        // Maiores devedores (valor vencido)
        List<Object> argsDev = new ArrayList<>();
        argsDev.add(Date.valueOf(hoje));
        argsDev.addAll(argsBase);
        argsDev.add(Date.valueOf(hoje));
        List<Devedor> devedores = jdbc.query(
                "SELECT c.id, c.nome_fantasia, SUM(t.valor - t.valor_pago) AS vencido, COUNT(*) AS qtd,"
                        + " MAX(CAST(? AS date) - t.data_vencimento) AS maior_atraso" + base + filtro
                        + " AND " + ABERTO + " AND t.data_vencimento < ?"
                        + " GROUP BY c.id, c.nome_fantasia ORDER BY vencido DESC LIMIT 5",
                (rs, i) -> new Devedor(rs.getLong("id"), rs.getString("nome_fantasia"), dinheiro(rs.getBigDecimal("vencido")),
                        rs.getLong("qtd"), rs.getInt("maior_atraso")),
                argsDev.toArray());

        // Promessas de pagamento em títulos ainda abertos
        List<Object> argsProm = new ArrayList<>();
        argsProm.add(Date.valueOf(hoje));
        argsProm.add(Date.valueOf(hoje));
        argsProm.addAll(argsBase);
        long[] promessas = jdbc.queryForObject(
                "SELECT COUNT(DISTINCT CASE WHEN a.promessa_data >= ? THEN t.id END) AS pendentes,"
                        + " COUNT(DISTINCT CASE WHEN a.promessa_data < ? THEN t.id END) AS quebradas"
                        + " FROM cobranca_acao a JOIN titulo_receber t ON t.id = a.titulo_id JOIN cliente c ON c.id = t.cliente_id"
                        + filtro.replace("t.empresa_id", "a.empresa_id")
                        + " AND a.resultado = 'PROMESSA' AND " + ABERTO,
                (rs, i) -> new long[]{rs.getLong("pendentes"), rs.getLong("quebradas")}, argsProm.toArray());

        BigDecimal inadimplencia = t.totalAberto().signum() > 0
                ? t.vencido().multiply(BigDecimal.valueOf(100)).divide(t.totalAberto(), 1, RoundingMode.HALF_UP)
                : null;
        return new ResumoReceber(t.totalAberto(), t.aVencer(), t.vence7(), t.vencido(), t.qtdAbertos(), t.qtdVencidos(),
                dinheiro(recebido), inadimplencia, prazo == null ? null : prazo.setScale(1, RoundingMode.HALF_UP),
                t.aging(), devedores, promessas[0], promessas[1]);
    }

    // ------------------------------------------------------------------ lançamentos (gestor/admin)

    @Transactional
    public List<TituloResumo> criar(TituloRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        clienteAcesso.exigir(u, req.clienteId());
        String documento = req.numeroDocumento().trim();
        int parcelas = req.parcelas() == null ? 1 : req.parcelas();
        int intervalo = req.intervaloDias() == null ? 30 : req.intervaloDias();
        if (req.primeiroVencimento().isBefore(req.dataEmissao())) {
            throw new IllegalArgumentException("O vencimento não pode ser anterior à emissão");
        }
        Integer existentes = jdbc.queryForObject(
                "SELECT COUNT(*) FROM titulo_receber WHERE empresa_id = ? AND numero_documento = ?",
                Integer.class, u.empresaId(), documento);
        if (existentes != null && existentes > 0) {
            throw new IllegalArgumentException("Já existe título com o documento " + documento);
        }

        BigDecimal base = req.valorTotal().divide(BigDecimal.valueOf(parcelas), 2, RoundingMode.DOWN);
        BigDecimal acumulado = BigDecimal.ZERO;
        for (int i = 1; i <= parcelas; i++) {
            // a última parcela absorve os centavos da divisão
            BigDecimal valor = i == parcelas ? req.valorTotal().subtract(acumulado) : base;
            acumulado = acumulado.add(valor);
            jdbc.update("""
                            INSERT INTO titulo_receber (empresa_id, cliente_id, numero_documento, parcela, total_parcelas, descricao,
                                                        data_emissao, data_vencimento, valor, valor_pago, status, criado_por_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ABERTO', ?)
                            """,
                    u.empresaId(), req.clienteId(), documento, i, parcelas, limpar(req.descricao()),
                    Date.valueOf(req.dataEmissao()), Date.valueOf(req.primeiroVencimento().plusDays((long) intervalo * (i - 1))),
                    valor, u.usuarioId());
        }
        return jdbc.query(SELECT_TITULO + " WHERE t.empresa_id = ? AND t.numero_documento = ? ORDER BY t.parcela",
                (rs, i) -> mapear(rs, hoje), Date.valueOf(hoje), u.empresaId(), documento);
    }

    @Transactional
    public TituloDetalhe baixar(Long id, BaixaRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        Linha t = travar(u, id);
        if (!t.aberto()) {
            throw new IllegalArgumentException("Este título já está quitado ou cancelado");
        }
        String forma = req.formaPagamento().trim().toUpperCase(Locale.ROOT);
        if (!FORMAS.contains(forma)) {
            throw new IllegalArgumentException("Forma de pagamento inválida: " + req.formaPagamento());
        }
        if (req.dataBaixa().isAfter(hoje)) {
            throw new IllegalArgumentException("A data da baixa não pode ser futura");
        }
        BigDecimal saldo = t.valor().subtract(t.pago());
        if (req.valor().compareTo(saldo) > 0) {
            throw new IllegalArgumentException("O valor da baixa excede o saldo do título (R$ " + saldo.toPlainString() + ")");
        }
        jdbc.update("""
                        INSERT INTO baixa_receber (empresa_id, titulo_id, data_baixa, valor, forma_pagamento, observacao, usuario_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                u.empresaId(), id, Date.valueOf(req.dataBaixa()), req.valor(), forma, limpar(req.observacao()), u.usuarioId());
        recalcular(id);
        return montarDetalhe(u, id, hoje);
    }

    @Transactional
    public TituloDetalhe estornar(Long id, Long baixaId) {
        UsuarioLogado u = UsuarioLogado.atual();
        travar(u, id);
        int apagadas = jdbc.update("DELETE FROM baixa_receber WHERE id = ? AND titulo_id = ? AND empresa_id = ?",
                baixaId, id, u.empresaId());
        if (apagadas == 0) {
            throw new NoSuchElementException("Baixa não encontrada: " + baixaId);
        }
        recalcular(id);
        return montarDetalhe(u, id, LocalDate.now(FUSO));
    }

    @Transactional
    public TituloDetalhe cancelar(Long id) {
        UsuarioLogado u = UsuarioLogado.atual();
        Linha t = travar(u, id);
        if (!t.status().equals("ABERTO") || t.pago().signum() > 0) {
            throw new IllegalArgumentException("Só é possível cancelar título em aberto e sem baixas (estorne as baixas antes)");
        }
        jdbc.update("UPDATE titulo_receber SET status = 'CANCELADO' WHERE id = ? AND empresa_id = ?", id, u.empresaId());
        return montarDetalhe(u, id, LocalDate.now(FUSO));
    }

    // ------------------------------------------------------------------ cobrança (também vendedor, na carteira)

    @Transactional
    public TituloDetalhe registrarCobranca(Long id, CobrancaRequest req) {
        UsuarioLogado u = UsuarioLogado.atual();
        LocalDate hoje = LocalDate.now(FUSO);
        TituloResumo titulo = obterResumo(u, id, hoje); // 404 fora da carteira
        if (!titulo.status().equals("ABERTO") && !titulo.status().equals("PARCIAL")) {
            throw new IllegalArgumentException("A cobrança só se aplica a títulos em aberto");
        }
        String tipo = req.tipo().trim().toUpperCase(Locale.ROOT);
        String resultado = req.resultado().trim().toUpperCase(Locale.ROOT);
        if (!TIPOS.contains(tipo)) throw new IllegalArgumentException("Tipo de contato inválido: " + req.tipo());
        if (!RESULTADOS.contains(resultado)) throw new IllegalArgumentException("Resultado inválido: " + req.resultado());

        LocalDate promessaData = null;
        BigDecimal promessaValor = null;
        if (resultado.equals("PROMESSA")) {
            promessaData = req.promessaData();
            if (promessaData == null) throw new IllegalArgumentException("Informe a data prometida para o pagamento");
            if (promessaData.isBefore(hoje)) throw new IllegalArgumentException("A data prometida não pode estar no passado");
            if (promessaData.isAfter(hoje.plusDays(90))) throw new IllegalArgumentException("A data prometida deve estar nos próximos 90 dias");
            promessaValor = req.promessaValor();
            if (promessaValor != null && promessaValor.compareTo(titulo.saldo()) > 0) {
                throw new IllegalArgumentException("O valor prometido excede o saldo do título");
            }
        }
        jdbc.update("""
                        INSERT INTO cobranca_acao (empresa_id, titulo_id, cliente_id, tipo, resultado, resumo, promessa_data, promessa_valor, usuario_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                u.empresaId(), id, titulo.clienteId(), tipo, resultado, req.resumo().trim(),
                promessaData == null ? null : Date.valueOf(promessaData), promessaValor, u.usuarioId());
        return montarDetalhe(u, id, hoje);
    }

    // ------------------------------------------------------------------ internos

    private record Linha(BigDecimal valor, BigDecimal pago, String status) {
        boolean aberto() {
            return status.equals("ABERTO") || status.equals("PARCIAL");
        }
    }

    /** Trava o título (FOR UPDATE) para que baixas simultâneas não ultrapassem o saldo. */
    private Linha travar(UsuarioLogado u, Long id) {
        List<Linha> linhas = jdbc.query(
                "SELECT valor, valor_pago, status FROM titulo_receber WHERE id = ? AND empresa_id = ? FOR UPDATE",
                (rs, i) -> new Linha(rs.getBigDecimal("valor"), rs.getBigDecimal("valor_pago"), rs.getString("status")),
                id, u.empresaId());
        if (linhas.isEmpty()) {
            throw new NoSuchElementException("Título não encontrado: " + id);
        }
        return linhas.get(0);
    }

    /** Recalcula valor pago, status e data de quitação a partir das baixas. */
    private void recalcular(Long id) {
        jdbc.update("""
                UPDATE titulo_receber t
                   SET valor_pago = s.soma,
                       status = CASE WHEN s.soma >= t.valor THEN 'PAGO' WHEN s.soma > 0 THEN 'PARCIAL' ELSE 'ABERTO' END,
                       data_quitacao = CASE WHEN s.soma >= t.valor THEN s.ultima ELSE NULL END
                  FROM (SELECT COALESCE(SUM(valor), 0) AS soma, MAX(data_baixa) AS ultima
                          FROM baixa_receber WHERE titulo_id = ?) s
                 WHERE t.id = ? AND t.status <> 'CANCELADO'
                """, id, id);
    }

    private TituloResumo obterResumo(UsuarioLogado u, Long id, LocalDate hoje) {
        StringBuilder sql = new StringBuilder(SELECT_TITULO).append(" WHERE t.id = ? AND t.empresa_id = ?");
        List<Object> args = new ArrayList<>();
        args.add(Date.valueOf(hoje));
        args.add(id);
        args.add(u.empresaId());
        Long escopo = u.vendedorIdEscopo();
        if (escopo != null) {
            sql.append(" AND c.vendedor_id = ?");
            args.add(escopo);
        }
        List<TituloResumo> r = jdbc.query(sql.toString(), (rs, i) -> mapear(rs, hoje), args.toArray());
        if (r.isEmpty()) {
            throw new NoSuchElementException("Título não encontrado: " + id);
        }
        return r.get(0);
    }

    private TituloDetalhe montarDetalhe(UsuarioLogado u, Long id, LocalDate hoje) {
        TituloResumo titulo = obterResumo(u, id, hoje);
        List<BaixaItem> baixas = jdbc.query("""
                        SELECT b.id, b.data_baixa, b.valor, b.forma_pagamento, b.observacao, us.nome AS usuario_nome, b.criada_em
                          FROM baixa_receber b JOIN usuario us ON us.id = b.usuario_id
                         WHERE b.titulo_id = ? AND b.empresa_id = ?
                         ORDER BY b.data_baixa DESC, b.id DESC
                        """,
                (rs, i) -> new BaixaItem(rs.getLong("id"), rs.getDate("data_baixa").toLocalDate(), rs.getBigDecimal("valor"),
                        rs.getString("forma_pagamento"), rs.getString("observacao"), rs.getString("usuario_nome"),
                        instante(rs.getTimestamp("criada_em"))),
                id, u.empresaId());
        List<CobrancaItem> cobrancas = jdbc.query("""
                        SELECT a.id, a.tipo, a.resultado, a.resumo, a.promessa_data, a.promessa_valor, us.nome AS usuario_nome, a.criada_em,
                               CASE WHEN a.resultado <> 'PROMESSA' THEN NULL
                                    WHEN t.status = 'PAGO' THEN 'CUMPRIDA'
                                    WHEN a.promessa_data < ? THEN 'QUEBRADA'
                                    ELSE 'PENDENTE' END AS promessa_status
                          FROM cobranca_acao a
                          JOIN titulo_receber t ON t.id = a.titulo_id
                          JOIN usuario us ON us.id = a.usuario_id
                         WHERE a.titulo_id = ? AND a.empresa_id = ?
                         ORDER BY a.criada_em DESC, a.id DESC
                        """,
                (rs, i) -> {
                    Date prometida = rs.getDate("promessa_data");
                    return new CobrancaItem(rs.getLong("id"), rs.getString("tipo"), rs.getString("resultado"), rs.getString("resumo"),
                            prometida == null ? null : prometida.toLocalDate(), rs.getBigDecimal("promessa_valor"),
                            rs.getString("promessa_status"), rs.getString("usuario_nome"), instante(rs.getTimestamp("criada_em")));
                },
                Date.valueOf(hoje), id, u.empresaId());
        return new TituloDetalhe(titulo, baixas, cobrancas);
    }

    private static TituloResumo mapear(ResultSet rs, LocalDate hoje) throws SQLException {
        BigDecimal valor = rs.getBigDecimal("valor");
        BigDecimal pago = rs.getBigDecimal("valor_pago");
        String status = rs.getString("status");
        LocalDate vencimento = rs.getDate("data_vencimento").toLocalDate();
        boolean aberto = status.equals("ABERTO") || status.equals("PARCIAL");
        boolean vencido = aberto && vencimento.isBefore(hoje);
        String situacao = aberto ? (vencido ? "VENCIDO" : "A_VENCER") : status;
        int atraso = vencido ? (int) ChronoUnit.DAYS.between(vencimento, hoje) : 0;
        Date prometida = rs.getDate("promessa_data");
        return new TituloResumo(rs.getLong("id"), rs.getLong("cliente_id"), rs.getString("cliente_nome"), rs.getString("vendedor_nome"),
                rs.getString("numero_documento"), rs.getInt("parcela"), rs.getInt("total_parcelas"), rs.getString("descricao"),
                rs.getDate("data_emissao").toLocalDate(), vencimento, valor, pago, valor.subtract(pago), status, situacao, atraso,
                instante(rs.getTimestamp("ultima_cobranca_em")), prometida == null ? null : prometida.toLocalDate());
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
